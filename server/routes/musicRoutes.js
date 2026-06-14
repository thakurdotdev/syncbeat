const express = require("express")
const { getPlayNextSongs } = require("../services/playNextService")

const musicRoutes = express.Router()

musicRoutes.get("/play-next/:songId", async (req, res) => {
  try {
    const { songId } = req.params

    if (!songId || typeof songId !== "string") {
      return res.status(400).json({ success: false, error: "Invalid songId" })
    }

    const limitRaw = parseInt(req.query.limit, 10)
    const limit = Math.min(Math.max(limitRaw || 20, 1), 50)

    const excludeSongIds = req.query.exclude
      ? req.query.exclude.split(",").map((s) => s.trim())
      : []

    const data = await getPlayNextSongs({
      baseSongId: songId,
      limit,
      excludeSongIds,
    })
    return res.json({ success: true, data })
  } catch (error) {
    console.error("[PlayNext] Error:", error.message)
    if (res.headersSent) return
    const status = error.message.includes("not found") ? 404 : 500
    return res.status(status).json({ success: false, error: error.message })
  }
})

module.exports = musicRoutes
