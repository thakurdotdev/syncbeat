const express = require("express")
const authMiddleware = require("../middleware/authMiddleware")
const { asyncHandler } = require("../utils/http")
const playlist = require("../controllers/playlistController")

const playlistRoutes = express.Router()

playlistRoutes.use(authMiddleware)

// Share invites (declared before "/:id" so "shares" is not read as an id)
playlistRoutes.get("/shares/incoming", asyncHandler(playlist.incomingShares))
playlistRoutes.post("/shares/:shareId/:action", asyncHandler(playlist.respondToShare))

playlistRoutes.get("/", asyncHandler(playlist.listMine))
playlistRoutes.post("/", asyncHandler(playlist.create))
playlistRoutes.get("/:id", asyncHandler(playlist.getOne))
playlistRoutes.patch("/:id", asyncHandler(playlist.update))
playlistRoutes.delete("/:id", asyncHandler(playlist.remove))

playlistRoutes.post("/:id/songs", asyncHandler(playlist.addSong))
playlistRoutes.delete("/:id/songs/:songRefId", asyncHandler(playlist.removeSong))

playlistRoutes.post("/:id/share", asyncHandler(playlist.share))
playlistRoutes.delete("/:id/members/:userId", asyncHandler(playlist.removeMember))

module.exports = playlistRoutes
