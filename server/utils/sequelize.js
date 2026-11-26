const { configDotenv } = require("dotenv")
const { Sequelize } = require("sequelize")

configDotenv()

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  pool: {
    max: 5,
    min: 0,
    idle: 30000,
  },
  // Set DB_SSL=false for a local Postgres without SSL (hosted databases keep SSL on)
  dialectOptions:
    process.env.DB_SSL === "false"
      ? {}
      : {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        },
})

module.exports = sequelize
