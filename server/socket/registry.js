/**
 * Shared socket state so REST controllers can push real-time events
 * (e.g. "playlist shared with you") and the admin dashboard can read live counts.
 */
const registry = {
  io: null,
  onlineUsers: new Set(),
}

const setIO = (io) => {
  registry.io = io
}

/** Emits to every socket of a user (sockets join a room named after their userid). */
const emitToUser = (userId, event, payload) => {
  if (!registry.io || !userId) return
  registry.io.to(Number(userId)).emit(event, payload)
}

module.exports = { registry, setIO, emitToUser }
