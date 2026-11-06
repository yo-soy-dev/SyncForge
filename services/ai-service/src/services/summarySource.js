// Fetches the factual material for a summary from room-service. Room-service decides who may see it
// (owner only, interview ended). Fails CLOSED.
export const fetchSummarySource = async ({
  roomId,
  userId,
  roomUrl = process.env.ROOM_SERVICE_URL,
  internalKey = process.env.INTERNAL_API_KEY,
  fetchImpl = fetch,
  timeoutMs = 5000,
}) => {
  try {
    const res = await fetchImpl(`${roomUrl}/${roomId}/summary-source`, {
      headers: { "x-user-id": String(userId), "x-internal-key": internalKey || "" },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (res.ok) {
      const data = await res.json()
      return data?.source ? { source: data.source } : { error: { status: 502, message: "Could not load interview data" } }
    }
    if (res.status === 409) return { error: { status: 409, message: "The interview has not ended yet" } }
    return { error: { status: 403, message: "Only the interview owner can draft a summary" } }
  } catch {
    return { error: { status: 502, message: "Could not load interview data" } }
  }
}