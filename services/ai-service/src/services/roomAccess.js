// Asks room-service whether this user may edit / use AI in the room.
// Fails CLOSED: any error means no access.
export const fetchRoomAccess = async ({
  roomId,
  userId,
  roomUrl = process.env.ROOM_SERVICE_URL,
  internalKey = process.env.INTERNAL_API_KEY,
  fetchImpl = fetch,
  timeoutMs = 3000,
}) => {
  try {
    const res = await fetchImpl(`${roomUrl}/${roomId}`, {
      headers: { "x-user-id": String(userId), "x-internal-key": internalKey || "" },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.room || !data?.role) return null
    return { role: data.role, canWrite: data.canWrite === true, canUseAI: data.canUseAI === true, canAskAI: data.canAskAI === true, roomType: data.room.type || "collab" }
  } catch {
    return null
  }
}