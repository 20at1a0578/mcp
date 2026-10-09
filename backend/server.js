
const express = require('express')
const cors = require('cors')

const {
  processFoodRequest
} = require('./services/aiService')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: 'http://localhost:5173'
}))

app.use(express.json({
  limit: '100kb'
}))

app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    ai: 'ollama-local',
    model: process.env.OLLAMA_MODEL || 'qwen3:4b'
  })
})

app.post('/api/chat', async (req, res) => {
  try {
    const {
      message,
      conversation,
      location
    } = req.body || {}

    if (
      typeof message !== 'string' ||
      !message.trim()
    ) {
      return res.status(400).json({
        error: 'A valid message is required.'
      })
    }

    const result = await processFoodRequest(
      message,
      conversation,
      location
    )

    res.json(result)
  } catch (error) {
    console.error('AI chat error:', error)

    res.status(500).json({
      error:
        error.message ||
        'Failed to process AI request.'
    })
  }
})

app.listen(PORT, () => {
  console.log(
    `AI backend running at http://localhost:${PORT}`
  )
})

