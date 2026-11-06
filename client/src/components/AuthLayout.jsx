import { Link } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { Users, Sparkles, Mic, ArrowLeft } from "lucide-react"
// import logo from "../assets/logo.png"
import { LogoMark } from "./LogoMark";

const POINTS = [
  { icon: Users, color: "text-sync", text: "Live cursors and presence, powered by Yjs" },
  { icon: Sparkles, color: "text-ai", text: "AI review, explain and fix inside the editor" },
  { icon: Mic, color: "text-ai", text: "Interview mode with scorecards and reports" },
]

const Brand = () => (
  <Link to="/" className="inline-flex items-center gap-2.5">
    {/* <img src={logo} alt="" className="w-8 h-8 object-contain" /> */}
    <LogoMark />
    <span className="font-display text-[17px] font-bold tracking-tight text-fg">
      Sync<span className="text-ember">Forge</span>
    </span>
  </Link>
)

export const AuthLayout = ({ title, subtitle, footer, children }) => {
  const reduce = useReducedMotion()
  const transition = { repeat: Infinity, duration: 2.4, ease: "easeInOut" }

  return (
    <div className="min-h-dvh bg-ink grid lg:grid-cols-[1fr_1.1fr]">
      {/* BRAND PANEL (desktop only) */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 bg-surface border-r border-line overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(var(--color-line) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)",
          }}
        />

        <div className="relative">
          <Brand />
        </div>

        <div className="relative">
          <h2 className="font-display text-4xl xl:text-5xl font-extrabold leading-[1.1] text-fg max-w-md">
            Your next pairing session is{" "}
            <span className="text-ember">one room away.</span>
          </h2>

          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, color, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-muted">
                <span className="w-8 h-8 shrink-0 rounded-lg border border-line bg-ink flex items-center justify-center">
                  <Icon size={15} className={color} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* two collaborators' cursors meeting */}
        <div className="relative flex items-center gap-4">
          <div className="relative w-24 h-6">
            <motion.span
              className="absolute top-0 h-6 w-[3px] rounded-full bg-ember"
              style={{ left: "0%" }}
              animate={reduce ? undefined : { left: ["0%", "46%", "0%"] }}
              transition={transition}
            />
            <motion.span
              className="absolute top-0 h-6 w-[3px] rounded-full bg-sync"
              style={{ left: "98%" }}
              animate={reduce ? undefined : { left: ["98%", "52%", "98%"] }}
              transition={transition}
            />
          </div>
          <span className="font-mono text-xs text-muted">2 collaborators connected</span>
        </div>
      </aside>

      {/* FORM SIDE */}
      <main className="flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 sm:px-8 pt-5">
          <div className="lg:hidden">
            <Brand />
          </div>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors"
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8">
          <div className="w-full max-w-sm">
            <h1 className="font-display text-3xl font-bold text-fg">{title}</h1>
            <p className="mt-2 text-sm text-muted">{subtitle}</p>

            <div className="mt-8">{children}</div>

            <p className="mt-8 text-sm text-muted text-center">{footer}</p>
          </div>
        </div>
      </main>
    </div>
  )
}