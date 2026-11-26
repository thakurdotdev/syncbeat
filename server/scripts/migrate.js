/**
 * Creates any missing tables and adds any missing columns. It never drops or
 * changes existing data, so it is safe to run more than once.
 *
 *   pnpm --filter syncvibe-api db:migrate
 */
require("dotenv").config()
const sequelize = require("../utils/sequelize")
const User = require("../models/auth/userModel")
const OTP = require("../models/auth/otpModel")
const LoginLog = require("../models/auth/loginLogModel")
const GroupInvite = require("../models/music/groupInviteModel")
const {
  Song,
  HistorySong,
  GroupSessionHistory,
  SongLike,
  Playlist,
  PlaylistSong,
  PlaylistShare,
} = require("../models/music")

// Parents before children so foreign keys resolve
const MODELS = [
  User,
  OTP,
  LoginLog,
  Song,
  HistorySong,
  GroupSessionHistory,
  GroupInvite,
  SongLike,
  Playlist,
  PlaylistSong,
  PlaylistShare,
]

const addMissingColumns = async (model) => {
  const qi = sequelize.getQueryInterface()
  const table = model.getTableName()
  const existing = await qi.describeTable(table)

  for (const [name, attribute] of Object.entries(model.rawAttributes)) {
    const column = attribute.field || name
    if (existing[column]) continue
    try {
      await qi.addColumn(table, column, attribute)
      console.log(`  + ${table}.${column}`)
    } catch (err) {
      console.warn(`  ! could not add ${table}.${column}: ${err.message}`)
    }
  }
}

const run = async () => {
  await sequelize.authenticate()
  console.log("Connected. Syncing tables...")

  for (const model of MODELS) {
    await model.sync() // CREATE TABLE IF NOT EXISTS
    await addMissingColumns(model)
    console.log(`✓ ${model.getTableName()}`)
  }

  console.log("Done.")
  await sequelize.close()
}

run().catch(async (err) => {
  console.error("Migration failed:", err)
  await sequelize.close()
  process.exit(1)
})
