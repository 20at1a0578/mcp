
const http = require('http')
const open = require('open')

const {
  Client
} = require('@modelcontextprotocol/sdk/client/index.js')

const {
  StreamableHTTPClientTransport
} = require('@modelcontextprotocol/sdk/client/streamableHttp.js')

const MCP_URL = new URL('https://mcp.swiggy.com/food')
const CALLBACK_URL = 'http://127.0.0.1:8765/callback'

class SwiggyOAuthProvider {
  constructor() {
    this.savedClientInfo = undefined
    this.savedTokens = undefined
    this.savedVerifier = undefined
  }

  get redirectUrl() {
    return CALLBACK_URL
  }

  get clientMetadata() {
    return {
      redirect_uris: [CALLBACK_URL],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_name: 'Swiggy AI Assistant'
    }
  }

  clientInformation() {
    return this.savedClientInfo
  }

  saveClientInformation(info) {
    this.savedClientInfo = info
  }

  tokens() {
    return this.savedTokens
  }

  saveTokens(tokens) {
    this.savedTokens = tokens
  }

  redirectToAuthorization(url) {
    console.log('\nOpening Swiggy authorization page...')
    console.log('If the browser does not open, visit:')
    console.log(url.toString())

    return open(url.toString())
  }

  saveCodeVerifier(verifier) {
    this.savedVerifier = verifier
  }

  codeVerifier() {
    return this.savedVerifier
  }
}

function startCallbackServer() {
  let resolveCode
  let rejectCode

  const codePromise = new Promise((resolve, reject) => {
    resolveCode = resolve
    rejectCode = reject
  })

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, CALLBACK_URL)

    if (url.pathname !== '/callback') {
      res.writeHead(404)
      res.end('Not found')
      return
    }

    const error = url.searchParams.get('error')
    const code = url.searchParams.get('code')

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/plain' })
      res.end('Swiggy authorization was denied.')
      rejectCode(new Error(error))
      return
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/plain' })
      res.end('Authorization code missing.')
      rejectCode(new Error('Authorization code missing'))
      return
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Swiggy authorization received. Return to VS Code.')

    resolveCode(code)
  })

  return {
    server,
    codePromise,
    listen() {
      return new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(8765, '127.0.0.1', resolve)
      })
    },
    close() {
      return new Promise(resolve => {
        if (!server.listening) return resolve()
        server.close(resolve)
      })
    }
  }
}

async function connectSwiggyMcp() {
  const provider = new SwiggyOAuthProvider()
  const callback = startCallbackServer()

  await callback.listen()

  let client
  let transport

  try {
    const createConnection = () => {
      client = new Client({
        name: 'swiggy-ai-assistant',
        version: '1.0.0'
      })

      transport = new StreamableHTTPClientTransport(MCP_URL, {
        authProvider: provider
      })
    }

    createConnection()

    try {
      await client.connect(transport)
    } catch (error) {
      const message = String(error.message || error)

      if (
        !message.includes('Unauthorized') &&
        !message.includes('invalid_token') &&
        !message.includes('Authentication required')
      ) {
        throw error
      }

      console.log('Swiggy OAuth login required.')

      // Wait for the browser to return the authorization code.
      const code = await Promise.race([
        callback.codePromise,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('OAuth login timed out after 3 minutes')),
            180000
          )
        )
      ])

      await transport.finishAuth(code)

      await client.close().catch(() => {})

      createConnection()
      await client.connect(transport)
    }

    console.log('Swiggy MCP connected successfully!')

    const tools = await client.listTools()

    console.log(
      'Available tools:',
      tools.tools.map(tool => tool.name)
    )

    return { client, transport }
  } catch (error) {
    if (client) {
      await client.close().catch(() => {})
    }
    throw error
  } finally {
    await callback.close()
  }
}

module.exports = { connectSwiggyMcp }
