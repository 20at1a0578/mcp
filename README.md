# Swiggy AI Food Assistant

A full-stack, read-only food discovery chatbot built with **React**, **Express**, **OpenRouter**, and the **Swiggy Model Context Protocol (MCP)** server. Ask for dishes, compare menu prices, and explore meal options within a budget.

> **Disclaimer:** Independent learning/demo project; not an official Swiggy application. Menu prices and availability may change. This app does not place orders, add items to carts, or process payments.

## Features

- Conversational food discovery and menu searches
- Swiggy MCP `search_menu` integration for restaurant and menu data
- AI-assisted recommendations based on preferences, party size, and budget
- Bengaluru, Chennai, Hyderabad, or custom latitude/longitude selection
- Vegetarian-only searches when requested
- Markdown-formatted answers with food images when available
- Chat history during the current browser session
- Read-only operation: no checkout or payments

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Markdown, CSS |
| Backend | Node.js, Express 5, CORS |
| AI | OpenRouter API, configured for `openai/gpt-4o-mini` |
| Food data | Swiggy MCP (`search_menu`) |
| Authentication | Swiggy OAuth via MCP SDK |

## How it works

```text
User → React (App.jsx)
     → POST /api/chat (Express)
     → processFoodRequest() (aiService.js)
     → OpenRouter AI requests search_food_menu
     → Backend calls Swiggy MCP search_menu
     → Menu results returned to AI
     → AI formats recommendations
     → React Markdown displays the reply
```

The AI requests searches through function calling; the backend executes the MCP tool. The AI does not directly access the Swiggy server.

## Project structure

```text
mcp/
├── backend/
│   ├── server.js
│   ├── services/
│   │   ├── aiService.js
│   │   └── swiggyMcpClient.js
│   ├── config/
│   ├── providers/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   └── package.json
└── README.md
```

## Run locally

**Prerequisites:** Node.js and npm, an OpenRouter API key, and the ability to complete Swiggy OAuth authorization.

1. Clone the repository:

   ```bash
   git clone https://github.com/20at1a0578/mcp.git
   cd mcp
   ```

2. Configure the backend:

   ```bash
   cd backend
   npm install
   ```

   Create `backend/.env` with:

   ```dotenv
   OPENROUTER_API_KEY=your_openrouter_api_key
   OPENROUTER_MODEL=openai/gpt-4o-mini
   PORT=5000
   ```

   Never commit `.env` or share API keys.

3. Start the backend:

   ```bash
   node server.js
   ```

4. In a **second terminal**, start the frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. Open **http://localhost:5173**. Select a delivery location and try:

   - `Find 3 chicken biryanis under ₹400 with prices and images`
   - `Show vegetarian paneer tikka options`
   - `Suggest a varied non-veg dinner for 8 people within ₹10,000`

Swiggy authorization may open a browser during the first MCP search. The current OAuth callback uses `http://127.0.0.1:8765/callback`.

## API

### `GET /api/status`
Returns backend status information. **Note:** The current status endpoint still reports legacy Ollama metadata, even though the active AI service uses OpenRouter.

### `POST /api/chat`

Request:

```json
{
  "message": "Find chicken biryani under ₹400",
  "conversation": [],
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946
  }
}
```

Response shape:

```json
{
  "reply": "Assistant's formatted recommendation...",
  "mode": "openrouter",
  "recommendations": []
}
```

The `reply` field contains Markdown. Menu prices may not include taxes, delivery charges, or other fees.

## Current limitations

- Runs locally; no cloud deployment is configured.
- The frontend uses a fixed local backend URL (`http://localhost:5000`).
- Conversation history is stored in React state and is reset on refresh.
- The current backend returns recommendations as Markdown text rather than structured product cards.
- Search quality depends on MCP results and the model's interpretation.
- OAuth tokens are currently kept in memory for a connection; authentication may be required again.

## Security

Keep OpenRouter keys, `.env` files, and OAuth credentials out of Git. Check staged files before each push.

## Author

Built by [Mahesh Reddy](https://github.com/20at1a0578).
