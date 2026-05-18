import { redisPub } from "../config/redis.js"

const roomAwareness = new Map()

export const setupAwarenessSocket = (io, socket) => {

  // awareness update
  socket.on("awareness-update", async ({ roomId, awarenessState }) => {
    try {
      if (!roomId || !awarenessState?.user) return

      console.log(
        `[awareness] ${socket.username} updated in room ${roomId}`
      )

      // create room map if not exists
      if (!roomAwareness.has(roomId)) {
        roomAwareness.set(roomId, new Map())
      }

      const roomMap = roomAwareness.get(roomId)

      // save user awareness
      roomMap.set(socket.id, {
        username: awarenessState.user.username || socket.username,
        userId: awarenessState.user.userId || socket.userId,
      })

      // broadcast to others in room
      socket.to(roomId).emit("awareness-update", {
        socketId: socket.id,
        awarenessState,
      })

      // send existing users to newly updated user
      for (const [sid, state] of roomMap.entries()) {
        if (sid === socket.id) continue

        socket.emit("awareness-update", {
          socketId: sid,
          awarenessState: {
            user: state,
          },
        })
      }

      // publish to redis for multi-server sync
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

  // disconnect handler
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

    // notify room
    socket.to(roomId).emit("user-left", {
      socketId: socket.id,
      username: socket.username,
    })

    console.log(
      `[awareness] ${socket.username || socket.id} left room ${roomId}`
    )
  })
}