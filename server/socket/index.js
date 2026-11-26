const { setupGroupMusicHandlers, handleUserDisconnect } = require("./groupMusic")
const { setupOnlineHandlers } = require("./online")
const { registry, setIO } = require("./registry")

const socketManager = (io) => {
  setIO(io)
  const userSockets = new Map()
  const onlineUsers = registry.onlineUsers

  const context = {
    userSockets,
    onlineUsers,
  }

  io.on("connection", (socket) => {
    socket.on("setup", (userData) => {
      try {
        if (!userData?.userid) {
          socket.emit("socket-error", {
            message: "Invalid setup data",
            code: "SETUP_FAILED",
          })
          return
        }

        const userId = userData.userid
        socket.userId = userId
        socket.join(userId)
        userSockets.set(userId, socket)

        if (!socket.musicHandlersSetup) {
          setupGroupMusicHandlers(io, socket, userId, userSockets)
          socket.musicHandlersSetup = true
        }

        socket.emit("setup-complete")
      } catch (error) {
        console.error("Setup error:", error)
        socket.emit("socket-error", {
          message: "Setup failed",
          code: "SETUP_FAILED",
        })
      }
    })

    setupOnlineHandlers(io, socket, context)

    socket.on("disconnect", () => {
      const userId = socket.userId
      if (!userId) return

      handleUserDisconnect(io, userId, userSockets)

      userSockets.delete(userId)
      onlineUsers.delete(userId)
      io.emit("user_offline", userId)
    })
  })
}

module.exports = {
  socketManager,
}
