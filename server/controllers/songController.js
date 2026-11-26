const { QueryTypes } = require("sequelize")
const sequelize = require("../utils/sequelize")
const { SongLike } = require("../models/music")
const { parsePaging, likePattern } = require("../utils/http")
const {
  resolveSong,
  recordPlay,
  toClientSong,
  getTopCharts,
  LIKE_COUNT_SQL,
  PLAY_COUNT_SQL,
  CHART_PERIODS,
} = require("../services/songService")

const SORTS = {
  latest: `s."createdAt" DESC`,
  popular: `"likeCount" DESC, "playCount" DESC, s.id DESC`,
  name: `s.name ASC`,
}

/** GET /api/songs — the "All songs" catalogue (admin songs + songs cached from searches). */
exports.listSongs = async (req, res) => {
  const { page, limit, offset } = parsePaging(req.query, 30)
  const orderBy = SORTS[req.query.sort] || SORTS.latest

  const where = ['s."isActive" = true']
  const replacements = { limit, offset }
  if (req.query.search?.trim()) {
    where.push(`(s.name ILIKE :q OR s."artistNames" ILIKE :q OR s."albumName" ILIKE :q)`)
    replacements.q = likePattern(req.query.search)
  }
  const whereSql = where.join(" AND ")

  const [rows, [{ total }]] = await Promise.all([
    sequelize.query(
      `SELECT s.id AS "dbId", s."songData", s.source, s."isActive", s."createdAt",
         ${LIKE_COUNT_SQL} AS "likeCount", ${PLAY_COUNT_SQL} AS "playCount"
       FROM songs s WHERE ${whereSql}
       ORDER BY ${orderBy} LIMIT :limit OFFSET :offset`,
      { replacements, type: QueryTypes.SELECT },
    ),
    sequelize.query(`SELECT COUNT(*)::int AS total FROM songs s WHERE ${whereSql}`, {
      replacements,
      type: QueryTypes.SELECT,
    }),
  ])

  res.json({ songs: rows.map(toClientSong), total, page, pages: Math.ceil(total / limit) })
}

/** GET /api/songs/recent — songs this user played most recently (solo or in a group). */
exports.getRecent = async (req, res) => {
  const { limit } = parsePaging(req.query, 30, 100)
  const rows = await sequelize.query(
    `SELECT s.id AS "dbId", s."songData", s.source, s."isActive", s."createdAt",
       h."playedCount" AS "myPlayCount", h."lastPlayedAt"
     FROM history_songs h JOIN songs s ON s.id = h."songRefId"
     WHERE h."userId" = :me
     ORDER BY h."lastPlayedAt" DESC LIMIT :limit`,
    { replacements: { me: req.user.userid, limit }, type: QueryTypes.SELECT },
  )
  res.json({
    songs: rows.map((row) => ({
      ...toClientSong(row),
      myPlayCount: row.myPlayCount,
      lastPlayedAt: row.lastPlayedAt,
    })),
  })
}

/** GET /api/songs/liked — this user's liked songs, newest like first. */
exports.getLiked = async (req, res) => {
  const rows = await sequelize.query(
    `SELECT s.id AS "dbId", s."songData", s.source, s."isActive", s."createdAt",
       ${LIKE_COUNT_SQL} AS "likeCount", l."createdAt" AS "likedAt"
     FROM song_likes l JOIN songs s ON s.id = l."songRefId"
     WHERE l."userId" = :me
     ORDER BY l."createdAt" DESC`,
    { replacements: { me: req.user.userid }, type: QueryTypes.SELECT },
  )
  res.json({ songs: rows.map((row) => ({ ...toClientSong(row), likedAt: row.likedAt })) })
}

/** GET /api/songs/liked-ids — external song ids the user liked (drives the heart icons). */
exports.getLikedIds = async (req, res) => {
  const rows = await sequelize.query(
    `SELECT s."songId" FROM song_likes l JOIN songs s ON s.id = l."songRefId" WHERE l."userId" = :me`,
    { replacements: { me: req.user.userid }, type: QueryTypes.SELECT },
  )
  res.json({ ids: rows.map((r) => r.songId) })
}

/** POST /api/songs/like { song } — toggles like on a song. */
exports.toggleLike = async (req, res) => {
  const songRecord = await resolveSong(req.body.song)
  const where = { userId: req.user.userid, songRefId: songRecord.id }

  const existing = await SongLike.findOne({ where })
  if (existing) {
    await existing.destroy()
  } else {
    await SongLike.findOrCreate({ where })
  }

  const likeCount = await SongLike.count({ where: { songRefId: songRecord.id } })
  res.json({ liked: !existing, likeCount, songId: songRecord.songId })
}

/** POST /api/songs/played { song } — records a play in the user's listening history. */
exports.recordPlay = async (req, res) => {
  const songRecord = await resolveSong(req.body.song)
  await recordPlay([req.user.userid], songRecord)
  res.json({ success: true })
}

/** GET /api/songs/charts?period=week|month|all&search= — Top Charts ranked by likes. */
exports.getCharts = async (req, res) => {
  const period = Object.hasOwn(CHART_PERIODS, req.query.period) ? req.query.period : "all"
  const { limit } = parsePaging(req.query, 50, 100)
  const songs = await getTopCharts({ search: req.query.search, period, limit })
  res.json({ songs, period })
}
