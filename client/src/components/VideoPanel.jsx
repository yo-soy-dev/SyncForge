import { useEffect, useState } from "react"
import { Video, Loader2, SlidersHorizontal, ScreenShare } from "lucide-react"
import { peerList } from "../utils/callState"
import { useMediaDevices, useMediaPreview } from "../hooks/useMediaDevices"
import { VideoTile } from "./VideoTile"
import { CallControls } from "./CallControls"

const SUPPORTS_SPEAKER = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype

const connectionNote = (c) =>
  c === "failed" ? "can't connect" : c === "disconnected" ? "reconnecting..." : c === "connecting" || c === "new" ? "connecting..." : null

const Banner = ({ tone, children }) => (
  <div
    className={`rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${tone === "red" ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-gold/30 bg-gold/10 text-gold"
      }`}
  >
    {children}
  </div>
)

const DeviceSelect = ({ label, value, options, fallback, onChange }) => (
  <label className="block">
    <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-muted">{label}</span>
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 bg-ink border border-line rounded-lg px-2 text-xs text-fg focus:border-ember focus:outline-none transition-colors"
    >
      <option value="">System default</option>
      {options.map((d, i) => (
        <option key={d.deviceId} value={d.deviceId}>
          {d.label || `${fallback} ${i + 1}`}
        </option>
      ))}
    </select>
  </label>
)

const DeviceFields = ({ devices, prefs, onChange }) => (
  <div className="space-y-3">
    <DeviceSelect label="Microphone" value={prefs.micId} options={devices.mics} fallback="Microphone" onChange={(v) => onChange("micId", v)} />
    <DeviceSelect label="Camera" value={prefs.camId} options={devices.cams} fallback="Camera" onChange={(v) => onChange("camId", v)} />
    {SUPPORTS_SPEAKER && (
      <DeviceSelect label="Speaker" value={prefs.speakerId} options={devices.speakers} fallback="Speaker" onChange={(v) => onChange("speakerId", v)} />
    )}
  </div>
)

export const VideoPanel = ({ state, onJoin, onLeave, onMute, onRejoin, onSwitchDevice, onShareScreen, onStopShare }) => {
  const peers = peerList(state).sort((a, b) => Number(b.socketId === state.sharingId) - Number(a.socketId === state.sharingId))
  const joined = state.status === "joined"
  const canPublish = !!state.you?.publish

  const { devices, prefs, setPref, refresh } = useMediaDevices()
  const preview = useMediaPreview({ prefs, onReady: refresh })
  const [showDevices, setShowDevices] = useState(false)

  // The preview must never keep the camera on once we are joining or in the call.
  useEffect(() => {
    if (state.status !== "idle") preview.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status])

  // Device names become readable after the first permission grant.
  useEffect(() => {
    if (joined) refresh()
  }, [joined, refresh])

  const changeBeforeJoin = (key, value) => setPref(key, value)

  const changeDuringCall = (key, value) => {
    setPref(key, value)
    if (!value) return
    if (key === "micId") onSwitchDevice?.("audio", value)
    if (key === "camId") onSwitchDevice?.("video", value)
  }

  const join = () => {
    preview.stop()
    onJoin()
  }

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-line flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 shrink-0 rounded-lg border border-sync/30 bg-sync/10 flex items-center justify-center">
          <Video size={16} className="text-sync" />
        </div>
        <h3 className="font-display text-sm font-semibold text-fg">Video call</h3>
        {joined && (
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] text-sync">
            <span className="w-1.5 h-1.5 rounded-full bg-sync animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {state.error && <Banner tone="red">{state.error.message}</Banner>}
        {state.notice && (
          <Banner tone="gold">
            <span>{state.notice}</span>
            {joined && onRejoin && (
              <button onClick={onRejoin} className="ml-2 underline underline-offset-2 hover:text-fg">
                Rejoin
              </button>
            )}
          </Banner>
        )}

        {state.status === "idle" && (
          <div className="space-y-4">
            {preview.stream ? (
              <div className="space-y-2">
                <div className="max-w-[260px]">
                  <VideoTile self stream={preview.stream} name="You" />
                </div>
                <div className="h-1.5 max-w-[260px] rounded-full bg-line overflow-hidden" aria-label="Microphone level">
                  <div className="h-full bg-sync transition-[width] duration-75" style={{ width: `${preview.level * 100}%` }} />
                </div>
                <p className="text-[11px] text-muted">Say something: the bar should move.</p>
              </div>
            ) : (
              <button
                onClick={preview.start}
                className="w-full h-10 rounded-lg border border-line text-fg text-sm font-medium hover:border-muted transition-colors"
              >
                Test camera and microphone
              </button>
            )}

            {preview.error && <Banner tone="red">{preview.error}</Banner>}

            {(devices.mics.length > 0 || devices.cams.length > 0) && (
              <DeviceFields devices={devices} prefs={prefs} onChange={changeBeforeJoin} />
            )}

            <button
              onClick={join}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-sync text-ink text-sm font-semibold hover:brightness-110 transition"
            >
              <Video size={16} />
              Join video call
            </button>

            <ul className="space-y-2 text-xs text-muted leading-relaxed">
              <li>Your browser asks for camera and microphone access, which is used only while you are in the call.</li>
              <li>Video goes directly between participants (up to 6). Coduet does not record video or audio.</li>
              <li>Turning your camera off switches the camera off completely, so its light goes out.</li>
              <li>Observers can watch and listen but not speak, and everyone in the call can see who is observing.</li>
            </ul>
          </div>
        )}

        {state.status === "joining" && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 size={15} className="animate-spin text-sync" />
            Connecting...
          </div>
        )}

        {joined && (
          <div className="space-y-3">
            {state.screenSharing && (
              <div className="flex items-center gap-2 rounded-lg border border-sync/30 bg-sync/10 px-3 py-2 text-xs text-sync">
                <ScreenShare size={14} className="shrink-0" />
                <span className="flex-1">You are sharing your screen. Everyone in the call, including observers, can see it.</span>
                <button onClick={onStopShare} className="shrink-0 underline underline-offset-2 hover:text-fg">Stop</button>
              </div>
            )}

            {peers.length === 0 ? (
              <p className="text-xs text-muted">Waiting for others to join...</p>
            ) : (
              <div className={`grid gap-2 ${peers.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {peers.map((p) => (
                  <VideoTile
                    key={p.socketId}
                    stream={p.publish ? p.stream : null}
                    name={p.username}
                    label={p.label}
                    mic={p.publish ? p.audio !== false : true}
                    cam={p.publish ? p.socketId === state.sharingId || p.video !== false : false}
                    note={p.publish ? connectionNote(p.connection) : "watching only"}
                    sinkId={prefs.speakerId}
                    screen={p.socketId === state.sharingId}
                    className={p.socketId === state.sharingId ? "col-span-2" : ""}
                  />
                ))}
              </div>
            )}

            <div className="max-w-[220px]">
              <VideoTile
                self
                stream={state.localStream}
                name="You"
                label={state.you?.label}
                mic={!state.muted.audio}
                cam={!state.muted.video && !!state.localStream?.getVideoTracks().length}
                note={canPublish ? null : "watching only"}
              />
            </div>

            {canPublish && (
              <div>
                <button
                  onClick={() => setShowDevices((s) => !s)}
                  aria-expanded={showDevices}
                  className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors"
                >
                  <SlidersHorizontal size={13} />
                  Devices
                </button>
                {showDevices && (
                  <div className="mt-3">
                    <DeviceFields devices={devices} prefs={prefs} onChange={changeDuringCall} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {joined && (
        <div className="shrink-0 border-t border-line p-3">
          <CallControls state={state} onMute={onMute} onLeave={onLeave} onShare={onShareScreen} onStopShare={onStopShare} />
        </div>
      )}
    </div>
  )
}