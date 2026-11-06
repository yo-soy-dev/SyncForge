import test from "node:test"
import assert from "node:assert/strict"
import { createCallClient } from "../services/callClient.js"
import { callReducer, initialCallState, parseIceServers, DEFAULT_ICE_SERVERS } from "../utils/callState.js"

const tick = () => new Promise((r) => setImmediate(r))
const makeTrack = (kind) => ({ kind, enabled: true, stopped: false, stop() { this.stopped = true } })
const makeStream = (kinds) => { const tracks = kinds.map(makeTrack); return { tracks, getTracks: () => tracks } }

const makeSocket = (replies) => {
  const handlers = {}
  const sent = []
  return {
    sent,
    on: (ev, fn) => { handlers[ev] = fn },
    off: (ev) => { delete handlers[ev] },
    emit: (ev, payload, cb) => { sent.push({ ev, payload }); if (cb && replies[ev]) cb(replies[ev]) },
    fire: (ev, data) => handlers[ev]?.(data),
  }
}

const makeSender = (track = null) => { const s = { track, replaceTrack: async (t) => { s.track = t } }; return s }

const makePc = () => {
  const pc = {
    tx: [], offers: [], closed: false, localDescription: null, remoteDescription: null,
    get senders() { return pc.tx.map((t) => t.sender) },
    get transceivers() { return pc.tx },
    createOffer: async (opts) => { pc.offers.push(opts || {}); return { type: "offer", sdp: "offer-sdp" } },
    createAnswer: async () => ({ type: "answer", sdp: "answer-sdp" }),
    setLocalDescription: async (d) => { pc.localDescription = d },
    // like a browser: a remote offer creates a receive-only transceiver per m-line
    setRemoteDescription: async (d) => {
      pc.remoteDescription = d
      if (d.type === "offer" && pc.tx.length === 0) {
        for (const kind of ["audio", "video"]) pc.tx.push({ kind, direction: "recvonly", sender: makeSender(), receiver: { track: { kind } } })
      }
    },
    addIceCandidate: async () => {},
    // like a browser: addTrack reuses a free transceiver of that kind
    addTrack: (track) => {
      const free = pc.tx.find((t) => t.receiver.track.kind === track.kind && !t.sender.track)
      if (free) { free.sender.track = track; free.direction = "sendrecv"; return free.sender }
      const t = { kind: track.kind, direction: "sendrecv", sender: makeSender(track), receiver: { track: { kind: track.kind } } }
      pc.tx.push(t)
      return t.sender
    },
    addTransceiver: (kind, init = {}) => { pc.tx.push({ kind, direction: init.direction, sender: makeSender(), receiver: { track: { kind } } }) },
    getSenders: () => pc.tx.map((t) => t.sender),
    getTransceivers: () => pc.tx,
    close: () => { pc.closed = true },
  }
  return pc
}

const streamOf = (tracks) => ({
  tracks,
  getTracks: () => tracks,
  getVideoTracks: () => tracks.filter((t) => t.kind === "video"),
  getAudioTracks: () => tracks.filter((t) => t.kind === "audio"),
})

const setup = ({ you = publisher, peers = [], media, display, screenReply = { ok: true } } = {}) => {
  const socket = makeSocket({
    "call-join": { ok: true, you, peers, iceServers: [{ urls: "stun:x" }] },
    "call-screen-start": screenReply,
  })
  const events = [], pcs = [], streams = [], displays = []
  const client = createCallClient({
    socket, iceServers: [], onEvent: (e) => events.push(e),
    createPeerConnection: () => { const pc = makePc(); pcs.push(pc); return pc },
    getUserMedia: media || (async () => { const s = makeStream(["audio", "video"]); streams.push(s); return s }),
    getDisplayMedia: display || (async () => { const s = makeStream(["video"]); displays.push(s); return s }),
    createStream: streamOf,
  })
  return { socket, events, pcs, streams, displays, client }
}

const signals = (socket, type) => socket.sent.filter((m) => m.ev === "call-signal" && m.payload.data.type === type)

test("the joiner sends one offer to each publisher already in the call", async () => {
  const { socket, pcs, client } = setup({ peers: [alice] })
  await client.join()
  const offers = signals(socket, "offer")
  assert.equal(offers.length, 1)
  assert.equal(offers[0].payload.to, "A")
  assert.equal(pcs[0].senders.length, 2)
})

test("two non-publishers never connect to each other", async () => {
  const { socket, pcs, client } = setup({ you: watcher, peers: [olga] })
  await client.join()
  assert.equal(pcs.length, 0)
  assert.equal(signals(socket, "offer").length, 0)
})

test("a newcomer's offer is answered, and a re-offer does not add our tracks twice", async () => {
  const { socket, pcs, client } = setup()
  await client.join()
  socket.fire("call-peer-joined", alice)
  await socket.fire("call-signal", { from: "A", data: { type: "offer", sdp: "x" } })
  assert.equal(signals(socket, "answer").length, 1)
  assert.equal(pcs[0].senders.length, 2)
  await socket.fire("call-signal", { from: "A", data: { type: "offer", sdp: "y" } })
  assert.equal(pcs[0].senders.length, 2)
})

test("only the side that made the offer restarts ICE", async () => {
  const offerer = setup({ peers: [alice] })
  await offerer.client.join()
  offerer.pcs[0].connectionState = "failed"
  offerer.pcs[0].onconnectionstatechange()
  await tick()
  assert.ok(offerer.pcs[0].offers.some((o) => o.iceRestart))

  const answerer = setup()
  await answerer.client.join()
  answerer.socket.fire("call-peer-joined", alice)
  await answerer.socket.fire("call-signal", { from: "A", data: { type: "offer", sdp: "x" } })
  answerer.pcs[0].connectionState = "failed"
  answerer.pcs[0].onconnectionstatechange()
  await tick()
  assert.equal(answerer.pcs[0].offers.length, 0)
})

test("a missing camera falls back to audio only, and we still receive video", async () => {
  const media = async (c) => {
    if (c.video) throw Object.assign(new Error("no camera"), { name: "NotFoundError" })
    return makeStream(["audio"])
  }
  const { events, pcs, client } = setup({ peers: [alice], media })
  await client.join()
  assert.ok(events.some((e) => e.type === "notice" && /audio only/i.test(e.message)))
  assert.ok(pcs[0].transceivers.some((t) => t.kind === "video" && t.direction === "recvonly"))
})

test("blocked permissions give a clear message and join as a listener", async () => {
  const media = async () => { throw Object.assign(new Error("denied"), { name: "NotAllowedError" }) }
  const { events, client } = setup({ peers: [alice], media })
  await client.join()
  assert.ok(events.some((e) => e.type === "notice" && /blocked/i.test(e.message) && /listener/i.test(e.message)))
})

test("leaving stops the camera and tells the server", async () => {
  const { socket, streams, client } = setup({ peers: [alice] })
  await client.join()
  client.leave()
  assert.ok(streams[0].tracks.every((t) => t.stopped))
  assert.ok(socket.sent.some((m) => m.ev === "call-leave"))
})

test("the server closing the call ends it locally and releases the camera", async () => {
  const { socket, events, pcs, streams, client } = setup({ peers: [alice] })
  await client.join()
  socket.fire("call-error", { code: "CALL_CLOSED", message: "The interview has ended" })
  assert.ok(events.some((e) => e.type === "error" && e.code === "CALL_CLOSED"))
  assert.ok(pcs.every((pc) => pc.closed))
  assert.ok(streams[0].tracks.every((t) => t.stopped))
})

test("ICE servers sent by the server are used", async () => {
  const seen = []
  const socket = makeSocket({ ok: true, you: publisher, peers: [alice], iceServers: [{ urls: "turn:t", username: "u", credential: "c" }] })
  const client = createCallClient({
    socket, iceServers: [], onEvent: () => { },
    createPeerConnection: (config) => { seen.push(config); return makePc() },
    getUserMedia: async () => makeStream(["audio", "video"]),
  })
  await client.join()
  assert.equal(seen[0].iceServers[0].urls, "turn:t")
})

test("reducer and ICE fallback", () => {
  const joined = callReducer(initialCallState, { type: "joined", you: publisher, peers: [alice] })
  assert.equal(joined.status, "joined")
  assert.ok(joined.peers.A)
  assert.equal(callReducer(joined, { type: "peer-removed", socketId: "A" }).peers.A, undefined)
  assert.deepEqual(parseIceServers("not json"), DEFAULT_ICE_SERVERS)
})


test("camera off stops the track and sends nothing, so the light goes out", async () => {
  const { events, pcs, streams, client } = setup({ peers: [alice] })
  await client.join()
  await client.setMuted({ video: true })

  assert.equal(streams[0].tracks.find((t) => t.kind === "video").stopped, true)
  assert.equal(pcs[0].tx.find((t) => t.receiver.track.kind === "video").sender.track, null)
  assert.ok(events.some((e) => e.type === "local-muted" && e.video === true))
  assert.ok(events.some((e) => e.type === "local-capabilities" && e.camera === true))
})

test("camera on again gets a fresh track into every connection", async () => {
  const { events, pcs, client } = setup({ peers: [alice] })
  await client.join()
  await client.setMuted({ video: true })
  await client.setMuted({ video: false })

  const sender = pcs[0].tx.find((t) => t.receiver.track.kind === "video").sender
  assert.equal(sender.track.kind, "video")
  assert.equal(sender.track.stopped, false)
  const last = events.filter((e) => e.type === "local-stream").at(-1)
  assert.ok(last.stream.getTracks().some((t) => t.kind === "video"))
})

test("switching the microphone replaces the audio track, keeps mute, and stops the old one", async () => {
  const { pcs, streams, client } = setup({ peers: [alice] })
  await client.join()
  await client.setMuted({ audio: true })
  const oldAudio = streams[0].tracks.find((t) => t.kind === "audio")

  await client.switchDevice("audio", "mic-2")

  assert.equal(oldAudio.stopped, true)
  const sender = pcs[0].tx.find((t) => t.receiver.track.kind === "audio").sender
  assert.notEqual(sender.track, oldAudio)
  assert.equal(sender.track.enabled, false) // still muted
})


const videoSender = (pc) => pc.tx.find((t) => t.receiver.track.kind === "video").sender
const sharerSetup = async (opts) => { const s = setup({ peers: [alice], ...opts }); await s.client.join(); return s }
const noCamera = async (c) => {
  if (c.video) throw Object.assign(new Error("no camera"), { name: "NotFoundError" })
  return makeStream(["audio"])
}

test("publishers keep video two-way even with no camera; observers stay receive-only", async () => {
  const a = await sharerSetup({ media: noCamera })
  assert.ok(a.pcs[0].tx.some((t) => t.kind === "video" && t.direction === "sendrecv"))

  const o = setup({ you: watcher, peers: [alice] })
  await o.client.join()
  assert.ok(o.pcs[0].tx.every((t) => t.direction === "recvonly"))
})

test("an answerer with no camera still opens its video to send", async () => {
  const { socket, pcs, client } = setup({ media: noCamera })
  await client.join()
  socket.fire("call-peer-joined", alice)
  await socket.fire("call-signal", { from: "A", data: { type: "offer", sdp: "x" } })
  assert.equal(pcs[0].tx.find((t) => t.kind === "video").direction, "sendrecv")
})

test("sharing swaps the screen in, turns the camera off, and tells the server", async () => {
  const { socket, pcs, streams, displays, events, client } = await sharerSetup()
  assert.equal(await client.startScreen(), true)
  assert.equal(videoSender(pcs[0]).track, displays[0].tracks[0])
  assert.equal(streams[0].tracks.find((t) => t.kind === "video").stopped, true)
  assert.ok(socket.sent.some((m) => m.ev === "call-screen-start"))
  assert.ok(events.some((e) => e.type === "local-screen" && e.sharing === true))
})

test("stopping restores the camera and tells the server", async () => {
  const { socket, pcs, displays, events, client } = await sharerSetup()
  await client.startScreen()
  await client.stopScreen()

  const track = videoSender(pcs[0]).track
  assert.equal(track.kind, "video")
  assert.notEqual(track, displays[0].tracks[0])
  assert.equal(track.stopped, false)
  assert.equal(displays[0].tracks[0].stopped, true)
  assert.ok(socket.sent.some((m) => m.ev === "call-screen-stop"))
  assert.ok(events.some((e) => e.type === "local-screen" && e.sharing === false))
})

test("the browser's own Stop sharing button ends the share", async () => {
  const { socket, displays, client } = await sharerSetup()
  await client.startScreen()
  displays[0].tracks[0].onended()
  await tick(); await tick()
  assert.ok(socket.sent.some((m) => m.ev === "call-screen-stop"))
})

test("the camera button does nothing while sharing", async () => {
  const { pcs, displays, events, client } = await sharerSetup()
  await client.startScreen()
  await client.setMuted({ video: false })
  assert.equal(videoSender(pcs[0]).track, displays[0].tracks[0])
  assert.ok(events.some((e) => e.type === "notice" && /stop sharing/i.test(e.message)))
})

test("a busy slot is refused and the picked screen is released", async () => {
  const { displays, events, client } = await sharerSetup({
    screenReply: { ok: false, code: "SCREEN_BUSY", message: "Someone else is already sharing their screen" },
  })
  assert.equal(await client.startScreen(), false)
  assert.equal(displays[0].tracks[0].stopped, true)
  assert.ok(events.some((e) => e.type === "notice" && /already sharing/i.test(e.message)))
})

test("cancelling the picker is silent", async () => {
  const display = async () => { throw Object.assign(new Error("cancelled"), { name: "NotAllowedError" }) }
  const { events, client } = await sharerSetup({ display })
  assert.equal(await client.startScreen(), false)
  assert.ok(!events.some((e) => e.type === "notice" && /screen/i.test(e.message)))
})

test("someone who joins while we share receives the screen", async () => {
  const { socket, pcs, displays, client } = setup()
  await client.join()
  await client.startScreen()
  socket.fire("call-peer-joined", alice)
  await socket.fire("call-signal", { from: "A", data: { type: "offer", sdp: "x" } })
  assert.equal(videoSender(pcs[0]).track, displays[0].tracks[0])
})

test("leaving while sharing releases the screen", async () => {
  const { displays, client } = await sharerSetup()
  await client.startScreen()
  client.leave()
  assert.equal(displays[0].tracks[0].stopped, true)
})

test("screen-state reaches the UI, and loose tracks are combined into one stream per person", async () => {
  const { socket, pcs, events } = await sharerSetup()
  socket.fire("call-screen-state", { socketId: "A", sharing: true })
  assert.ok(events.some((e) => e.type === "screen-state" && e.socketId === "A" && e.sharing === true))

  pcs[0].ontrack({ track: { kind: "audio" }, streams: [] })
  pcs[0].ontrack({ track: { kind: "video" }, streams: [] })
  const last = events.filter((e) => e.type === "peer-stream").at(-1)
  assert.deepEqual(last.stream.getTracks().map((t) => t.kind), ["audio", "video"])
})

test("reducer: who is sharing", () => {
  let s = callReducer(initialCallState, { type: "joined", you: publisher, peers: [alice] })
  s = callReducer(s, { type: "screen-state", socketId: "A", sharing: true })
  assert.equal(s.sharingId, "A")
  assert.equal(s.peers.A.sharing, true)
  assert.equal(callReducer(s, { type: "peer-removed", socketId: "A" }).sharingId, null)
  assert.equal(callReducer(s, { type: "screen-state", socketId: "A", sharing: false }).sharingId, null)
  assert.equal(callReducer(initialCallState, { type: "local-screen", sharing: true }).screenSharing, true)
})