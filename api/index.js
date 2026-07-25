require("pg")

const http = require("node:http")
const { Server } = require("socket.io")
const app = require("../server/app")
const sequelize = require("../server/utils/sequelize")
const { socketManager } = require("../server/socket")

const server = http.createServer(app)

const io = new Server(server, {
  pingTimeout: 30000,
  pingInterval: 10000,
  connectTimeout: 20000,
  maxHttpBufferSize: 2e6,
  transports: ["websocket", "polling"],
  cors: {
    origin: true,
    credentials: true,
  },
})

socketManager(io)

let isDbConnected = false
app.use(async (req, res, next) => {
  if (!isDbConnected) {
    try {
      await sequelize.authenticate()
      isDbConnected = true
    } catch (err) {
      console.error("Database connection failure:", err)
    }
  }
  next()
})

module.exports = server
