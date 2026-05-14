import { useState, useRef, useEffect } from "react"
import { aiApi } from "../services/api"

const TABS = ["Review", "Chat", "Fix", "Explain"]

const TAB_CONFIG = {
  Review: {
    icon: "🔍",
    placeholder: null,
    buttonText: "Code Review Karo",
    color: "amber",
    description: "AI tumhara code review karega — bugs, improvements, best practices"
  },
  Chat: {
    icon: "💬",
    placeholder: "Koi bhi sawaal pucho... e.g. 'Is function mein kya problem hai?'",
    buttonText: "Pucho",
    color: "blue",
    description: "AI se apne code ke baare mein baat karo"
  },
  Fix: {
    icon: "⚡",
    placeholder: "Error message yahan daalo (optional)...",
    buttonText: "Code Fix Karo",
    color: "green",
    description: "AI tumhara buggy code fix karega"
  },
  Explain: {
    icon: "📝",
    placeholder: null,
    buttonText: "Explain Karo",
    color: "purple",
    description: "AI code ko simple Hindi + English mein samjhayega"
  }
}

const COLOR_CLASSES = {
  amber:  { btn: "bg-amber-400 hover:bg-amber-300 text-gray-950",  badge: "bg-amber-400/10 text-amber-400 border-amber-400/30" },
  blue:   { btn: "bg-blue-500 hover:bg-blue-400 text-white",       badge: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  green:  { btn: "bg-green-500 hover:bg-green-400 text-white",     badge: "bg-green-500/10 text-green-400 border-green-500/30" },
  purple: { btn: "bg-purple-500 hover:bg-purple-400 text-white",   badge: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
}

// Markdown-style formatter
const formatAIResponse = (text) => {
  if (!text) return ""
  return text
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre class="bg-gray-950 rounded-lg p-3 my-2 overflow-x-auto text-xs text-green-400 border border-gray-700"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-700 px-1 rounded text-amber-300 text-xs">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/^#{1,3}\s(.+)/gm, '<p class="font-bold text-white mt-2">$1</p>')
    .replace(/\n/g, '<br/>')
}

export const AIPanel = ({ code = "", language = "javascript", onApplyFix }) => {
  const [activeTab, setActiveTab] = useState("Review")
  const [input, setInput] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [chatHistory, setChatHistory] = useState([])
  const chatEndRef = useRef(null)

  // Chat scroll to bottom
  useEffect(() => {
    if (activeTab === "Chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatHistory])

  // Tab change pe result clear karo
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setResult(null)
    setError("")
    setInput("")
  }

  const handleAction = async () => {
    setLoading(true)
    setError("")
    setResult(null)

    try {
      if (!code || code.trim().length === 0) {
        setError("Pehle editor mein kuch code likho!")
        return
      }

      switch (activeTab) {
        case "Review": {
          const data = await aiApi.review(code, language)
          setResult({ type: "review", content: data.review })
          break
        }
        case "Chat": {
          if (!input.trim()) {
            setError("Kuch pucho pehle!")
            return
          }
          const userMsg = { role: "user", content: input }
          setChatHistory(prev => [...prev, userMsg])
          setInput("")

          const data = await aiApi.chat(input, code, language)
          const aiMsg = { role: "ai", content: data.response }
          setChatHistory(prev => [...prev, aiMsg])
          break
        }
        case "Fix": {
          const data = await aiApi.fix(code, language, input)
          setResult({ type: "fix", content: data.fixedCode })
          break
        }
        case "Explain": {
          const data = await aiApi.explain(code, language)
          setResult({ type: "explain", content: data.explanation })
          break
        }
      }
    } catch (err) {
      setError(err.message || "Kuch galat ho gaya — dobara try karo")
    } finally {
      setLoading(false)
    }
  }

  const config = TAB_CONFIG[activeTab]
  const colors = COLOR_CLASSES[config.color]

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 w-80">

      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🤖</span>
          <span className="text-white font-semibold text-sm">Mistral AI</span>
          <span className="ml-auto text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
            Online
          </span>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab
                  ? `${colors.badge} border`
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {TAB_CONFIG[tab].icon} {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="px-3 py-2 bg-gray-800/50">
        <p className="text-xs text-gray-400">{config.description}</p>
        <p className="text-xs text-gray-600 mt-0.5">
          Language: <span className="text-amber-400">{language}</span> •
          Code: <span className="text-amber-400">{code.length} chars</span>
        </p>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-3">

        {/* Chat tab — special UI */}
        {activeTab === "Chat" && (
          <div className="flex flex-col gap-2">
            {chatHistory.length === 0 && (
              <div className="text-center py-8 text-gray-600">
                <p className="text-2xl mb-2">💬</p>
                <p className="text-xs">Code ke baare mein kuch bhi pucho</p>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-800 text-gray-200 rounded-bl-sm"
                  }`}
                >
                  {msg.role === "ai" ? (
                    <div dangerouslySetInnerHTML={{
                      __html: formatAIResponse(msg.content)
                    }} />
                  ) : msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-xl px-3 py-2 text-xs text-gray-400">
                  <span className="animate-pulse">AI soch raha hai...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Other tabs — result display */}
        {activeTab !== "Chat" && (
          <>
            {!result && !loading && !error && (
              <div className="text-center py-8 text-gray-600">
                <p className="text-3xl mb-2">{config.icon}</p>
                <p className="text-xs">
                  {activeTab === "Review" && "Button dabao — AI code review karega"}
                  {activeTab === "Fix"    && "AI tumhara code fix karega"}
                  {activeTab === "Explain" && "AI code ko simple mein samjhayega"}
                </p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-400 animate-pulse">
                  Mistral AI soch raha hai...
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-xl p-3">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            {result && (
              <div className="bg-gray-800 rounded-xl p-3">
                {/* Fix tab — apply button */}
                {result.type === "fix" && onApplyFix && (
                  <button
                    onClick={() => onApplyFix(result.content)}
                    className="w-full mb-3 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-white text-xs font-bold transition"
                  >
                    ✅ Editor mein Apply Karo
                  </button>
                )}
                <div
                  className="text-xs text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: formatAIResponse(result.content)
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-gray-800">
        {config.placeholder && (
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={config.placeholder}
            rows={activeTab === "Chat" ? 2 : 2}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey && activeTab === "Chat") {
                e.preventDefault()
                handleAction()
              }
            }}
            className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-amber-400 focus:outline-none resize-none mb-2 placeholder-gray-600"
          />
        )}

        <button
          onClick={handleAction}
          disabled={loading || (!code || code.trim().length === 0)}
          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${colors.btn}`}
        >
          {loading
            ? "⏳ Soch raha hai..."
            : `${config.icon} ${config.buttonText}`
          }
        </button>

        {/* Clear button for chat */}
        {activeTab === "Chat" && chatHistory.length > 0 && (
          <button
            onClick={() => setChatHistory([])}
            className="w-full mt-1 py-1.5 rounded-lg text-xs text-gray-600 hover:text-gray-400 transition"
          >
            Chat clear karo
          </button>
        )}
      </div>
    </div>
  )
}
