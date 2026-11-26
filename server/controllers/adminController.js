const Yup = require("yup")
const { randomUUID } = require("node:crypto")
const { QueryTypes } = require("sequelize")
const sequelize = require("../utils/sequelize")
const User = require("../models/auth/userModel")
const LoginLog = require("../models/auth/loginLogModel")
const {
  Song,
  SongLike,
  HistorySong,
  PlaylistSong,
  GroupSessionHistory,
  Playlist,
} = require("../models/music")
const { HttpError, parseId, parsePaging, likePattern } = require("../utils/http")
const { registry } = require("../socket/registry")
const { musicGroups } = require("../socket/groupMusic/state")
const { toClientSong, getTopCharts, LIKE_COUNT_SQL, PLAY_COUNT_SQL } = require("../services/songService")
const {
  PLAYLIST_SUMMARY_SQL,
  toSummary,
  getPlaylistDetail,
  notifyEditors,
  playlistSchema,
} = require("../services/playlistService")

const select = (sql, replacements = {}) =>
  sequelize.query(sql, { replacements, type: QueryTypes.SELECT })

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

/** GET /api/admin/stats — numbers for the dashboard cards and lists. */
exports.getStats = async (req, res) => {
  const onlineIds = [...registry.onlineUsers].map(Number).filter(Boolean)
  const groups = [...musicGroups.values()]

  const [[totals], topLiked, topPlayed, recentUsers, onlineUsers] = await Promise.all([
    select(`SELECT
      (SELECT COUNT(*) FROM users)::int AS "totalUsers",
      (SELECT COUNT(*) FROM users WHERE verified = true)::int AS "verifiedUsers",
      (SELECT COUNT(*) FROM users WHERE "isDeleted" = true)::int AS "bannedUsers",
      (SELECT COUNT(*) FROM users WHERE "createdAt" > NOW() - INTERVAL '7 days')::int AS "newUsers7d",
      (SELECT COUNT(*) FROM songs)::int AS "totalSongs",
      (SELECT COUNT(*) FROM songs WHERE source = 'admin')::int AS "adminSongs",
      (SELECT COUNT(*) FROM songs WHERE "isActive" = false)::int AS "hiddenSongs",
      (SELECT COUNT(*) FROM playlists)::int AS "totalPlaylists",
      (SELECT COUNT(*) FROM playlist_shares WHERE status = 'accepted')::int AS "acceptedShares",
      (SELECT COUNT(*) FROM playlist_shares WHERE status = 'pending')::int AS "pendingShares",
      (SELECT COUNT(*) FROM song_likes)::int AS "totalLikes",
      COALESCE((SELECT SUM("playedCount") FROM history_songs), 0)::int AS "totalPlays"`),
    getTopCharts({ limit: 5 }),
    select(
      `SELECT s.id AS "dbId", s."songData", s.source, s."isActive", s."createdAt",
         ${LIKE_COUNT_SQL} AS "likeCount", ${PLAY_COUNT_SQL} AS "playCount"
       FROM songs s ORDER BY "playCount" DESC, s.id DESC LIMIT 5`,
    ),
    select(
      `SELECT userid, name, username, email, profilepic, verified, "createdAt"
       FROM users ORDER BY "createdAt" DESC NULLS LAST LIMIT 5`,
    ),
    onlineIds.length
      ? select(
          `SELECT userid, name, username, profilepic FROM users WHERE userid IN (:ids) LIMIT 20`,
          { ids: onlineIds },
        )
      : [],
  ])

  res.json({
    totals: {
      ...totals,
      onlineUsers: onlineIds.length,
      activeGroups: groups.length,
      listenersInGroups: groups.reduce((sum, g) => sum + (g.members?.length || 0), 0),
    },
    onlineUsers,
    activeGroups: groups.slice(0, 10).map((g) => ({
      id: g.id,
      name: g.name,
      members: g.members?.length || 0,
      nowPlaying: g.queue?.[g.currentQueueIndex]?.song?.name || null,
    })),
    topLiked,
    topPlayed: topPlayed.filter((r) => r.playCount > 0).map(toClientSong),
    recentUsers,
  })
}

/* ------------------------------------------------------------------ */
/* Clients (users)                                                     */
/* ------------------------------------------------------------------ */

const USER_SORTS = {
  newest: `u."createdAt" DESC NULLS LAST`,
  oldest: `u."createdAt" ASC NULLS LAST`,
  name: `u.name ASC`,
  lastLogin: `u."lastLogin" DESC NULLS LAST`,
}

/** GET /api/admin/users?search=&status=all|active|banned|unverified&sort=&page= */
exports.listUsers = async (req, res) => {
  const { page, limit, offset } = parsePaging(req.query, 20)
  const where = ["1=1"]
  const replacements = { limit, offset }

  if (req.query.search?.trim()) {
    where.push(`(u.name ILIKE :q OR u.email ILIKE :q OR u.username ILIKE :q)`)
    replacements.q = likePattern(req.query.search)
  }
  if (req.query.status === "active") where.push(`u."isDeleted" = false`)
  if (req.query.status === "banned") where.push(`u."isDeleted" = true`)
  if (req.query.status === "unverified") where.push(`u.verified = false`)
  if (req.query.role === "admin") where.push(`u.role = 'admin'`)

  const whereSql = where.join(" AND ")
  const orderBy = USER_SORTS[req.query.sort] || USER_SORTS.newest

  const [users, [{ total }]] = await Promise.all([
    select(
      `SELECT u.userid, u.name, u.username, u.email, u.profilepic, u.verified, u.role,
         u."isDeleted", u."createdAt", u."lastLogin",
         (SELECT COUNT(*) FROM playlists p WHERE p."ownerId" = u.userid)::int AS "playlistCount",
         (SELECT COUNT(*) FROM song_likes l WHERE l."userId" = u.userid)::int AS "likeCount",
         COALESCE((SELECT SUM(h."playedCount") FROM history_songs h WHERE h."userId" = u.userid), 0)::int AS "playCount"
       FROM users u WHERE ${whereSql}
       ORDER BY ${orderBy} LIMIT :limit OFFSET :offset`,
      replacements,
    ),
    select(`SELECT COUNT(*)::int AS total FROM users u WHERE ${whereSql}`, replacements),
  ])

  const online = registry.onlineUsers
  res.json({
    users: users.map((u) => ({ ...u, isOnline: online.has(u.userid) })),
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}

/** GET /api/admin/users/:id — full profile for the client details page. */
exports.getUser = async (req, res) => {
  const id = parseId(req.params.id, "user id")
  const user = await User.findByPk(id, {
    attributes: [
      "userid",
      "name",
      "username",
      "email",
      "bio",
      "profilepic",
      "verified",
      "role",
      "isDeleted",
      "logintype",
      "createdAt",
      "lastLogin",
    ],
    raw: true,
  })
  if (!user) throw new HttpError(404, "User not found")

  const [loginLogs, playlists, sharedPlaylists, recentPlays, likedSongs, [counts]] =
    await Promise.all([
      LoginLog.findAll({
        where: { userid: id },
        order: [["createdAt", "DESC"]],
        limit: 10,
        raw: true,
      }),
      select(`${PLAYLIST_SUMMARY_SQL} WHERE p."ownerId" = :id ORDER BY p."updatedAt" DESC`, { id }),
      select(
        `${PLAYLIST_SUMMARY_SQL}
         WHERE EXISTS (SELECT 1 FROM playlist_shares sh WHERE sh."playlistId" = p.id
           AND sh."sharedWith" = :id AND sh.status = 'accepted')
         ORDER BY p."updatedAt" DESC`,
        { id },
      ),
      select(
        `SELECT s.id AS "dbId", s."songData", s.source, s."isActive", s."createdAt",
           h."playedCount" AS "myPlayCount", h."lastPlayedAt"
         FROM history_songs h JOIN songs s ON s.id = h."songRefId"
         WHERE h."userId" = :id ORDER BY h."lastPlayedAt" DESC LIMIT 10`,
        { id },
      ),
      select(
        `SELECT s.id AS "dbId", s."songData", s.source, s."isActive", s."createdAt"
         FROM song_likes l JOIN songs s ON s.id = l."songRefId"
         WHERE l."userId" = :id ORDER BY l."createdAt" DESC LIMIT 10`,
        { id },
      ),
      select(
        `SELECT
           (SELECT COUNT(*) FROM song_likes WHERE "userId" = :id)::int AS "likeCount",
           COALESCE((SELECT SUM("playedCount") FROM history_songs WHERE "userId" = :id), 0)::int AS "playCount",
           (SELECT COUNT(*) FROM history_songs WHERE "userId" = :id)::int AS "uniqueSongs"`,
        { id },
      ),
    ])

  res.json({
    user: { ...user, isOnline: registry.onlineUsers.has(user.userid) },
    stats: { ...counts, playlistCount: playlists.length, sharedCount: sharedPlaylists.length },
    loginLogs,
    playlists: playlists.map((p) => toSummary(p)),
    sharedPlaylists: sharedPlaylists.map((p) => toSummary(p)),
    recentPlays: recentPlays.map((r) => ({
      ...toClientSong(r),
      myPlayCount: r.myPlayCount,
      lastPlayedAt: r.lastPlayedAt,
    })),
    likedSongs: likedSongs.map(toClientSong),
  })
}

const userUpdateSchema = Yup.object({
  isDeleted: Yup.boolean(),
  role: Yup.string().oneOf(["user", "admin"]),
})

/** PATCH /api/admin/users/:id { isDeleted?, role? } — ban/unban or change role. */
exports.updateUser = async (req, res) => {
  const id = parseId(req.params.id, "user id")
  if (id === req.user.userid) throw new HttpError(400, "You cannot change your own account here")

  const data = await userUpdateSchema.validate(req.body, { stripUnknown: true })
  if (data.isDeleted === undefined && data.role === undefined) {
    throw new HttpError(400, "Nothing to update")
  }

  const user = await User.findByPk(id)
  if (!user) throw new HttpError(404, "User not found")

  await user.update(data)
  res.json({
    user: {
      userid: user.userid,
      name: user.name,
      role: user.role,
      isDeleted: user.isDeleted,
    },
  })
}

/* ------------------------------------------------------------------ */
/* Music (CRUD, link based)                                            */
/* ------------------------------------------------------------------ */

const httpUrl = (label) =>
  Yup.string()
    .trim()
    .required(`${label} is required`)
    .max(1000, `${label} is too long`)
    .url(`${label} must be a valid URL`)
    .matches(/^https?:\/\//i, `${label} must start with http:// or https://`)

const songSchema = Yup.object({
  name: Yup.string().trim().required("Song name is required").max(200, "Song name is too long"),
  artists: Yup.string()
    .trim()
    .required("Artist is required")
    .max(300, "Artist names are too long"),
  album: Yup.string().trim().max(200, "Album name is too long").nullable().default(""),
  language: Yup.string().trim().max(50, "Language is too long").nullable().default("unknown"),
  duration: Yup.number()
    .transform((value, original) => (original === "" || original === null ? 0 : value))
    .integer("Duration must be whole seconds")
    .min(0, "Duration cannot be negative")
    .max(60 * 60 * 3, "Duration is too long")
    .default(0),
  audioUrl: httpUrl("Audio link"),
  coverUrl: httpUrl("Cover image link"),
})

const SONG_SORTS = {
  newest: `s."createdAt" DESC`,
  name: `s.name ASC`,
  likes: `"likeCount" DESC, s.id DESC`,
  plays: `"playCount" DESC, s.id DESC`,
}

/** GET /api/admin/songs?search=&source=all|admin|external&status=all|active|hidden&sort=&page= */
exports.listSongs = async (req, res) => {
  const { page, limit, offset } = parsePaging(req.query, 20)
  const where = ["1=1"]
  const replacements = { limit, offset }

  if (req.query.search?.trim()) {
    where.push(`(s.name ILIKE :q OR s."artistNames" ILIKE :q OR s."albumName" ILIKE :q)`)
    replacements.q = likePattern(req.query.search)
  }
  if (["admin", "external"].includes(req.query.source)) {
    where.push(`s.source = :source`)
    replacements.source = req.query.source
  }
  if (req.query.status === "active") where.push(`s."isActive" = true`)
  if (req.query.status === "hidden") where.push(`s."isActive" = false`)

  const whereSql = where.join(" AND ")
  const orderBy = SONG_SORTS[req.query.sort] || SONG_SORTS.newest

  const [rows, [{ total }]] = await Promise.all([
    select(
      `SELECT s.id AS "dbId", s."songData", s.source, s."isActive", s."createdAt",
         ${LIKE_COUNT_SQL} AS "likeCount", ${PLAY_COUNT_SQL} AS "playCount",
         (SELECT COUNT(*) FROM playlist_songs ps WHERE ps."songRefId" = s.id)::int AS "playlistCount"
       FROM songs s WHERE ${whereSql}
       ORDER BY ${orderBy} LIMIT :limit OFFSET :offset`,
      replacements,
    ),
    select(`SELECT COUNT(*)::int AS total FROM songs s WHERE ${whereSql}`, replacements),
  ])

  res.json({
    songs: rows.map((r) => ({ ...toClientSong(r), playlistCount: r.playlistCount })),
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}

/** Columns kept in sync with songData so search works on the indexed columns. */
const columnsFor = (data) => ({
  name: data.name,
  artistNames: data.artists,
  albumName: data.album || null,
  language: data.language || "unknown",
  duration: data.duration || 0,
})

/** POST /api/admin/songs — create a song from an audio link + cover image link. */
exports.createSong = async (req, res) => {
  const data = await songSchema.validate(req.body, { abortEarly: true, stripUnknown: true })
  const songId = `sb-${randomUUID()}`

  const song = await Song.create({
    songId,
    ...columnsFor(data),
    source: "admin",
    isActive: true,
    createdBy: req.user.userid,
    songData: Song.buildSongData({ id: songId, ...data }),
  })

  res.status(201).json({ song: toClientSong({ ...song.get({ plain: true }), dbId: song.id }) })
}

/** PUT /api/admin/songs/:id — edit details/links. Works for admin and cached songs. */
exports.updateSong = async (req, res) => {
  const id = parseId(req.params.id, "song id")
  const song = await Song.findByPk(id)
  if (!song) throw new HttpError(404, "Song not found")

  const data = await songSchema.validate(req.body, { abortEarly: true, stripUnknown: true })
  const rebuilt = Song.buildSongData({ id: song.songId, ...data })

  // Keep any extra fields from the music API (year, label, ...) and overwrite what was edited
  const songData = {
    ...song.songData,
    ...rebuilt,
    source: song.source === "admin" ? "admin" : song.songData?.source,
  }

  await song.update({ ...columnsFor(data), songData })
  res.json({ song: toClientSong({ ...song.get({ plain: true }), dbId: song.id }) })
}

/** PATCH /api/admin/songs/:id/visibility { isActive } — hide/show without deleting. */
exports.setSongVisibility = async (req, res) => {
  const id = parseId(req.params.id, "song id")
  const { isActive } = await Yup.object({ isActive: Yup.boolean().required() }).validate(req.body)
  const song = await Song.findByPk(id)
  if (!song) throw new HttpError(404, "Song not found")
  await song.update({ isActive })
  res.json({ song: toClientSong({ ...song.get({ plain: true }), dbId: song.id }) })
}

/** DELETE /api/admin/songs/:id — removes the song and everything that points to it. */
exports.deleteSong = async (req, res) => {
  const id = parseId(req.params.id, "song id")
  const song = await Song.findByPk(id)
  if (!song) throw new HttpError(404, "Song not found")

  await sequelize.transaction(async (transaction) => {
    const where = { songRefId: id }
    await SongLike.destroy({ where, transaction })
    await PlaylistSong.destroy({ where, transaction })
    await HistorySong.destroy({ where, transaction })
    await GroupSessionHistory.destroy({ where, transaction })
    await song.destroy({ transaction })
  })

  res.json({ success: true })
}

/* ------------------------------------------------------------------ */
/* Playlists                                                           */
/* ------------------------------------------------------------------ */

// Applied to the summary subquery, so plain column names are used
const PLAYLIST_SORTS = {
  popular: `"memberCount" DESC, "songCount" DESC, "updatedAt" DESC`,
  recent: `"updatedAt" DESC`,
  songs: `"songCount" DESC, "updatedAt" DESC`,
}

/** GET /api/admin/playlists?search=&sort=popular|recent|songs&page= */
exports.listPlaylists = async (req, res) => {
  const { page, limit, offset } = parsePaging(req.query, 20)
  const where = ["1=1"]
  const replacements = { limit, offset }
  if (req.query.search?.trim()) {
    where.push(`(p.name ILIKE :q OR u.name ILIKE :q)`)
    replacements.q = likePattern(req.query.search)
  }
  const whereSql = where.join(" AND ")
  const orderBy = PLAYLIST_SORTS[req.query.sort] || PLAYLIST_SORTS.popular

  const [rows, [{ total }]] = await Promise.all([
    select(
      `SELECT * FROM (${PLAYLIST_SUMMARY_SQL} WHERE ${whereSql}) p
       ORDER BY ${orderBy} LIMIT :limit OFFSET :offset`,
      replacements,
    ),
    select(
      `SELECT COUNT(*)::int AS total FROM playlists p JOIN users u ON u.userid = p."ownerId" WHERE ${whereSql}`,
      replacements,
    ),
  ])

  res.json({
    playlists: rows.map((r) => toSummary(r)),
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}

/** GET /api/admin/playlists/:id */
exports.getPlaylist = async (req, res) => {
  const id = parseId(req.params.id, "playlist id")
  res.json({ playlist: { ...(await getPlaylistDetail(id)), myRole: "admin" } })
}

/** PATCH /api/admin/playlists/:id { name, description } — admin renames any playlist. */
exports.updatePlaylist = async (req, res) => {
  const id = parseId(req.params.id, "playlist id")
  const playlist = await Playlist.findByPk(id)
  if (!playlist) throw new HttpError(404, "Playlist not found")
  const data = await playlistSchema.validate(req.body, { stripUnknown: true })
  await playlist.update(data)
  notifyEditors(playlist, null, "renamed")
  res.json({ playlist: { ...(await getPlaylistDetail(id)), myRole: "admin" } })
}

/** DELETE /api/admin/playlists/:id/songs/:songRefId — admin removes a song from any playlist. */
exports.removePlaylistSong = async (req, res) => {
  const id = parseId(req.params.id, "playlist id")
  const songRefId = parseId(req.params.songRefId, "song id")
  const playlist = await Playlist.findByPk(id)
  if (!playlist) throw new HttpError(404, "Playlist not found")
  const deleted = await PlaylistSong.destroy({ where: { playlistId: id, songRefId } })
  if (!deleted) throw new HttpError(404, "Song is not in this playlist")
  notifyEditors(playlist, null, "song-removed")
  res.json({ playlist: { ...(await getPlaylistDetail(id)), myRole: "admin" } })
}

/** DELETE /api/admin/playlists/:id */
exports.deletePlaylist = async (req, res) => {
  const id = parseId(req.params.id, "playlist id")
  const deleted = await Playlist.destroy({ where: { id } })
  if (!deleted) throw new HttpError(404, "Playlist not found")
  res.json({ success: true })
}
