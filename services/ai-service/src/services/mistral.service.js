import { Mistral } from "@mistralai/mistralai"

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY
})

const MODEL = "mistral-small-latest"  // Free tier mein available

// ── Code Review ──────────────────────────────────
export const reviewCode = async (code, language) => {
  const response = await mistral.chat.complete({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `Tu ek expert ${language} developer hai. 
        Code review karne ke liye:
        1. Bugs dhundho
        2. Performance issues batao
        3. Best practices suggest karo
        4. Security issues batao
        Response Hindi + English mein do. 
        Format: emoji ke saath points mein.`
      },
      {
        role: "user",
        content: `Is ${language} code ko review karo:\n\n\`\`\`${language}\n${code}\n\`\`\``
      }
    ],
    maxTokens: 1000
  })

  return response.choices[0].message.content
}

// ── AI Chat ──────────────────────────────────────
export const chatWithAI = async (message, code, language) => {
  const response = await mistral.chat.complete({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `Tu ek helpful coding assistant hai.
        User ke paas ${language} code hai.
        Sawal ka jawab do — clear aur concise.
        Code examples do jab zaruri ho.`
      },
      {
        role: "user",
        content: `Mera current code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nSawal: ${message}`
      }
    ],
    maxTokens: 800
  })

  return response.choices[0].message.content
}

// ── Code Fix ─────────────────────────────────────
export const fixCode = async (code, language, error = "") => {
  const response = await mistral.chat.complete({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `Tu ek expert ${language} developer hai.
        Buggy code fix karo.
        Sirf fixed code return karo — explanation nahi.
        Code block mein wrap karo.`
      },
      {
        role: "user",
        content: `Is ${language} code ko fix karo:
\`\`\`${language}
${code}
\`\`\`
${error ? `Error: ${error}` : "Bugs dhundho aur fix karo."}`
      }
    ],
    maxTokens: 1000
  })

  return response.choices[0].message.content
}


// ── Code Explain ────────────────────────────────
export const explainCode = async (code, language) => {
  const response = await mistral.chat.complete({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `Tu ek senior ${language} teacher hai.
        Code ko step-by-step explain karo.
        Simple Hindi + English use karo.
        Focus:
        1. Code kya kar raha hai
        2. Flow kaise kaam karta hai
        3. Important logic points
        4. Beginner-friendly explanation`
      },
      {
        role: "user",
        content: `Is code ko explain karo:\n\n\`\`\`${language}\n${code}\n\`\`\``
      }
    ],
    maxTokens: 900
  })

  return response.choices[0].message.content
}