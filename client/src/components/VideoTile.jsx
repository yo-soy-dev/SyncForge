import { useEffect, useRef } from "react"
import { MicOff, VideoOff, Maximize2 } from "lucide-react"

const LABEL_TONE = {
  interviewer: "text-ai border-ai/30 bg-ai/10",
  candidate: "text-sync border-sync/30 bg-sync/10",
  observer: "text-muted border-line bg-ink",
}

export const VideoTile = ({
  stream, name, label, self = false, mic = true, cam = true, note = null,
  compact = false, sinkId = "", screen = false, className = "",
}) => {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.muted = self // never play your own microphone back to yourself
    if (el.srcObject !== (stream || null)) el.srcObject = stream || null
    if (sinkId && el.setSinkId) el.setSinkId(sinkId).catch(() => {}) // Chromium only
  }, [stream, self, sinkId])

  const showVideo = !!stream && (cam || screen)
  const icon = compact ? 11 : 13

  return (
    <div className={`relative overflow-hidden rounded-xl border border-line bg-surface ${screen ? "aspect-video border-sync/40" : "aspect-video"} ${className}`}>
      {/* One <video> is always mounted (hidden when there is nothing to show) so audio keeps playing. */}
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={self}
        className={`h-full w-full ${screen ? "object-contain bg-ink" : "object-cover"} ${showVideo ? "" : "hidden"} ${self && !screen ? "-scale-x-100" : ""}`}
      />

      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`flex items-center justify-center rounded-full border border-line bg-ink font-display text-muted ${compact ? "h-8 w-8 text-sm" : "h-14 w-14 text-xl"}`}>
            {(name || "?").slice(0, 1).toUpperCase()}
          </span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-ink/70 px-2 py-1">
        <span className={`truncate font-medium text-fg ${compact ? "text-[10px]" : "text-xs"}`}>
          {self ? "You" : name}
        </span>
        {label && !compact && (
          <span className={`shrink-0 rounded-full border px-1.5 text-[10px] ${LABEL_TONE[label] || "border-line text-muted"}`}>{label}</span>
        )}
        <span className="ml-auto flex items-center gap-1">
          {!mic && <MicOff size={icon} className="text-red-400" />}
          {!cam && !screen && <VideoOff size={icon} className="text-red-400" />}
        </span>
      </div>

      {screen && (
        <>
          <span className="absolute left-1.5 top-1.5 rounded bg-sync/90 px-1.5 py-0.5 text-[10px] font-medium text-ink">Screen</span>
          <button
            onClick={() => ref.current?.requestFullscreen?.()}
            aria-label="Fullscreen"
            title="Fullscreen"
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded bg-ink/80 text-fg hover:bg-ink"
          >
            <Maximize2 size={12} />
          </button>
        </>
      )}

      {note && !screen && (
        <span className="absolute right-1.5 top-1.5 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] text-gold">{note}</span>
      )}
    </div>
  )
}