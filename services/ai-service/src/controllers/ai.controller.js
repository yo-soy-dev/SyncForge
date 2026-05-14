import * as mistralService from "../services/mistral.service.js"

export const reviewCode = async (req, res) => {
  try {
    const { code, language = "javascript" } = req.body

    if (!code || code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Code do pehle!"
      })
    }

    if (code.length > 10000) {
      return res.status(400).json({
        success: false,
        message: "Code bahut lamba hai — 10000 characters se kam rakho"
      })
    }

    console.log(`AI Review request — language: ${language}, size: ${code.length}`)

    const review = await mistralService.reviewCode(code, language)

    res.status(200).json({
      success: true,
      review,
      language,
      reviewedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error("Review error:", error.message)
    res.status(500).json({
      success: false,
      message: "AI review fail ho gaya — baad mein try karo"
    })
  }
}

export const chatWithAI = async (req, res) => {
  try {
    const { message, code = "", language = "javascript" } = req.body

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message do!"
      })
    }

    const response = await mistralService.chatWithAI(message, code, language)

    res.status(200).json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Chat error:", error.message)
    res.status(500).json({
      success: false,
      message: "AI chat fail ho gaya"
    })
  }
}

export const fixCode = async (req, res) => {
  try {
    const { code, language = "javascript", error = "" } = req.body

    if (!code || code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Code do pehle!"
      })
    }

    const fixedCode = await mistralService.fixCode(code, language, error)

    res.status(200).json({
      success: true,
      fixedCode,
      language
    })
  } catch (error) {
    console.error("Fix error:", error.message)
    res.status(500).json({
      success: false,
      message: "AI fix fail ho gaya"
    })
  }
}


export const explainCode = async (req, res) => {
  try {
    const { code, language = "javascript" } = req.body

    if (!code || code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Code do pehle!"
      })
    }

    const explanation = await mistralService.explainCode(code, language)

    res.status(200).json({
      success: true,
      explanation,
      language,
      explainedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error("Explain error:", error.message)
    res.status(500).json({
      success: false,
      message: "AI explain fail ho gaya"
    })
  }
}