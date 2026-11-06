import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, ArrowRight, Users, Mic, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { roomApi } from "../services/api"
import { Navbar } from "../components/Navbar"
import { Modal } from "../components/Modal"
import { saveCases } from "../components/TestPanel"
import { PROBLEMS, buildStarter } from "../data/problems"
import { LANGUAGES, RUNNABLE_LANGUAGES, LANGUAGE_COLORS } from "../utils/constants"
import { getPreferences } from "../utils/preferences"

const DIFFICULTY_TONE = {
    Easy: "text-sync border-sync/30 bg-sync/10",
    Medium: "text-gold border-gold/30 bg-gold/10",
    Hard: "text-red-400 border-red-500/30 bg-red-500/10",
}

const FILTERS = ["All", "Easy", "Medium", "Hard"]
const PAGE_SIZE = 10

const newId = () =>
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

const Block = ({ label, lines }) => (
    <div>
        <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted">{label}</p>
        <pre className="whitespace-pre-wrap break-words rounded-lg border border-line bg-ink p-3 font-mono text-xs text-fg">
            {Array.isArray(lines) ? lines.join("\n") : lines}
        </pre>
    </div>
)

export const Problems = () => {
    const navigate = useNavigate()

    const [filter, setFilter] = useState("All")
    const [query, setQuery] = useState("")
    const [selected, setSelected] = useState(null)
    const [open, setOpen] = useState(false)
    const [language, setLanguage] = useState(() => getPreferences().defaultLanguage)
    const [busy, setBusy] = useState(null)
    const [page, setPage] = useState(1)

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase()
        return PROBLEMS.filter(
            (p) =>
                (filter === "All" || p.difficulty === filter) &&
                (!q ||
                    p.title.toLowerCase().includes(q) ||
                    p.tags.some((t) => t.toLowerCase().includes(q))),
        )
    }, [filter, query])

    useEffect(() => {
        setPage(1)
    }, [filter, query])

    const totalPages = Math.ceil(visible.length / PAGE_SIZE)

    const paginatedProblems = visible.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
    )

    const show = (problem) => {
        setSelected(problem)
        setOpen(true)
    }

    const start = async (type) => {
        if (!selected || busy) return
        setBusy(type)

        try {
            const data = await roomApi.create({ name: selected.title, language, type })
            const room = data.room

            // Practice rooms get the sample cases in the Tests panel.
            // Interview rooms don't: execution is off there and the cases would give away answers.
            if (type !== "interview") {
                saveCases(
                    room._id,
                    selected.tests.map((t) => ({ id: newId(), name: t.name, input: t.input, expected: t.expected })),
                )
            }

            navigate(`/room/${room._id}`, {
                state: { starter: buildStarter(language, selected) },
            })
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || "Could not create the room")
            setBusy(null)
        }
    }

    return (
        <div className="min-h-screen bg-ink flex flex-col">
            <Navbar />

            <main className="flex-1 w-full min-w-0 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                <header>
                    <p className="font-mono text-xs text-ember tracking-wide mb-2">● PROBLEMS</p>
                    <h1 className="font-display text-3xl sm:text-4xl font-bold text-fg">
                        Practice, or interview with a real problem
                    </h1>
                    <p className="mt-2 text-sm text-muted max-w-xl">
                        Pick a problem and a language. We create the room, add the starter code,
                        and load the sample test cases.
                    </p>
                </header>

                <div className="mt-8 mb-5 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div className="relative md:w-72">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search problems or tags"
                            aria-label="Search problems"
                            className="w-full min-w-0 h-11 bg-ink border border-line rounded-lg pl-9 pr-3 text-sm text-fg placeholder:text-muted focus:border-ember focus:outline-none transition-colors"
                        />
                    </div>

                    <div role="tablist" className="flex p-1 bg-surface border border-line rounded-lg">
                        {FILTERS.map((f) => (
                            <button
                                key={f}
                                role="tab"
                                aria-selected={filter === f}
                                onClick={() => setFilter(f)}
                                className={`flex-1 md:flex-none px-3 h-9 rounded-md text-xs font-medium transition-colors ${filter === f ? "bg-ink text-fg" : "text-muted hover:text-fg"
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {visible.length === 0 ? (
                    <div className="border border-dashed border-line rounded-2xl py-12 text-center text-sm text-muted">
                        No problems match your search.
                    </div>
                ) : (
                    <>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {paginatedProblems.map((p) => (
                                <li key={p.id}>
                                    <button
                                        onClick={() => show(p)}
                                        className="group h-full w-full text-left rounded-2xl border border-line bg-surface p-5 hover:border-ember/40 transition-colors flex flex-col"
                                    >
                                        <div className="flex items-start gap-3">
                                            <h2 className="flex-1 min-w-0 font-display text-lg font-semibold text-fg">
                                                {p.title}
                                            </h2>
                                            <span
                                                className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_TONE[p.difficulty]}`}
                                            >
                                                {p.difficulty}
                                            </span>
                                        </div>

                                        <p className="mt-2 text-sm text-muted leading-relaxed">{p.summary}</p>

                                        <div className="mt-4 flex items-center gap-2 flex-wrap">
                                            {p.tags.map((t) => (
                                                <span
                                                    key={t}
                                                    className="font-mono text-[11px] text-muted border border-line rounded-md px-1.5 py-0.5"
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                            <ArrowRight
                                                size={16}
                                                className="ml-auto text-muted group-hover:text-ember transition-colors"
                                            />
                                        </div>
                                    </button>
                                </li>
                            ))}

                        </ul>

                        {totalPages > 1 && (
                            <nav
                                aria-label="Problem pagination"
                                className="mt-8 flex flex-wrap items-center justify-center gap-2"
                            >
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="h-9 rounded-lg border border-line px-3 text-sm text-fg hover:border-ember disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Previous
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                                    <button
                                        key={pageNumber}
                                        type="button"
                                        onClick={() => setPage(pageNumber)}
                                        aria-label={`Go to page ${pageNumber}`}
                                        aria-current={page === pageNumber ? "page" : undefined}
                                        className={`h-9 min-w-9 rounded-lg border px-3 text-sm transition-colors ${page === pageNumber
                                                ? "border-ember bg-ember text-ink"
                                                : "border-line text-fg hover:border-ember"
                                            }`}
                                    >
                                        {pageNumber}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="h-9 rounded-lg border border-line px-3 text-sm text-fg hover:border-ember disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </nav>
                        )}

                        <p className="mt-3 text-center text-xs text-muted">
                            Showing {(page - 1) * PAGE_SIZE + 1}–
                            {Math.min(page * PAGE_SIZE, visible.length)} of {visible.length} problems
                        </p>
                    </>
                )}

            </main>


            <Modal
                open={open}
                onClose={() => !busy && setOpen(false)}
                size="lg"
                title={selected?.title || ""}
                description={selected ? `${selected.difficulty} · ${selected.tags.join(", ")}` : ""}
            >
                {selected && (
                    <div className="space-y-5">
                        <div className="space-y-2 text-sm text-fg leading-relaxed">
                            {selected.statement.map((s, i) => (
                                <p key={i}>{s}</p>
                            ))}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <Block label="Input" lines={selected.input} />
                            <Block label="Output" lines={selected.output} />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <Block label="Example input" lines={selected.tests[0].input} />
                            <Block label="Example output" lines={selected.tests[0].expected} />
                        </div>

                        <div>
                            <p className="mb-2 text-xs text-muted">Language</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang}
                                        type="button"
                                        onClick={() => setLanguage(lang)}
                                        aria-pressed={language === lang}
                                        className={`flex items-center gap-2 px-3 h-10 rounded-lg border font-mono text-xs capitalize transition-colors ${language === lang
                                            ? "border-ember bg-ember/10 text-fg"
                                            : "border-line text-muted hover:border-muted"
                                            }`}
                                    >
                                        <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ background: LANGUAGE_COLORS[lang] || "#8b8f9a" }}
                                        />
                                        <span className="truncate">{lang}</span>
                                        {!RUNNABLE_LANGUAGES.includes(lang) && (
                                            <span className="ml-auto shrink-0 text-[10px] text-muted">edit only</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-1">
                            <button
                                onClick={() => start("collab")}
                                disabled={!!busy}
                                className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 disabled:opacity-60 transition"
                            >
                                {busy === "collab" ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                                Practice in a room
                            </button>
                            <button
                                onClick={() => start("interview")}
                                disabled={!!busy}
                                className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-ai/40 text-ai text-sm font-semibold hover:bg-ai/10 disabled:opacity-60 transition-colors"
                            >
                                {busy === "interview" ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
                                Use in an interview
                            </button>
                        </div>

                        <p className="text-[11px] text-muted leading-relaxed">
                            {RUNNABLE_LANGUAGES.includes(language)
                                ? `Practice rooms come with ${selected.tests.length} sample test cases in the Tests panel. Interview rooms get the starter code only.`
                                : `${language} can be edited here but can't be run on this server yet. Pick ${RUNNABLE_LANGUAGES.join(", ")} if you want to run the code and the sample tests.`}
                        </p>
                    </div>
                )}
            </Modal>
        </div>
    )
}