const foodItems = require('../foodData')

// For now Swiggy MCP authentication is unavailable.
// Later this can be changed to true after MCP authentication works.
const SWIGGY_MCP_ENABLED = false


async function getMockFoodOptions(request) {
  const {
    budget,
    people,
    preference,
    meal
  } = request

  if (!budget || !people) {
    return []
  }

  return foodItems
    .filter((item) => {
      const preferenceMatches =
        preference === 'any' ||
        item.preference === preference

      const mealMatches =
        meal === 'any' ||
        item.meal.includes(meal)

      const totalPrice =
        item.price * people

      return (
        preferenceMatches &&
        mealMatches &&
        totalPrice <= budget
      )
    })

    .map((item) => {
      const totalPrice =
        item.price * people

      return {
        ...item,

        quantity: people,

        totalPrice,

        remainingBudget:
          budget - totalPrice,

        source: 'mock'
      }
    })

    .sort((a, b) =>
      b.totalPrice - a.totalPrice
    )

    .slice(0, 3)
}


async function getSwiggyFoodOptions(request) {

  /*
    =================================================
    SWIGGY MCP WILL BE CONNECTED HERE
    =================================================

    Future flow:

    1. Receive:
       budget
       people
       preference
       meal

    2. Search restaurants through Swiggy MCP

    3. Get menu items + prices

    4. Convert Swiggy response into:

       {
         restaurant: "...",
         name: "...",
         price: 200,
         quantity: 4,
         totalPrice: 800,
         remainingBudget: 0,
         source: "swiggy"
       }

    5. Return recommendations
  */

  throw new Error(
    'Swiggy MCP authentication is not available yet.'
  )
}


async function getFoodOptions(request) {

  if (SWIGGY_MCP_ENABLED) {

    try {

      const swiggyResults =
        await getSwiggyFoodOptions(request)

      return {
        source: 'swiggy',
        recommendations: swiggyResults
      }

    } catch (error) {

      console.error(
        'Swiggy MCP failed:',
        error.message
      )

      console.log(
        'Using development data instead.'
      )
    }
  }


  const mockResults =
    await getMockFoodOptions(request)


  return {
    source: 'mock',
    recommendations: mockResults
  }
}


module.exports = {
  getFoodOptions
}