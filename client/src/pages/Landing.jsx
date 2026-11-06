import { Link } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  Users,
  Play,
  Sparkles,
  Mic,
  History,
  ShieldCheck,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { RUNNABLE_LANGUAGES, LANGUAGE_COLORS } from "../utils/constants"
// import logo from "../assets/logo.png"
import { LogoMark } from "../components/LogoMark";

/* ---------- tiny helpers ---------- */

const TONES = {
  ember: { icon: "text-ember", box: "bg-ember/10 border-ember/30" },
  sync: { icon: "text-sync", box: "bg-sync/10 border-sync/30" },
  ai: { icon: "text-ai", box: "bg-ai/10 border-ai/30" },
  gold: { icon: "text-gold", box: "bg-gold/10 border-gold/30" },
}

const K = "text-ember"
const F = "text-sync"
const N = "text-gold"

/* each line = [[text, colorClass], ...] */
const CODE = [
  [["function ", K], ["twoSum", F], ["(nums, target) {", ""]],
  [["  const ", K], ["seen = ", ""], ["new ", K], ["Map", F], ["()", ""]],
  [["  for ", K], ["(", ""], ["let ", K], ["i = ", ""], ["0", N], ["; i < nums.length; i++) {", ""]],
  [["    const ", K], ["need = target - nums[i]", ""]],
  [["    if ", K], ["(seen.has(need)) ", ""], ["return ", K], ["[seen.get(need), i]", ""]],
  [["    seen.set(nums[i], i)", ""]],
  [["  }", ""]],
  [["}", ""]],
]

const Cursor = ({ name, bg, top, left, reduce }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ top: top[0], left: left[0] }}
    animate={reduce ? undefined : { top, left }}
    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
  >
    <span
      className={`absolute -top-4 left-0 text-[10px] leading-none px-1.5 py-1 rounded-sm font-medium whitespace-nowrap text-ink ${bg}`}
    >
      {name}
    </span>
    <span className={`block w-[2px] h-6 ${bg}`} />
  </motion.div>
)

const Feature = ({ id, icon: Icon, tone, title, children, visual, className = "" }) => {
  const t = TONES[tone]
  return (
    <div
      id={id}
      className={`rounded-2xl border border-line bg-surface p-5 sm:p-6 flex flex-col scroll-mt-24 ${className}`}
    >
      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${t.box}`}>
        <Icon size={17} className={t.icon} />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 text-sm text-muted leading-relaxed">{children}</p>
      {visual && <div className="mt-auto pt-5">{visual}</div>}
    </div>
  )
}

const ScoreRow = ({ label, score }) => (
  <div className="flex items-center gap-3 text-xs">
    <span className="w-28 shrink-0 text-muted truncate">{label}</span>
    <div className="flex gap-1 flex-1">
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className={`h-1.5 flex-1 rounded-full ${n <= score ? "bg-ai" : "bg-line"}`}
        />
      ))}
    </div>
    <span className="font-mono text-fg w-6 text-right">{score}/4</span>
  </div>
)

/* ---------- page ---------- */

export const Landing = () => {
  const { user, loading } = useAuth()
  const reduce = useReducedMotion()

  return (
    <div className="min-h-dvh bg-ink text-fg">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur">
        <div className="max-w-6xl mx-auto h-14 px-4 sm:px-6 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            {/* <img src={logo} alt="" className="w-8 h-8 object-contain" /> */}
            <LogoMark />
            <span className="font-display text-[17px] font-bold tracking-tight">
              Sync<span className="text-ember">Forge</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 ml-6 text-sm text-muted">
            <a href="#features" className="hover:text-fg transition-colors">Features</a>
            <a href="#interviews" className="hover:text-fg transition-colors">Interviews</a>
            <a href="#how" className="hover:text-fg transition-colors">How it works</a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {!loading &&
              (user ? (
                <Link
                  to="/dashboard"
                  className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 transition"
                >
                  Dashboard
                  <ArrowRight size={15} />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="h-9 px-3 sm:px-4 inline-flex items-center rounded-lg text-sm font-medium text-muted hover:text-fg transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    className="h-9 px-3 sm:px-4 inline-flex items-center rounded-lg bg-ember text-ink text-sm font-semibold hover:brightness-110 transition"
                  >
                    Get started
                  </Link>
                </>
              ))}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(var(--color-line) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "linear-gradient(to bottom, black 35%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, black 35%, transparent)",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-10 items-center">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 font-mono text-xs text-sync border border-sync/30 bg-sync/10 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sync animate-pulse" />
              Real-time coding workspace
            </p>

            <h1 className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05]">
              Code together.
              <br />
              <span className="text-ember">Interview smarter.</span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-muted max-w-xl leading-relaxed">
              Live cursors, in-browser execution and AI review in one room, plus
              a structured interview mode with scorecards and reports.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to={user ? "/dashboard" : "/signup"}
                className="h-12 px-6 inline-flex items-center justify-center gap-2 rounded-lg bg-ember text-ink font-semibold hover:brightness-110 transition"
              >
                {user ? "Open dashboard" : "Start for free"}
                <ArrowRight size={17} />
              </Link>
              <a
                href="#features"
                className="h-12 px-6 inline-flex items-center justify-center rounded-lg border border-line text-fg font-medium hover:border-muted transition-colors"
              >
                See features
              </a>
            </div>

            <p className="mt-8 font-mono text-xs text-muted">
              Built with React · Yjs · Monaco · Socket.IO
            </p>
          </div>

          {/* LIVE EDITOR MOCK */}
          <div className="min-w-0 rounded-2xl border border-line bg-surface overflow-hidden shadow-[0_30px_80px_-35px_rgba(255,106,61,0.35)]">
            <div className="flex items-center justify-between px-4 h-11 border-b border-line">
              <span className="font-mono text-xs text-fg">twoSum.js</span>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  <span className="w-6 h-6 rounded-full bg-ember text-ink text-[10px] font-bold flex items-center justify-center border-2 border-surface">A</span>
                  <span className="w-6 h-6 rounded-full bg-sync text-ink text-[10px] font-bold flex items-center justify-center border-2 border-surface">M</span>
                </div>
                <span className="font-mono text-[11px] text-sync">2 live</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="relative min-w-max p-4 pt-6 font-mono text-[12px] sm:text-[13px]">
                <div className="relative">
                  {CODE.map((line, i) => (
                    <div key={i} className="h-6 leading-6 whitespace-pre text-fg">
                      {line.map(([text, cls], j) => (
                        <span key={j} className={cls}>{text}</span>
                      ))}
                    </div>
                  ))}

                  <Cursor name="aarav" bg="bg-ember" top={[72, 72, 48, 72]} left={["23ch", "23ch", "27ch", "23ch"]} reduce={reduce} />
                  <Cursor name="meera" bg="bg-sync" top={[120, 96, 120]} left={["24ch", "20ch", "24ch"]} reduce={reduce} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2.5 border-t border-ai/20 bg-ai/10 text-ai text-xs">
              <Sparkles size={14} className="shrink-0" />
              <span className="truncate">Suggestion: return [] when no pair is found</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 scroll-mt-16">
        <p className="font-mono text-xs text-ember tracking-wide">FEATURES</p>
        <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold max-w-2xl">
          Everything a pairing session needs, nothing it doesn't.
        </h2>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-6 gap-4">
          <Feature
            icon={Users}
            tone="sync"
            title="Real-time collaboration"
            className="md:col-span-4"
            visual={
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[
                    ["A", "bg-ember"],
                    ["M", "bg-sync"],
                    ["R", "bg-ai"],
                  ].map(([l, c]) => (
                    <span key={l} className={`w-8 h-8 rounded-full ${c} text-ink text-xs font-bold flex items-center justify-center border-2 border-surface`}>
                      {l}
                    </span>
                  ))}
                </div>
                <span className="font-mono text-xs text-muted">3 editing now</span>
              </div>
            }
          >
            Conflict-free editing powered by Yjs, with live cursors and presence.
            Everyone types at once, and nothing gets overwritten.
          </Feature>

          <Feature
            icon={Play}
            tone="ember"
            title="Run code instantly"
            className="md:col-span-2"
            visual={
              <div className="flex flex-wrap gap-1.5">
                {RUNNABLE_LANGUAGES.map((l) => (
                  <span key={l} className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted border border-line rounded-md px-2 py-1 capitalize">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: LANGUAGE_COLORS[l] }} />
                    {l}
                  </span>
                ))}
              </div>
            }
          >
            Run {RUNNABLE_LANGUAGES.join(", ")} in the browser with stdin support. More languages are editable with highlighting.
          </Feature>

          <Feature
            icon={Sparkles}
            tone="ai"
            title="AI code review"
            className="md:col-span-2"
            visual={
              <div className="rounded-lg border border-ai/20 bg-ai/5 p-3 font-mono text-[11px] leading-relaxed text-ai">
                Possible O(n²) loop on line 3. Use a Map to make it O(n).
              </div>
            }
          >
            Review, explain and fix code, or just ask a question.
          </Feature>

          <Feature
            id="interviews"
            icon={Mic}
            tone="ai"
            title="Interview mode"
            className="md:col-span-4"
            visual={
              <div className="space-y-2.5 rounded-lg border border-line bg-ink p-4">
                <ScoreRow label="Problem solving" score={3} />
                <ScoreRow label="Communication" score={4} />
                <ScoreRow label="Code quality" score={3} />
                <ScoreRow label="Testing" score={2} />
              </div>
            }
          >
            Run technical interviews with observers, scorecards, a session
            timeline and an AI-drafted summary. The interviewer decides when AI
            is allowed.
          </Feature>

          <Feature
            icon={History}
            tone="gold"
            title="Snapshots and history"
            className="md:col-span-3"
            visual={
              <div className="space-y-1.5 font-mono text-[11px] text-muted">
                {["Snapshot 12 · 10:42", "Snapshot 11 · 10:31", "Snapshot 10 · 10:08"].map((s, i) => (
                  <div key={s} className="flex items-center gap-2 border border-line rounded-md px-2.5 py-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-gold" : "bg-line"}`} />
                    {s}
                  </div>
                ))}
              </div>
            }
          >
            Save the state of any session and come back to it later.
          </Feature>

          <Feature
            icon={ShieldCheck}
            tone="sync"
            title="You control access"
            className="md:col-span-3"
            visual={
              <div className="flex flex-wrap gap-2">
                {["Owner", "Collaborator", "Observer · read-only"].map((r) => (
                  <span key={r} className="text-[11px] font-medium text-sync border border-sync/30 bg-sync/10 rounded-full px-2.5 py-1">
                    {r}
                  </span>
                ))}
              </div>
            }
          >
            Decide who can type, who can only watch, and who can use AI.
          </Feature>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-y border-line bg-surface/50 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <p className="font-mono text-xs text-ember tracking-wide">HOW IT WORKS</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold">
            From idea to pairing in under a minute.
          </h2>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {[
              ["01", "Create a room", "Pick a language and choose collaboration or interview mode."],
              ["02", "Share the code", "Teammates or candidates join with a short room code."],
              ["03", "Build and review", "Edit live, run the code, ask AI, and save snapshots."],
            ].map(([n, t, d]) => (
              <div key={n} className="border-t border-line pt-5">
                <span className="font-mono text-sm text-ember">{n}</span>
                <h3 className="mt-3 font-display text-xl font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm text-muted leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="rounded-2xl border border-line bg-surface px-6 py-12 sm:py-16 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">
            Ready to <span className="text-ember">forge</span> something?
          </h2>
          <p className="mt-3 text-muted max-w-md mx-auto">
            Create your first room in seconds.
          </p>
          <Link
            to={user ? "/dashboard" : "/signup"}
            className="mt-8 h-12 px-7 inline-flex items-center gap-2 rounded-lg bg-ember text-ink font-semibold hover:brightness-110 transition"
          >
            {user ? "Open dashboard" : "Create free account"}
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <span className="font-display font-bold text-fg">
            Co<span className="text-ember">duet</span>
          </span>
          <span className="font-mono">© {new Date().getFullYear()} Coduet</span>
        </div>
      </footer>
    </div>
  )
}