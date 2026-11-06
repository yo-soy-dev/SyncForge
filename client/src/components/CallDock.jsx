import { peerList } from "../utils/callState"
import { getDevicePrefs } from "../hooks/useMediaDevices"
import { VideoTile } from "./VideoTile"
import { CallControls } from "./CallControls"

export const CallDock = ({ state, onMute, onLeave, onOpen, onShareScreen, onStopShare }) => {
  if (state.status !== "joined") return null

  const peers = peerList(state)
  const sharer = peers.find((p) => p.socketId === state.sharingId)
  const others = peers.filter((p) => p !== sharer)
  const sinkId = getDevicePrefs().speakerId

  return (
    <div className="absolute bottom-3 right-3 z-20 w-[min(92vw,264px)] space-y-2 rounded-2xl border border-line bg-ink/95 p-2 shadow-2xl backdrop-blur">
      {state.screenSharing && (
        <div className="flex items-center gap-2 rounded-lg border border-sync/30 bg-sync/10 px-2 py-1.5 text-[11px] text-sync">
          <span className="flex-1">Sharing your screen</span>
          <button onClick={onStopShare} className="underline underline-offset-2 hover:text-fg">Stop</button>
        </div>
      )}

      {sharer && (
        <VideoTile compact screen stream={sharer.stream} name={sharer.username} mic={sharer.audio !== false} cam sinkId={sinkId} />
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <VideoTile
          compact
          self
          stream={state.localStream}
          name="You"
          mic={!state.muted.audio}
          cam={!state.muted.video && !!state.localStream?.getVideoTracks().length}
        />
        {others.map((p, i) => (
          <div key={p.socketId} className={i < 3 ? "" : "hidden"}>
            <VideoTile
              compact
              stream={p.publish ? p.stream : null}
              name={p.username}
              mic={p.publish ? p.audio !== false : true}
              cam={p.publish ? p.video !== false : false}
              sinkId={sinkId}
            />
          </div>
        ))}
      </div>

      {others.length > 3 && <p className="text-center text-[10px] text-muted">+{others.length - 3} more in the panel</p>}
      {peers.length === 0 && <p className="text-center text-[11px] text-muted">Waiting for others...</p>}

      <CallControls
        compact
        state={state}
        onMute={onMute}
        onLeave={onLeave}
        onExpand={onOpen}
        onShare={onShareScreen}
        onStopShare={onStopShare}
      />
    </div>
  )
}