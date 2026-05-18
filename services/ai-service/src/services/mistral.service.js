import { Mistral } from "@mistralai/mistralai"

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY
})

const MODEL = "mistral-small-latest"

export const reviewCode = async (code, language) => {
  const response = await mistral.chat.complete({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are an expert ${language} developer.
        For code review:
        1. Find bugs
        2. Identify performance issues
        3. Suggest best practices
        4. Highlight security issues
        Respond in English.
        Format the response using emojis and bullet points.`
      },
      {
        role: "user",
        content: `Review this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``
      }
    ],
    maxTokens: 1000
  })

  return response.choices[0].message.content
}

export const chatWithAI = async (message, code, language) => {
  const response = await mistral.chat.complete({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a helpful coding assistant.
        The user is working with ${language} code.
        Answer the question clearly and concisely.
        Provide code examples whenever necessary.`
      },
      {
        role: "user",
        content: `My current code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nQuestion: ${message}`
      }
    ],
    maxTokens: 800
  })

  return response.choices[0].message.content
}

export const fixCode = async (code, language, error = "") => {
  const response = await mistral.chat.complete({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are an expert ${language} developer.
        Fix the buggy code.
        Return only the fixed code — no explanation.
        Wrap the response inside a code block.`
      },
      {
        role: "user",
        content: `Fix this ${language} code:
\`\`\`${language}
${code}
\`\`\`
${error ? `Error: ${error}` : "Find and fix the bugs."}`
      }
    ],
    maxTokens: 1000
  })

  return response.choices[0].message.content
}


export const explainCode = async (code, language) => {
  const response = await mistral.chat.complete({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a senior ${language} instructor.
        Explain the code step by step.
        Use simple and beginner-friendly English.
        Focus on:
        1. What the code does
        2. How the flow works
        3. Important logic points
        4. Beginner-friendly explanation`
      },
      {
        role: "user",
        content: `Explain this code:\n\n\`\`\`${language}\n${code}\n\`\`\``
      }
    ],
    maxTokens: 900
  })

  return response.choices[0].message.content
}