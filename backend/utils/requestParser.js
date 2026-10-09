function parseNumberWord(text) {
  const numbers = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10
  }

  for (const [word, value] of Object.entries(numbers)) {
    if (text.includes(`${word} people`) ||
        text.includes(`${word} persons`) ||
        text.includes(`${word} friends`) ||
        text.includes(`${word} members`)) {
      return value
    }
  }

  return null
}


function understandRequest(message) {
  const text = message.toLowerCase()

  // -------------------------
  // BUDGET
  // -------------------------

  let budget = null

  const budgetPatterns = [
    /₹\s*(\d+)/,
    /rs\.?\s*(\d+)/,
    /(\d+)\s*rupees/,
    /budget\s*(?:of|is|around|:)?\s*₹?\s*(\d+)/,
    /under\s*₹?\s*(\d+)/,
    /within\s*₹?\s*(\d+)/,
    /maximum\s*₹?\s*(\d+)/,
    /max\s*₹?\s*(\d+)/
  ]

  for (const pattern of budgetPatterns) {
    const match = text.match(pattern)

    if (match) {
      budget = Number(match[1])
      break
    }
  }


  // -------------------------
  // PEOPLE
  // -------------------------

  let people = null

  const peopleMatch = text.match(
    /(\d+)\s*(?:people|persons|members|friends|person)/
  )

  if (peopleMatch) {
    people = Number(peopleMatch[1])
  } else {
    people = parseNumberWord(text)
  }


  // -------------------------
  // PREFERENCE
  // -------------------------

  let preference = 'any'

  const nonVegWords = [
    'non veg',
    'non-veg',
    'nonveg',
    'chicken',
    'mutton',
    'fish',
    'prawn',
    'prawns',
    'egg'
  ]

  const vegWords = [
    'vegetarian',
    'pure veg',
    'veg'
  ]

  if (
    nonVegWords.some((word) =>
      text.includes(word)
    )
  ) {
    preference = 'non-veg'
  } else if (
    vegWords.some((word) =>
      text.includes(word)
    )
  ) {
    preference = 'veg'
  }


  // -------------------------
  // MEAL
  // -------------------------

  let meal = 'any'

  if (
    text.includes('breakfast') ||
    text.includes('morning')
  ) {
    meal = 'breakfast'
  } else if (
    text.includes('lunch') ||
    text.includes('afternoon')
  ) {
    meal = 'lunch'
  } else if (
    text.includes('dinner') ||
    text.includes('tonight') ||
    text.includes('night')
  ) {
    meal = 'dinner'
  }


  // -------------------------
  // CUISINE
  // -------------------------

  let cuisine = 'any'

  const cuisines = [
    'biryani',
    'south indian',
    'north indian',
    'chinese',
    'italian',
    'pizza',
    'burger'
  ]

  for (const item of cuisines) {
    if (text.includes(item)) {
      cuisine = item
      break
    }
  }


  return {
    budget,
    people,
    preference,
    meal,
    cuisine
  }
}


module.exports = {
  understandRequest
}