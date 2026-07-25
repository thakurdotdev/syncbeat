const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const timeout = require("connect-timeout")

const userRouter = require("./routes/userRoutes")
const musicRoutes = require("./routes/musicRoutes")

const app = express()

app.set("trust proxy", 1)

app.use(timeout("30s"))

app.use(
  cors({
    origin: (origin, cb) => {
      if (
        !origin ||
        origin === "https://syncvibe.thakur.dev" ||
        origin === "http://localhost:5173" ||
        /^https:\/\/([a-z0-9-]+\.)*thakur\.dev$/.test(origin)
      ) {
        cb(null, true)
      } else {
        cb(new Error("Blocked by CORS"))
      }
    },
    credentials: true,
  }),
)

app.use(cookieParser())

app.use(express.json())

app.use(express.urlencoded({ extended: true }))

app.get("/health", (_, res) => res.json({ status: "ok" }))

app.use("/api", userRouter, musicRoutes)

app.use((err, req, res, next) => {
  if (req.timedout) {
    return res.status(408).json({ message: "Request timeout" })
  }

  console.log(err);


  res.status(err.statusCode || 500).json({
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  })
})

module.exports = app
