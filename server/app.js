const express = require("express")
const cookieParser = require("cookie-parser")
const timeout = require("connect-timeout")
const cors = require("cors")

const userRouter = require("./routes/userRoutes")
const musicRoutes = require("./routes/musicRoutes")
const songRoutes = require("./routes/songRoutes")
const playlistRoutes = require("./routes/playlistRoutes")
const adminRoutes = require("./routes/adminRoutes")
const authMiddleware = require("./middleware/authMiddleware")
const { asyncHandler } = require("./utils/http")
const { getMyDashboard } = require("./controllers/dashboardController")

const app = express()

app.set("trust proxy", 1)

app.use(timeout("30s"))

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)

app.use(cookieParser())

app.use(express.json())

app.use(express.urlencoded({ extended: true }))

app.get("/health", (_, res) => res.json({ status: "ok" }))

app.use("/api", userRouter, musicRoutes)
app.use("/api/songs", songRoutes)
app.use("/api/playlists", playlistRoutes)
app.use("/api/admin", adminRoutes)
app.get("/api/dashboard", authMiddleware, asyncHandler(getMyDashboard))

app.use((err, req, res, next) => {
  if (req.timedout) {
    return res.status(408).json({ message: "Request timeout" })
  }

  const status = err.statusCode || 500
  if (status >= 500) console.error(err)

  // 4xx messages are meant for the user (validation, not found, ...), so always send them
  res.status(status).json({
    message:
      status < 500 || process.env.NODE_ENV !== "production" ? err.message : "Internal server error",
  })
})

module.exports = app
