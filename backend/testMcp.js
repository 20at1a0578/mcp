
const {
  connectSwiggyMcp
} = require('./services/swiggyMcpClient')

async function main() {
  let connection

  try {
    connection = await connectSwiggyMcp()

    const result = await connection.client.callTool({
      name: 'search_menu',
      arguments: {
        latitude: 12.9716,
        longitude: 77.5946,
        query: 'paneer tikka'
      }
    })

    console.log(
      'SWIGGY MENU RESULT:',
      JSON.stringify(result, null, 2)
    )

  } catch (error) {
    console.error('Test failed:', error.message)
    process.exitCode = 1
  } finally {
    if (connection) {
      await connection.client.close()
    }
  }
}

main()

