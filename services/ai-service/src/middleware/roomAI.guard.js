const OBJECT_ID = /^[a-f0-9]{24}$/i

// Express middleware factory. Every AI feature is tied to a room, so the room's rules apply:
// members only, and in interview rooms only while the owner has AI switched on.
// Permission is checked BEFORE the handler (and therefore before any model call).
export const createRoomAIGuard = ({ fetchAccess }) => async (req, res, next) => {
  const userId = req.headers["x-user-id"]          // identity only from the gateway, never from the body
  if (typeof userId !== "string" || !OBJECT_ID.test(userId)) {
    return res.status(401).json({ success: false, message: "Unauthorized" })
  }
  const roomId = req.body?.roomId
  if (typeof roomId !== "string" || !OBJECT_ID.test(roomId)) {
    return res.status(400).json({ success: false, message: "roomId is required" })
  }

  const access = await fetchAccess({ roomId, userId })
  if (!access) return res.status(403).json({ success: false, message: "No access to this room" })
  if (!access.canAskAI) {
    return res.status(403).json({
      success: false,
      message: access.roomType === "interview" ? "AI assistance is turned off in this room" : "No access to this room",
    })
  }
  next()
}