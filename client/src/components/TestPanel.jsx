import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
    ListChecks,
    Play,
    Square,
    Plus,
    Trash2,
    ChevronDown,
    Check,
    X,
    AlertTriangle,
    Loader2,
    Circle,
} from "lucide-react"
import { executeApi } from "../services/api"
import { EXECUTION_LIMITS, RUNNABLE_LANGUAGES } from "../utils/constants"

const MAX_CASES = 10

const storageKey = (roomId) => `coduet:tests:${roomId}`

const loadCases = (roomId) => {
    try {
        const value = JSON.parse(localStorage.getItem(storageKey(roomId)) || localStorage.getItem("syncforge:tests:" + roomId))
        return Array.isArray(value) ? value : []
    } catch {
        return []
    }
}

export const saveCases = (roomId, cases) => {
    try {
        localStorage.setItem(storageKey(roomId), JSON.stringify(cases))
    } catch {
        /* storage unavailable: ignore */
    }
}

const newId = () =>
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

// "3\n" equals "3", and trailing spaces on a line don't matter
const normalize = (s = "") =>
    s
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .trim()

const STATUS = {
    idle: { icon: Circle, cls: "text-muted", label: "Not run" },
    running: { icon: Loader2, cls: "text-ember animate-spin", label: "Running" },
    pass: { icon: Check, cls: "text-sync", label: "Passed" },
    fail: { icon: X, cls: "text-red-400", label: "Failed" },
    error: { icon: AlertTriangle, cls: "text-gold", label: "Error" },
    ran: { icon: Check, cls: "text-muted", label: "Ran" },
}

const fieldCls =
    "w-full min-w-0 resize-y bg-surface border border-line rounded-lg p-2 font-mono text-xs text-fg placeholder:text-muted focus:outline-none focus:border-ember transition-colors"

const OutputBlock = ({ label, text, tone = "muted" }) => {
    const tones = {
        muted: "border-line text-fg",
        red: "border-red-500/30 bg-red-500/5 text-red-300",
    }
    return (
        <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                {label}
            </p>
            <pre
                className={`max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-lg border p-2 font-mono text-xs ${tones[tone]}`}
            >
                {text === "" ? "(empty)" : text}
            </pre>
        </div>
    )
}

export const TestPanel = ({ roomId, language, getCode }) => {
    const [cases, setCases] = useState(() => loadCases(roomId))
    const [results, setResults] = useState({})
    const [openId, setOpenId] = useState(null)
    const [running, setRunning] = useState(false)
    const stopRef = useRef(false)

    useEffect(() => {
        setCases(loadCases(roomId))
        setResults({})
        setOpenId(null)
    }, [roomId])

    const update = (next) => {
        setCases(next)
        saveCases(roomId, next)
    }

    const patch = (id, changes) =>
        update(cases.map((c) => (c.id === id ? { ...c, ...changes } : c)))

    const addCase = () => {
        if (cases.length >= MAX_CASES) {
            toast.info(`You can have up to ${MAX_CASES} test cases`)
            return
        }
        const c = { id: newId(), name: `Case ${cases.length + 1}`, input: "", expected: "" }
        update([...cases, c])
        setOpenId(c.id)
    }

    const removeCase = (id) => {
        update(cases.filter((c) => c.id !== id))
        setResults((r) => {
            const { [id]: _removed, ...rest } = r
            return rest
        })
    }

    /* run a single case and return its final status */
    const runOne = async (c, code) => {
        setResults((r) => ({ ...r, [c.id]: { status: "running" } }))

        try {
            const data = await executeApi.run({ code, language, input: c.input })
            const actual = data.stdout ?? ""
            const stderr = data.stderr ?? ""
            const hasExpected = c.expected.trim() !== ""
            const matches = normalize(actual) === normalize(c.expected)

            let status
            if (!hasExpected) status = "ran"
            else if (matches) status = "pass"
            else if (stderr.trim()) status = "error"
            else status = "fail"

            setResults((r) => ({
                ...r,
                [c.id]: { status, actual, stderr, ms: data.executionTime },
            }))
            return status
        } catch (err) {
            if (err.response?.status === 429) {
                stopRef.current = true
                const wait = err.response.data?.retryAfterSeconds
                toast.error(`Run limit reached.${wait ? ` Try again in ${wait}s.` : ""}`)
                setResults((r) => {
                    const { [c.id]: _skipped, ...rest } = r
                    return rest
                })
                return "stopped"
            }
            const stderr =
                err.response?.data?.stderr || err.response?.data?.error || err.message
            setResults((r) => ({
                ...r,
                [c.id]: { status: "error", actual: "", stderr },
            }))
            return "error"
        }
    }

    const runCases = async (subset) => {
        if (!RUNNABLE_LANGUAGES.includes(language)) {
            toast.error(`${language} can't be run on this server yet`)
            return
        }
        const code = getCode?.() ?? ""

        if (!code.trim()) {
            toast.error("Write some code first")
            return
        }
        if (code.length > EXECUTION_LIMITS.MAX_CODE_SIZE) {
            toast.error(`Code too long. Max ${EXECUTION_LIMITS.MAX_CODE_SIZE / 1000}KB allowed.`)
            return
        }
        if (subset.length === 0) {
            toast.info("Add a test case first")
            return
        }

        stopRef.current = false
        setRunning(true)
        if (subset.length === cases.length) setResults({})

        let firstBad = null
        for (const c of subset) {
            if (stopRef.current) break
            const status = await runOne(c, code) // one at a time to be gentle on the server
            if (!firstBad && (status === "fail" || status === "error")) firstBad = c.id
        }

        setRunning(false)
        if (firstBad) setOpenId(firstBad)
    }

    /* summary */
    const statuses = cases.map((c) => results[c.id]?.status)
    const passed = statuses.filter((s) => s === "pass").length
    const failed = statuses.filter((s) => s === "fail").length
    const errored = statuses.filter((s) => s === "error").length
    const judged = passed + failed + errored
    const allPassed = judged > 0 && passed === cases.length

    return (
        <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
            {/* HEADER */}
            <div className="p-4 border-b border-line space-y-3 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 shrink-0 rounded-lg border border-ember/30 bg-ember/10 flex items-center justify-center">
                        <ListChecks size={16} className="text-ember" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-display text-sm font-semibold text-fg">Test cases</h3>
                        <p className="text-[11px] text-muted">Run your code against sample inputs</p>
                    </div>

                    {running ? (
                        <button
                            onClick={() => {
                                stopRef.current = true
                            }}
                            className="ml-auto h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 text-red-400 text-xs font-semibold hover:bg-red-500/10 transition-colors"
                        >
                            <Square size={12} fill="currentColor" />
                            Stop
                        </button>
                    ) : (
                        <button
                            onClick={() => runCases(cases)}
                            disabled={cases.length === 0}
                            className="ml-auto h-8 px-3 inline-flex items-center gap-1.5 rounded-lg bg-ember text-ink text-xs font-semibold hover:brightness-110 disabled:opacity-40 transition"
                        >
                            <Play size={12} fill="currentColor" />
                            Run all
                        </button>
                    )}
                </div>

                {judged > 0 && (
                    <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className={allPassed ? "text-sync font-medium" : "text-fg"}>
                                {passed} / {cases.length} passed
                            </span>
                            <span className="font-mono text-[11px] text-muted">
                                {failed > 0 && `${failed} failed`}
                                {failed > 0 && errored > 0 && " · "}
                                {errored > 0 && `${errored} error`}
                            </span>
                        </div>
                        <div className="flex h-1.5 rounded-full bg-line overflow-hidden">
                            <div
                                className="bg-sync transition-all"
                                style={{ width: `${(passed / Math.max(cases.length, 1)) * 100}%` }}
                            />
                            <div
                                className="bg-red-500 transition-all"
                                style={{ width: `${(failed / Math.max(cases.length, 1)) * 100}%` }}
                            />
                            <div
                                className="bg-gold transition-all"
                                style={{ width: `${(errored / Math.max(cases.length, 1)) * 100}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* CASES */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                {cases.length === 0 && (
                    <div className="flex flex-col items-center py-10 text-center text-muted">
                        <ListChecks size={28} />
                        <p className="mt-3 text-sm">No test cases yet</p>
                        <p className="mt-1 text-xs max-w-[220px] leading-relaxed">
                            Add the input your program reads and the output it should print.
                        </p>
                    </div>
                )}

                {cases.map((c) => {
                    const res = results[c.id]
                    const st = STATUS[res?.status || "idle"]
                    const StatusIcon = st.icon
                    const open = openId === c.id

                    return (
                        <div key={c.id} className="rounded-xl border border-line bg-ink">
                            <button
                                onClick={() => setOpenId(open ? null : c.id)}
                                aria-expanded={open}
                                className="w-full flex items-center gap-2.5 px-3 h-11 text-left"
                            >
                                <StatusIcon size={15} className={`shrink-0 ${st.cls}`} />
                                <span className="flex-1 min-w-0 truncate text-sm text-fg">{c.name}</span>
                                <span className="shrink-0 font-mono text-[11px] text-muted">
                                    {res?.ms ? `${res.ms}ms` : st.label}
                                </span>
                                <ChevronDown
                                    size={14}
                                    className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
                                />
                            </button>

                            {open && (
                                <div className="p-3 border-t border-line space-y-3">
                                    <input
                                        value={c.name}
                                        maxLength={40}
                                        onChange={(e) => patch(c.id, { name: e.target.value })}
                                        aria-label="Test case name"
                                        className="w-full min-w-0 h-9 bg-surface border border-line rounded-lg px-3 text-xs text-fg focus:outline-none focus:border-ember transition-colors"
                                    />

                                    <div>
                                        <label className="block mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                                            Input (stdin)
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={c.input}
                                            maxLength={5000}
                                            spellCheck={false}
                                            placeholder={"5\n10 20"}
                                            onChange={(e) => patch(c.id, { input: e.target.value })}
                                            className={fieldCls}
                                        />
                                    </div>

                                    <div>
                                        <label className="block mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                                            Expected output
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={c.expected}
                                            maxLength={5000}
                                            spellCheck={false}
                                            placeholder="30"
                                            onChange={(e) => patch(c.id, { expected: e.target.value })}
                                            className={fieldCls}
                                        />
                                    </div>

                                    {res && res.status !== "running" && res.status !== "pass" && (
                                        <div className="space-y-2">
                                            {res.status === "fail" && (
                                                <OutputBlock label="Expected" text={c.expected} />
                                            )}
                                            <OutputBlock
                                                label={res.status === "fail" ? "Got" : "Output"}
                                                text={res.actual ?? ""}
                                                tone={res.status === "fail" ? "red" : "muted"}
                                            />
                                            {res.stderr && (
                                                <OutputBlock label="stderr" text={res.stderr} tone="red" />
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => runCases([c])}
                                            disabled={running}
                                            className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-line text-fg text-xs font-medium hover:border-ember/50 hover:text-ember disabled:opacity-40 transition-colors"
                                        >
                                            <Play size={12} fill="currentColor" />
                                            Run this case
                                        </button>
                                        <button
                                            onClick={() => removeCase(c.id)}
                                            disabled={running}
                                            aria-label="Delete test case"
                                            className="ml-auto h-8 w-8 flex items-center justify-center rounded-lg border border-line text-muted hover:text-red-400 hover:border-red-500/40 disabled:opacity-40 transition-colors"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}

                <button
                    onClick={addCase}
                    disabled={running}
                    className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-line text-xs text-muted hover:text-fg hover:border-muted disabled:opacity-40 transition-colors"
                >
                    <Plus size={14} />
                    Add test case
                </button>

                <p className="pt-1 text-[11px] text-muted leading-relaxed">
                    Test cases are saved in this browser and aren't shared with collaborators.
                    Output is compared ignoring trailing spaces and blank lines.
                </p>
            </div>
        </div>
    )
}