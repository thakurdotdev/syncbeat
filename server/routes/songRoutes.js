const express = require("express")
const authMiddleware = require("../middleware/authMiddleware")
const { asyncHandler } = require("../utils/http")
const song = require("../controllers/songController")

const songRoutes = express.Router()

songRoutes.use(authMiddleware)

songRoutes.get("/", asyncHandler(song.listSongs))
songRoutes.get("/recent", asyncHandler(song.getRecent))
songRoutes.get("/liked", asyncHandler(song.getLiked))
songRoutes.get("/liked-ids", asyncHandler(song.getLikedIds))
songRoutes.get("/charts", asyncHandler(song.getCharts))
songRoutes.post("/like", asyncHandler(song.toggleLike))
songRoutes.post("/played", asyncHandler(song.recordPlay))

module.exports = songRoutes
