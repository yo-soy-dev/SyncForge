import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, ScreenShare, ScreenShareOff } from "lucide-react"

const CAN_SHARE = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia // desktop browsers

export const CallControls = ({ state, onMute, onLeave, onExpand, onShare, onStopShare, compact = false }) => {
  const canPublish = !!state.you?.publish
  const hasMic = canPublish && !!state.localStream && state.localStream.getAudioTracks().length > 0
  const othersSharing = !!state.sharingId && !state.screenSharing
  const size = compact ? "h-8 w-8" : "h-10 w-10"
  const icon = compact ? 14 : 17
  const base = `${size} shrink-0 rounded-full border flex items-center justify-center transition-colors`
  const off = "border-red-500/40 bg-red-500/15 text-red-400"
  const on = "border-line bg-ink text-fg hover:border-muted"

  return (
    <div className="flex items-center gap-2">
      {hasMic && (
        <button
          onClick={() => onMute({ audio: !state.muted.audio })}
          aria-pressed={state.muted.audio}
          aria-label={state.muted.audio ? "Unmute microphone" : "Mute microphone"}
          className={`${base} ${state.muted.audio ? off : on}`}
        >
          {state.muted.audio ? <MicOff size={icon} /> : <Mic size={icon} />}
        </button>
      )}

      {canPublish && state.canCamera && (
        <button
          onClick={() => onMute({ video: !state.muted.video })}
          aria-pressed={state.muted.video}
          aria-label={state.muted.video ? "Turn camera on" : "Turn camera off"}
          className={`${base} ${state.muted.video ? off : on}`}
        >
          {state.muted.video ? <VideoOff size={icon} /> : <Video size={icon} />}
        </button>
      )}

      {canPublish && CAN_SHARE && onShare && (
        <button
          onClick={state.screenSharing ? onStopShare : onShare}
          disabled={othersSharing}
          aria-pressed={state.screenSharing}
          aria-label={state.screenSharing ? "Stop sharing your screen" : othersSharing ? "Someone else is sharing" : "Share your screen"}
          title={state.screenSharing ? "Stop sharing" : othersSharing ? "Someone else is sharing" : "Share your screen"}
          className={`${base} disabled:cursor-not-allowed disabled:opacity-40 ${state.screenSharing ? "border-sync/40 bg-sync/15 text-sync" : on}`}
        >
          {state.screenSharing ? <ScreenShareOff size={icon} /> : <ScreenShare size={icon} />}
        </button>
      )}

      {onExpand && (
        <button onClick={onExpand} aria-label="Open call panel" title="Open call panel" className={`${base} ${on}`}>
          <Maximize2 size={icon} />
        </button>
      )}

      <button
        onClick={onLeave}
        aria-label="Leave call"
        className={`${base} ml-auto border-red-500 bg-red-500 text-white hover:bg-red-400`}
      >
        <PhoneOff size={icon} />
      </button>
    </div>
  )
}