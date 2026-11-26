const express = require("express")
const rateLimit = require("express-rate-limit")
const { adminLogin } = require("../controllers/userController")
const authMiddleware = require("../middleware/authMiddleware")
const adminMiddleware = require("../middleware/adminMiddleware")
const { asyncHandler } = require("../utils/http")
const admin = require("../controllers/adminController")

const adminRoutes = express.Router()

// Separate admin sign-in (declared before the auth guard below). Failed attempts are limited to slow down guessing.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true, // only failed attempts count towards the limit
  message: { message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
})
adminRoutes.post("/login", adminLoginLimiter, adminLogin)

// Every other admin route needs a logged-in user with role "admin"
adminRoutes.use(authMiddleware, adminMiddleware)

adminRoutes.get("/stats", asyncHandler(admin.getStats))

adminRoutes.get("/users", asyncHandler(admin.listUsers))
adminRoutes.get("/users/:id", asyncHandler(admin.getUser))
adminRoutes.patch("/users/:id", asyncHandler(admin.updateUser))

adminRoutes.get("/songs", asyncHandler(admin.listSongs))
adminRoutes.post("/songs", asyncHandler(admin.createSong))
adminRoutes.put("/songs/:id", asyncHandler(admin.updateSong))
adminRoutes.patch("/songs/:id/visibility", asyncHandler(admin.setSongVisibility))
adminRoutes.delete("/songs/:id", asyncHandler(admin.deleteSong))

adminRoutes.get("/playlists", asyncHandler(admin.listPlaylists))
adminRoutes.get("/playlists/:id", asyncHandler(admin.getPlaylist))
adminRoutes.patch("/playlists/:id", asyncHandler(admin.updatePlaylist))
adminRoutes.delete("/playlists/:id", asyncHandler(admin.deletePlaylist))
adminRoutes.delete("/playlists/:id/songs/:songRefId", asyncHandler(admin.removePlaylistSong))

module.exports = adminRoutes
