import { useState, useRef, useEffect, useMemo } from "react"
import { aiApi } from "../services/api"
import { toast } from "sonner"
import DOMPurify from "dompurify"

const TABS = ["Review", "Chat", "Fix", "Explain"]

const TAB_CONFIG = {
  Review: {
    icon: "🔍",
    placeholder: "",
    buttonText: "Review Code",
    color: "amber",
    description:
      "AI will review your code for bugs, improvements, and best practices",
  },

  Chat: {
    icon: "💬",
    placeholder: "Ask anything about your code...",
    buttonText: "Ask AI",
    color: "blue",
    description: "Chat with AI about your code",
  },

  Fix: {
    icon: "⚡",
    placeholder: "Paste error message here (optional)...",
    buttonText: "Fix Code",
    color: "green",
    description: "AI will automatically fix your buggy code",
  },

  Explain: {
    icon: "📝",
    placeholder: "",
    buttonText: "Explain Code",
    color: "purple",
    description: "AI will explain your code in simple terms",
  },
}

const COLOR_CLASSES = {
  amber: {
    btn: "bg-amber-400 hover:bg-amber-300 text-black",
    badge:
      "bg-amber-400/10 text-amber-400 border border-amber-400/30",
  },

  blue: {
    btn: "bg-blue-500 hover:bg-blue-400 text-white",
    badge:
      "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  },

  green: {
    btn: "bg-green-500 hover:bg-green-400 text-white",
    badge:
      "bg-green-500/10 text-green-400 border border-green-500/30",
  },

  purple: {
    btn: "bg-purple-500 hover:bg-purple-400 text-white",
    badge:
      "bg-purple-500/10 text-purple-400 border border-purple-500/30",
  },
}

const escapeHtml = (text = "") => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

const sanitizeHTML = (html) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "div",
      "pre",
      "code",
      "span",
      "strong",
      "h1",
      "h2",
      "h3",
      "p",
      "br",
      "ul",
      "ol",
      "li",
    ],

    ALLOWED_ATTR: ["class"],
  })
}

const formatAIResponse = (text = "") => {
  let formatted = escapeHtml(text)

  formatted = formatted.replace(
    /```(\w+)?\n?([\s\S]*?)```/g,
    (_, lang, code) => `
      <div class="my-4 rounded-2xl overflow-hidden border border-gray-700">
        <div class="bg-gray-800 px-4 py-2 text-xs text-gray-400 border-b border-gray-700 flex items-center justify-between">
          <span>${lang || "code"}</span>
        </div>

        <pre class="bg-gray-950 p-4 overflow-x-auto text-xs text-green-400">
          <code>${code}</code>
        </pre>
      </div>
    `
  )

  formatted = formatted.replace(
    /`([^`]+)`/g,
    `
      <code class="bg-gray-800 px-1.5 py-0.5 rounded text-amber-300 text-xs">
        $1
      </code>
    `
  )

  formatted = formatted.replace(
    /\*\*(.+?)\*\*/g,
    `<strong class="text-white font-semibold">$1</strong>`
  )

  formatted = formatted.replace(
    /^### (.+)$/gm,
    `<h3 class="text-base font-bold text-white mt-4 mb-2">$1</h3>`
  )

  formatted = formatted.replace(
    /^## (.+)$/gm,
    `<h2 class="text-lg font-bold text-white mt-5 mb-3">$1</h2>`
  )

  formatted = formatted.replace(
    /^# (.+)$/gm,
    `<h1 class="text-xl font-bold text-white mt-5 mb-3">$1</h1>`
  )

  formatted = formatted.replace(
    /^\- (.+)$/gm,
    `<li class="ml-4">$1</li>`
  )

  formatted = formatted.replace(
    /(<li.*<\/li>)/gs,
    `<ul class="list-disc space-y-1 my-2">$1</ul>`
  )

  formatted = formatted.replace(/\n/g, "<br/>")

  return sanitizeHTML(formatted)
}

export const AIPanel = ({
  code = "",
  language = "javascript",
  onApplyFix,
}) => {
  const [activeTab, setActiveTab] = useState("Review")
  const [input, setInput] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState([])

  const chatEndRef = useRef(null)

  const config = useMemo(
    () => TAB_CONFIG[activeTab],
    [activeTab]
  )

  const colors = useMemo(
    () => COLOR_CLASSES[config.color],
    [config.color]
  )

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    })
  }, [chatHistory, loading])

  const resetPanel = () => {
    setResult(null)
    setInput("")
  }

  const handleTabChange = (tab) => {
    if (loading) return

    setActiveTab(tab)
    resetPanel()
  }

  const handleChat = async () => {
    if (!input.trim()) {
      toast.error("Ask something first")
      return
    }

    const currentInput = input.trim()

    const userMessage = {
      role: "user",
      content: currentInput,
    }

    setChatHistory((prev) => [...prev, userMessage])

    setInput("")

    const data = await aiApi.chat(
      currentInput,
      code,
      language
    )

    const aiMessage = {
      role: "ai",
      content: data.response,
    }

    setChatHistory((prev) => [...prev, aiMessage])
  }

  const handleReview = async () => {
    toast.loading("Reviewing code...", {
      id: "ai-action",
    })

    const data = await aiApi.review(code, language)

    setResult({
      type: "review",
      content: data.review,
    })

    toast.success("Code review completed", {
      id: "ai-action",
    })
  }

  const handleFix = async () => {
    toast.loading("Fixing your code...", {
      id: "ai-action",
    })

    const data = await aiApi.fix(
      code,
      language,
      input
    )

    setResult({
      type: "fix",
      content: data.fixedCode,
    })

    toast.success("Code fixed successfully", {
      id: "ai-action",
    })
  }

  const handleExplain = async () => {
    toast.loading("Explaining code...", {
      id: "ai-action",
    })

    const data = await aiApi.explain(
      code,
      language
    )

    setResult({
      type: "explain",
      content: data.explanation,
    })

    toast.success("Explanation ready", {
      id: "ai-action",
    })
  }

  const handleAction = async () => {
    if (loading) return

    if (!code.trim()) {
      toast.error("Write some code in the editor first")
      return
    }

    try {
      setLoading(true)

      switch (activeTab) {
        case "Review":
          await handleReview()
          break

        case "Chat":
          await handleChat()
          break

        case "Fix":
          await handleFix()
          break

        case "Explain":
          await handleExplain()
          break

        default:
          break
      }
    } catch (err) {
      console.error(err)

      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Something went wrong"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    // <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 w-full sm:w-[460px] xl:w-[540px] ">
    <div className="flex flex-col h-full w-full bg-gray-900">

      <div className="p-4 border-b border-gray-800 shrink-0 bg-gradient-to-r from-gray-900 to-gray-950">

        <div className="flex items-center gap-3 mb-4">

          <div className="w-11 h-11 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
            <span className="text-xl">
              🤖
            </span>
          </div>

          <div>
            <h2 className="text-white font-semibold text-sm">
              Dev AI
            </h2>

            <p className="text-xs text-gray-500">
              Smart coding assistant
            </p>
          </div>

          <span className="ml-auto text-xs bg-green-500/10 text-green-400 border border-green-500/30 px-2 py-1 rounded-full">
            Online
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              disabled={loading}
              onClick={() => handleTabChange(tab)}
              className={`
                py-3
                rounded-2xl
                text-[11px]
                font-medium
                transition-all
                disabled:opacity-50
                disabled:cursor-not-allowed
                ${
                  activeTab === tab
                    ? colors.badge
                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                }
              `}
            >
              <span className="block text-lg mb-1"> 
                {TAB_CONFIG[tab].icon}
              </span>

              <span className="hidden sm:inline">
                {tab}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 bg-gray-800/40 border-b border-gray-800 shrink-0">

        <p className="text-xs text-gray-400 leading-relaxed">
          {config.description}
        </p>

        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 flex-wrap">

          <span>
            Language:
            <span className="ml-1 text-amber-400 capitalize">
              {language}
            </span>
          </span>

          <span>•</span>

          <span>
            Characters:
            <span className="ml-1 text-amber-400">
              {code.length}
            </span>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">

        {activeTab === "Chat" && (
          <div className="flex flex-col gap-3">

            {chatHistory.length === 0 && (
              <div className="text-center py-14 text-gray-600">

                <p className="text-5xl mb-4">
                  💬
                </p>

                <p className="text-sm">
                  Ask anything about your code
                </p>
              </div>
            )}

            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`
                    max-w-[90%]
                    rounded-2xl
                    px-4 py-3
                    text-sm
                    leading-8
                    break-words
                    ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-gray-800/70 backdrop-blur-xl border border-gray-700 text-gray-200 rounded-bl-md"
                    }
                  `}
                >
                  {msg.role === "ai" ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: formatAIResponse(
                          msg.content
                        ),
                      }}
                    />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-400">
                  <span className="animate-pulse">
                    AI is thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}

        {activeTab !== "Chat" && (
          <>
            {!result && !loading && (
              <div className="text-center py-14 text-gray-600">

                <p className="text-5xl mb-4">
                  {config.icon}
                </p>

                <p className="text-sm leading-relaxed">
                  {activeTab === "Review" &&
                    "Click below to review your code"}

                  {activeTab === "Fix" &&
                    "AI will automatically fix your code"}

                  {activeTab === "Explain" &&
                    "AI will explain your code clearly"}
                </p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-14 gap-4">

                <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />

                <p className="text-sm text-gray-400 animate-pulse">
                  Dev AI is analyzing your code...
                </p>
              </div>
            )}

            {result && (
              <div className="bg-gray-800/70 backdrop-blur-xl rounded-2xl p-4 border border-gray-700">

                {result.type === "fix" &&
                  onApplyFix && (
                    <button
                      onClick={() => {
                        onApplyFix(result.content)

                        toast.success(
                          "Fix applied to editor"
                        )
                      }}
                      className="
                        w-full
                        mb-4
                        py-3
                        rounded-xl
                        bg-green-500
                        hover:bg-green-400
                        text-white
                        text-sm
                        font-semibold
                        transition-all
                      "
                    >
                      ✅ Apply Fix to Editor
                    </button>
                  )}

                <div
                  className="
                  prose
                  prose-invert
                  prose-sm
                  max-w-none
                  text-gray-300
                  leading-8
                  break-words
                  "
                  dangerouslySetInnerHTML={{
                    __html: formatAIResponse(
                      result.content
                    ),
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t border-gray-800 shrink-0">

        {config.placeholder && (
          <textarea
            rows={2}
            value={input}
            disabled={loading}
            placeholder={config.placeholder}
            onChange={(e) =>
              setInput(e.target.value)
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                activeTab === "Chat"
              ) {
                e.preventDefault()
                handleAction()
              }
            }}
            className="
              w-full
              bg-gray-800
              border border-gray-700
              text-white
              text-sm
              rounded-xl
              px-4 py-3
              resize-none
              mb-3
              placeholder-gray-500
              focus:outline-none
              focus:border-amber-400
              disabled:opacity-50
            "
          />
        )}

        <button
          onClick={handleAction}
          disabled={
            loading ||
            !code.trim()
          }
          className={`
            w-full
            py-3
            rounded-xl
            text-sm
            font-semibold
            transition-all
            disabled:opacity-40
            disabled:cursor-not-allowed
            ${colors.btn}
          `}
        >
          {loading
            ? "⏳ Processing..."
            : `${config.icon} ${config.buttonText}`}
        </button>

        {activeTab === "Chat" &&
          chatHistory.length > 0 && (
            <button
              disabled={loading}
              onClick={() => {
                setChatHistory([])
                toast.success("Chat cleared")
              }}
              className="
                w-full
                mt-2
                py-2
                rounded-xl
                text-sm
                text-gray-500
                hover:text-gray-300
                hover:bg-gray-800
                transition-all
                disabled:opacity-50
              "
            >
              Clear Chat
            </button>
          )}
      </div>
    </div>
  )
}




