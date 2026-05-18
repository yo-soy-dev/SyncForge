import { redisPub } from "../config/redis.js"

const roomAwareness = new Map()

export const setupAwarenessSocket = (io, socket) => {

  socket.on("awareness-update", async ({ roomId, awarenessState }) => {
    try {
      if (!roomId || !awarenessState?.user) return

      console.log(
        `[awareness] ${socket.username} updated in room ${roomId}`
      )

      if (!roomAwareness.has(roomId)) {
        roomAwareness.set(roomId, new Map())
      }

      const roomMap = roomAwareness.get(roomId)

      roomMap.set(socket.id, {
        username: awarenessState.user.username || socket.username,
        userId: awarenessState.user.userId || socket.userId,
      })

      socket.to(roomId).emit("awareness-update", {
        socketId: socket.id,
        awarenessState,
      })

      for (const [sid, state] of roomMap.entries()) {
        if (sid === socket.id) continue

        socket.emit("awareness-update", {
          socketId: sid,
          awarenessState: {
            user: state,
          },
        })
      }

      await redisPub.publish(
        `awareness:${roomId}`,
        JSON.stringify({
          socketId: socket.id,
          awarenessState,
          username: socket.username,
        })
      )

    } catch (err) {
      console.error("[awareness] error:", err)
    }
  })

  socket.on("disconnect", () => {
    const { roomId } = socket

    if (!roomId) return

    const roomMap = roomAwareness.get(roomId)

    if (roomMap) {
      roomMap.delete(socket.id)

      if (roomMap.size === 0) {
        roomAwareness.delete(roomId)
      }
    }

    socket.to(roomId).emit("user-left", {
      socketId: socket.id,
      username: socket.username,
    })

    console.log(
      `[awareness] ${socket.username || socket.id} left room ${roomId}`
    )
  })
}