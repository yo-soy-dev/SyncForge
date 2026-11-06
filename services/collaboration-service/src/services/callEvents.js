const TIMEOUT_MS = 3000

// Best effort: the call must never depend on the timeline. Returns true only when it was stored.
export const recordCallEvent = async ({
  roomId,
  userId,
  type,
  meta = {},
  roomUrl = process.env.ROOM_SERVICE_URL,
  internalKey = process.env.INTERNAL_API_KEY,
  eventsKey = process.env.INTERNAL_EVENTS_KEY,
  fetchImpl = fetch,
}) => {
  if (!eventsKey || !roomUrl) return false // feature off
  try {
    const res = await fetchImpl(`${roomUrl}/internal/${roomId}/call-event`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-key": internalKey || "",
        "x-events-key": eventsKey,
      },
      body: JSON.stringify({ userId, type, ...meta }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return res.ok
  } catch {
    return false
  }
}