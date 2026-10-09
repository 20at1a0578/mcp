
require('dotenv').config();

const OpenAI = require('openai');
const { connectSwiggyMcp } = require('./swiggyMcpClient');

const MODEL = process.env.OPENROUTER_MODEL;
const ai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  timeout: 45000,
  maxRetries: 1
});

const SEARCH_TOOL = {
  type: 'function',
  function: {
    name: 'search_food_menu',
    description: 'Search real Swiggy food menus and prices. Read-only.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Food name, e.g. chicken biryani'
        },
        vegOnly: {
          type: 'boolean',
          description: 'True only when strictly vegetarian'
        },
        count: {
          type: 'integer',
          minimum: 1,
          maximum: 20
        }
      },
      required: ['query']
    }
  }
};

function parseMcpResult(result) {
  if (result.structuredContent) {
    return result.structuredContent;
  }

  const texts = (result.content || [])
    .filter(part => part.type === 'text')
    .map(part => part.text);

  const parsed = texts.map(text => {
    try {
      return JSON.parse(text);
    } catch {
      return { text };
    }
  });

  return parsed.length === 1 ? parsed[0] : parsed;
}

async function searchMenu(args, location) {
  const { client, transport } = await connectSwiggyMcp();

  try {
    const latitude = Number(location?.latitude);
    const longitude = Number(location?.longitude);

    if (!Number.isFinite(latitude) ||
        !Number.isFinite(longitude)) {
      throw new Error('Select a valid delivery location first.');
    }

    const wanted = Math.min(
      Math.max(Number(args.count) || 10, 1),
      20
    );

    const collected = [];
    let offset = 0;

    for (let page = 0; page < 2; page++) {
      const parameters = {
        latitude,
        longitude,
        query: String(args.query || '').trim(),
        offset
      };

      if (!parameters.query) {
        throw new Error('Food search query is required.');
      }

      if (args.vegOnly === true) {
        parameters.vegFilter = 1;
      }

      console.log('[MCP] Searching:', parameters.query);

      const result = await client.callTool({
        name: 'search_menu',
        arguments: parameters
      });

      if (result.isError) {
        throw new Error(JSON.stringify(parseMcpResult(result)));
      }

      const data = parseMcpResult(result);

      collected.push(data);

      if (!data?.hasMore ||
          data?.nextOffset == null ||
          collected.length >= 2 ||
          wanted <= 10) {
        break;
      }

      offset = data.nextOffset;
    }

    return collected.length === 1
      ? collected[0]
      : collected;
  } finally {
    await transport?.close?.().catch(() => {});
  }
}

async function processFoodRequest(
  message,
  conversation = [],
  location = {}
) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is missing in backend/.env');
  }

  if (!MODEL) {
    throw new Error('OPENROUTER_MODEL is missing in backend/.env');
  }

  const messages = [
    {
      role: 'system',
      content: `You are a helpful Swiggy food recommendation assistant.
Use search_food_menu for restaurant food searches and prices.
Never invent restaurant names, menu items or prices.
Only claim prices are live when they came from the tool.
Respect budget, number of people and food preferences.
If a budget is given, calculate totals from retrieved prices.
Menu prices may exclude taxes and delivery fees.
Keep answers concise and useful.
Never place orders, add to cart or initiate payments.`
    },
    ...conversation.slice(-8)
      .filter(m =>
        ['user', 'assistant'].includes(m.role) &&
        typeof m.content === 'string'
      )
      .map(m => ({
        role: m.role,
        content: m.content
      })),
    {
      role: 'user',
      content: String(message)
    }
  ];

  let searched = false;

  for (let round = 0; round < 3; round++) {
    console.log('[AI] OpenRouter request:', MODEL);

    const response = await ai.chat.completions.create({
      model: MODEL,
      messages,
      tools: [SEARCH_TOOL],
      tool_choice: 'auto',
      temperature: 0.2,
      max_tokens: 600
    });

    const answer = response.choices?.[0]?.message;

    if (!answer) {
      throw new Error('OpenRouter returned no assistant message.');
    }

    if (!answer.tool_calls?.length) {
      if (searched && !answer.content) {
        return {
          reply: 'Search completed, but the AI returned no summary.',
          mode: 'openrouter',
          recommendations: []
        };
      }

      return {
        reply: answer.content || 'Please try again.',
        mode: 'openrouter',
        recommendations: []
      };
    }

    messages.push({
      role: 'assistant',
      content: answer.content || null,
      tool_calls: answer.tool_calls
    });

    for (const call of answer.tool_calls) {
      let toolResult;

      try {
        if (call.function.name !== 'search_food_menu') {
          throw new Error('Unsupported tool.');
        }

        const args = JSON.parse(call.function.arguments || '{}');
        toolResult = await searchMenu(args, location);
        searched = true;
      } catch (error) {
        console.error('[TOOL]', error.message);
        toolResult = { error: error.message };
      }

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(toolResult).slice(0, 16000)
      });
    }
  }

  return {
    reply: 'The search took too many steps. Try a more specific food request.',
    mode: 'openrouter',
    recommendations: []
  };
}

module.exports = { processFoodRequest };
