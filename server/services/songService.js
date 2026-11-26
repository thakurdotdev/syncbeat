const { QueryTypes } = require("sequelize")
const sequelize = require("../utils/sequelize")
const { Song, HistorySong } = require("../models/music")
const { HttpError, likePattern } = require("../utils/http")

/**
 * Songs reach the API as full song objects (from the music API search or from our own
 * catalogue). Make sure the object is usable before we store it.
 */
const assertSongPayload = (song) => {
  if (!song || typeof song !== "object" || Array.isArray(song)) {
    throw new HttpError(400, "song is required")
  }
  if (!song.id || typeof song.id !== "string" || song.id.length > 255) {
    throw new HttpError(400, "song.id is required")
  }
  if (!song.name || typeof song.name !== "string") {
    throw new HttpError(400, "song.name is required")
  }
  if (!Array.isArray(song.download_url) || song.download_url.length === 0) {
    throw new HttpError(400, "song has no playable link")
  }
}

/** Finds or caches the song in our `songs` table and returns the DB row. */
const resolveSong = async (song) => {
  assertSongPayload(song)
  return Song.getOrCreate(song)
}

/** Adds one play to each user's listening history (powers "Recent" and play counts). */
const recordPlay = async (userIds, songRecord) => {
  const ids = [...new Set(userIds.map((id) => Number(id)).filter(Boolean))]
  await Promise.all(
    ids.map(async (userId) => {
      const [entry, created] = await HistorySong.findOrCreate({
        where: { userId, songRefId: songRecord.id },
        defaults: { playedCount: 1, lastPlayedAt: new Date() },
      })
      if (!created) {
        await entry.update({ playedCount: entry.playedCount + 1, lastPlayedAt: new Date() })
      }
    }),
  )
}

/**
 * SQL snippets for per-song stats, reused by the catalogue, charts and admin lists.
 * Plays = total plays across all users' listening history.
 */
const LIKE_COUNT_SQL = `(SELECT COUNT(*) FROM song_likes l WHERE l."songRefId" = s.id)::int`
const PLAY_COUNT_SQL = `COALESCE((SELECT SUM(h."playedCount") FROM history_songs h WHERE h."songRefId" = s.id), 0)::int`

/** Turns a DB row (songData + stats) into the object the client uses. */
const toClientSong = (row) => ({
  ...row.songData,
  dbId: row.dbId,
  source: row.source,
  isActive: row.isActive,
  likeCount: row.likeCount ?? undefined,
  playCount: row.playCount ?? undefined,
  createdAt: row.createdAt,
})

const CHART_PERIODS = {
  week: "7 days",
  month: "30 days",
  all: null,
}

/**
 * Top Charts: songs ranked by likes (then plays). With a period, only likes and
 * plays from that window count.
 */
const getTopCharts = async ({ search, period = "all", limit = 50 }) => {
  const interval = CHART_PERIODS[period] === undefined ? null : CHART_PERIODS[period]
  const likeFilter = interval ? `AND l."createdAt" > NOW() - INTERVAL '${interval}'` : ""
  const playFilter = interval ? `AND h."lastPlayedAt" > NOW() - INTERVAL '${interval}'` : ""

  const where = ['s."isActive" = true']
  const replacements = { limit }
  if (search?.trim()) {
    where.push(`(s.name ILIKE :q OR s."artistNames" ILIKE :q OR s."albumName" ILIKE :q)`)
    replacements.q = likePattern(search)
  }

  const rows = await sequelize.query(
    `SELECT * FROM (
       SELECT s.id AS "dbId", s."songData", s.source, s."isActive", s."createdAt",
         (SELECT COUNT(*) FROM song_likes l WHERE l."songRefId" = s.id ${likeFilter})::int AS "likeCount",
         COALESCE((SELECT SUM(h."playedCount") FROM history_songs h WHERE h."songRefId" = s.id ${playFilter}), 0)::int AS "playCount"
       FROM songs s
       WHERE ${where.join(" AND ")}
     ) ranked
     WHERE "likeCount" > 0 OR "playCount" > 0
     ORDER BY "likeCount" DESC, "playCount" DESC, "dbId" DESC
     LIMIT :limit`,
    { replacements, type: QueryTypes.SELECT },
  )

  return rows.map((row, index) => ({ ...toClientSong(row), rank: index + 1 }))
}

module.exports = {
  assertSongPayload,
  resolveSong,
  recordPlay,
  toClientSong,
  getTopCharts,
  LIKE_COUNT_SQL,
  PLAY_COUNT_SQL,
  CHART_PERIODS,
}
