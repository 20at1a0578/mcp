
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'

const LOCATIONS = {
  bengaluru: {
    label: 'Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946
  },
  chennai: {
    label: 'Chennai',
    latitude: 13.0827,
    longitude: 80.2707
  },
  hyderabad: {
    label: 'Hyderabad',
    latitude: 17.385,
    longitude: 78.4867
  }
}

function App() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  const [locationKey, setLocationKey] =
    useState('bengaluru')

  const [customLatitude, setCustomLatitude] =
    useState('')

  const [customLongitude, setCustomLongitude] =
    useState('')

  function getLocation() {
    if (locationKey !== 'custom') {
      return LOCATIONS[locationKey]
    }

    if (
      customLatitude.trim() === '' ||
      customLongitude.trim() === ''
    ) {
      throw new Error(
        'Enter both latitude and longitude.'
      )
    }

    const latitude = Number(customLatitude)
    const longitude = Number(customLongitude)

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error('Enter valid coordinates.')
    }

    return {
      latitude,
      longitude
    }
  }

  async function handleSend(event) {
    event?.preventDefault()

    if (!message.trim() || loading) return

    let selectedLocation

    try {
      selectedLocation = getLocation()
    } catch (error) {
      alert(error.message)
      return
    }

    const userMessage = {
      role: 'user',
      content: message.trim()
    }

    const history = [...messages, userMessage]

    setMessages(history)
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch(
        'http://localhost:5000/api/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: userMessage.content,
            conversation: messages,
            location: {
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude
            }
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Failed to fetch food results.'
        )
      }

      setMessages(previous => [
        ...previous,
        {
          role: 'assistant',
          content:
            data.reply || 'No response received.'
        }
      ])
    } catch (error) {
      setMessages(previous => [
        ...previous,
        {
          role: 'assistant',
          content: `Error: ${error.message}`
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleNewChat() {
    setMessages([])
    setMessage('')
  }

  return (
    <div className="app">
      <div className="chat-container">
        <header className="chat-header">
          <div>
            <h1>Swiggy Food Assistant</h1>
            <p>
              Discover food and compare live prices
            </p>
          </div>

          <button
            type="button"
            className="new-chat-btn"
            onClick={handleNewChat}
          >
            New Chat
          </button>
        </header>

        <div className="location-section">
          <label htmlFor="location">
            Delivery Location
          </label>

          <select
            id="location"
            value={locationKey}
            onChange={event =>
              setLocationKey(event.target.value)
            }
          >
            <option value="bengaluru">
              Bengaluru
            </option>

            <option value="chennai">
              Chennai
            </option>

            <option value="hyderabad">
              Hyderabad
            </option>

            <option value="custom">
              Custom Coordinates
            </option>
          </select>

          {locationKey === 'custom' && (
            <div className="coordinate-inputs">
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                value={customLatitude}
                onChange={event =>
                  setCustomLatitude(
                    event.target.value
                  )
                }
              />

              <input
                type="number"
                step="any"
                placeholder="Longitude"
                value={customLongitude}
                onChange={event =>
                  setCustomLongitude(
                    event.target.value
                  )
                }
              />
            </div>
          )}
        </div>

        <main className="chat-messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>
                What are you craving today?
              </h2>

              <p>
                Search dishes, compare prices,
                or plan a group dinner within
                your budget.
              </p>

              <div className="suggestions">
                <button
                  type="button"
                  onClick={() =>
                    setMessage(
                      'Show 20 chicken biryani items'
                    )
                  }
                >
                  Chicken Biryani
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setMessage(
                      'Show 15 paneer tikka dishes'
                    )
                  }
                >
                  Paneer Tikka
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setMessage(
                      'Suggest non veg dinner for 8 persons under 10000 with different varieties in the same restaurant'
                    )
                  }
                >
                  Group Dinner
                </button>
              </div>
            </div>
          )}

          {messages.map((item, index) => (
            <div
              key={index}
              className={
                item.role === 'user'
                  ? 'message user-message'
                  : 'message assistant-message'
              }
            >
              <div className="message-role">
                {item.role === 'user'
                  ? 'You'
                  : 'Food Assistant'}
              </div>

              <div className="message-content">
                {item.role === 'assistant' ? (
                  <ReactMarkdown
                    components={{
                      img: ({
                        src,
                        alt,
                        ...props
                      }) => (
                        <img
                          {...props}
                          src={src}
                          alt={
                            alt || 'Food image'
                          }
                          className="food-image"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ),
                      a: ({
                        href,
                        children,
                        ...props
                      }) => (
                        <a
                          {...props}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      )
                    }}
                  >
                    {item.content}
                  </ReactMarkdown>
                ) : (
                  item.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message assistant-message">
              <div className="message-role">
                Food Assistant
              </div>

              <div className="message-content">
                Searching Swiggy menus...
              </div>
            </div>
          )}
        </main>

        <form
          className="chat-input-form"
          onSubmit={handleSend}
        >
          <input
            type="text"
            placeholder="Ask about food, prices or budgets..."
            value={message}
            onChange={event =>
              setMessage(event.target.value)
            }
            disabled={loading}
          />

          <button
            type="submit"
            disabled={
              loading || !message.trim()
            }
          >
            {loading
              ? 'Searching...'
              : 'Send'}
          </button>
        </form>

        <footer className="chat-footer">
          Prices and availability may change.
          No orders or payments are placed.
        </footer>
      </div>
    </div>
  )
}

export default App
