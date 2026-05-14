import { redisPub, redisSub } from "../config/redis.js"


export const setupAwarenessSocket = (io, socket) => {

  socket.on("awareness-update", async ({ roomId, awarenessState }) => {
    try {
      socket.to(roomId).emit("awareness-update", {
        socketId: socket.id,
        awarenessState
      })

      await redisPub.publish(`awareness:${roomId}`, JSON.stringify({
        socketId: socket.id,
        awarenessState,
        username: socket.username
      }))
    } catch (err) {
      console.error("awareness-update error:", err)
    }
  })

  socket.on("disconnect", () => {
    const { roomId } = socket
    if (!roomId) return

    socket.to(roomId).emit("user-left", {
      socketId: socket.id,
      username: socket.username
    })
  })
}