import { useState, useRef, useEffect, useMemo } from "react"
import { aiApi } from "../services/api"
import { toast } from "sonner"
import DOMPurify from "dompurify"
import { DiffEditor } from "@monaco-editor/react"
import { defineCoduetTheme } from "../utils/monacoTheme"
import {
  Sparkles,
  Search,
  MessageSquare,
  Wrench,
  BookOpen,
  Loader2,
  Check,
  Trash2,
} from "lucide-react"

const TABS = ["Review", "Chat", "Fix", "Explain"]

const TAB_CONFIG = {
  Review: {
    icon: Search,
    placeholder: "",
    buttonText: "Review code",
    description:
      "AI will review your code for bugs, improvements, and best practices",
    empty: "Click below to review your code",
  },

  Chat: {
    icon: MessageSquare,
    placeholder: "Ask anything about your code...",
    buttonText: "Ask AI",
    description: "Chat with AI about your code",
    empty: "Ask anything about your code",
  },

  Fix: {
    icon: Wrench,
    placeholder: "Paste error message here (optional)...",
    buttonText: "Fix code",
    description: "AI will automatically fix your buggy code",
    empty: "AI will automatically fix your code",
  },

  Explain: {
    icon: BookOpen,
    placeholder: "",
    buttonText: "Explain code",
    description: "AI will explain your code in simple terms",
    empty: "AI will explain your code clearly",
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
  const blocks = []

  // 1. Pull code blocks out first so no later rule can touch their contents
  let formatted = escapeHtml(text).replace(
    /```(\w+)?\n?([\s\S]*?)```/g,
    (_, lang, code) => {
      blocks.push(
        `<div class="my-3 rounded-xl overflow-hidden border border-line">` +
        `<div class="bg-ink px-3 py-1.5 font-mono text-[11px] text-muted border-b border-line">${lang || "code"}</div>` +
        `<pre class="bg-ink p-3 overflow-x-auto font-mono text-xs text-fg"><code>${code.trim()}</code></pre>` +
        `</div>`
      )
      return `@@BLOCK${blocks.length - 1}@@`
    }
  )

  // 2. Inline code, bold, headings
  formatted = formatted.replace(
    /`([^`]+)`/g,
    `<code class="bg-ink px-1.5 py-0.5 rounded font-mono text-xs text-ember">$1</code>`
  )

  formatted = formatted.replace(
    /\*\*(.+?)\*\*/g,
    `<strong class="text-fg font-semibold">$1</strong>`
  )

  formatted = formatted.replace(
    /^### (.+)$/gm,
    `<h3 class="font-display text-base font-semibold text-fg mt-4 mb-2">$1</h3>`
  )

  formatted = formatted.replace(
    /^## (.+)$/gm,
    `<h2 class="font-display text-lg font-semibold text-fg mt-5 mb-3">$1</h2>`
  )

  formatted = formatted.replace(
    /^# (.+)$/gm,
    `<h1 class="font-display text-xl font-bold text-fg mt-5 mb-3">$1</h1>`
  )

  // 3. Bullet lists: each run of "- " lines becomes its own <ul>
  formatted = formatted.replace(/(?:^- .+(?:\n|$))+/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((line) => `<li class="ml-4">${line.replace(/^- /, "")}</li>`)
      .join("")
    return `<ul class="list-disc space-y-1 my-2">${items}</ul>`
  })

  formatted = formatted.replace(/\n/g, "<br/>")

  // 4. Put the code blocks back
  formatted = formatted.replace(/@@BLOCK(\d+)@@/g, (_, i) => blocks[i])

  return sanitizeHTML(formatted)
}

export const AIPanel = ({
  roomId,
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
      language,
      roomId
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

    const data = await aiApi.review(code, language, roomId)

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
      input,
      roomId
    )

    setResult({
      type: "fix",
      content: data.fixedCode,
      summary: data.summary,
      base: code,
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
      language,
      roomId
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
        "Something went wrong",
        { id: "ai-action" }
      )
    } finally {
      setLoading(false)
    }
  }

  const Icon = config.icon

  return (
    <div className="flex flex-col h-full w-full bg-surface">
      {/* HEADER */}
      <div className="p-4 border-b border-line shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 shrink-0 rounded-lg border border-ai/30 bg-ai/10 flex items-center justify-center">
            <Sparkles size={17} className="text-ai" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold text-fg">
              AI Assistant
            </h2>
            <p className="text-xs text-muted">Review, ask, fix and explain</p>
          </div>
        </div>

        <div role="tablist" className="grid grid-cols-4 gap-1.5">
          {TABS.map((tab) => {
            const TabIcon = TAB_CONFIG[tab].icon
            const active = activeTab === tab

            return (
              <button
                key={tab}
                role="tab"
                aria-selected={active}
                disabled={loading}
                onClick={() => handleTabChange(tab)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${active
                  ? "bg-ai/15 border-ai/40 text-ai"
                  : "border-transparent text-muted hover:text-fg hover:bg-ink"
                  }`}
              >
                <TabIcon size={16} />
                {tab}
              </button>
            )
          })}
        </div>
      </div>

      {/* CONTEXT BAR */}
      <div className="px-4 py-3 bg-ink border-b border-line shrink-0">
        <p className="text-xs text-muted leading-relaxed">{config.description}</p>

        <div className="flex items-center gap-3 mt-2 font-mono text-[11px] text-muted flex-wrap">
          <span>
            language <span className="text-fg capitalize">{language}</span>
          </span>
          <span>
            chars <span className="text-fg">{code.length}</span>
          </span>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {activeTab === "Chat" && (
          <div className="flex flex-col gap-3">
            {chatHistory.length === 0 && (
              <div className="flex flex-col items-center text-center py-14 text-muted">
                <div className="w-12 h-12 mb-4 rounded-xl border border-line bg-ink flex items-center justify-center">
                  <MessageSquare size={22} />
                </div>
                <p className="text-sm">{config.empty}</p>
              </div>
            )}

            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[92%] min-w-0 rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${msg.role === "user"
                    ? "bg-ember/15 border border-ember/30 text-fg rounded-br-md"
                    : "bg-ink border border-line text-fg rounded-bl-md"
                    }`}
                >
                  {msg.role === "ai" ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: formatAIResponse(msg.content),
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
                <div className="inline-flex items-center gap-2 bg-ink border border-line rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted">
                  <Loader2 size={14} className="animate-spin text-ai" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}

        {activeTab !== "Chat" && (
          <>
            {!result && !loading && (
              <div className="flex flex-col items-center text-center py-14 text-muted">
                <div className="w-12 h-12 mb-4 rounded-xl border border-line bg-ink flex items-center justify-center">
                  <Icon size={22} />
                </div>
                <p className="text-sm leading-relaxed">{config.empty}</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-14 gap-4">
                <Loader2 size={28} className="animate-spin text-ai" />
                <p className="text-sm text-muted">Analyzing your code...</p>
              </div>
            )}

            {result && result.type === "fix" ? (
              <div className="space-y-3">
                {result.summary && (
                  <p className="text-sm text-fg leading-relaxed">{result.summary}</p>
                )}

                <div className="rounded-lg overflow-hidden border border-line">
                  <DiffEditor
                    original={result.base}
                    modified={result.content}
                    language={language}
                    theme="coduet"
                    beforeMount={defineCoduetTheme}
                    height="280px"
                    options={{
                      readOnly: true,
                      renderSideBySide: false,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      fontSize: 12,
                    }}
                  />
                </div>

                {result.base !== code ? (
                  <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
                    The code changed since this fix was made, so it can't be applied safely. Run Fix again.
                  </p>
                ) : (
                  <p className="text-[11px] text-muted">
                    Review the changes. A restore point is saved first, and you can undo with Ctrl+Z.
                  </p>
                )}

                {onApplyFix && (
                  <button
                    disabled={result.base !== code}
                    onClick={() => onApplyFix(result.content)}
                    className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 disabled:opacity-40 transition"
                  >
                    <Check size={16} />
                    Apply fix to editor
                  </button>
                )}
              </div>
            ) : (
              result && (
                <div className="bg-ink rounded-xl p-4 border border-line">
                  <div
                    className="text-sm text-fg leading-relaxed break-words"
                    dangerouslySetInnerHTML={{ __html: formatAIResponse(result.content) }}
                  />
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-line shrink-0">
        {config.placeholder && (
          <textarea
            rows={2}
            value={input}
            disabled={loading}
            placeholder={config.placeholder}
            aria-label={config.placeholder}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && activeTab === "Chat") {
                e.preventDefault()
                handleAction()
              }
            }}
            className="w-full bg-ink border border-line text-fg text-sm rounded-lg px-3 py-2.5 resize-none mb-3 placeholder:text-muted focus:outline-none focus:border-ai disabled:opacity-50 transition-colors"
          />
        )}

        <button
          onClick={handleAction}
          disabled={loading || !code.trim()}
          className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-ai text-ink text-sm font-semibold hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Icon size={15} />
              {config.buttonText}
            </>
          )}
        </button>

        {activeTab === "Chat" && chatHistory.length > 0 && (
          <button
            disabled={loading}
            onClick={() => {
              setChatHistory([])
              toast.success("Chat cleared")
            }}
            className="w-full mt-2 h-9 inline-flex items-center justify-center gap-2 rounded-lg text-xs text-muted hover:text-fg hover:bg-ink transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} />
            Clear chat
          </button>
        )}
      </div>
    </div>
  )
}




