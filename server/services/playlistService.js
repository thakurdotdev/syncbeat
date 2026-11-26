const Yup = require("yup")
const { QueryTypes } = require("sequelize")
const sequelize = require("../utils/sequelize")
const { Playlist, PlaylistShare } = require("../models/music")
const { HttpError } = require("../utils/http")
const { emitToUser } = require("../socket/registry")

const playlistSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Playlist name is required")
    .min(1, "Playlist name is required")
    .max(100, "Playlist name must not exceed 100 characters"),
  description: Yup.string()
    .trim()
    .max(500, "Description must not exceed 500 characters")
    .nullable()
    .default(null),
})

/**
 * One SELECT that returns playlist cards: owner, song/member counts and up to four
 * cover images. Callers add their own WHERE / ORDER BY.
 */
const PLAYLIST_SUMMARY_SQL = `
  SELECT p.id, p.name, p.description, p."ownerId", p."createdAt", p."updatedAt",
    u.name AS "ownerName", u.username AS "ownerUsername", u.profilepic AS "ownerPic",
    (SELECT COUNT(*) FROM playlist_songs ps WHERE ps."playlistId" = p.id)::int AS "songCount",
    (SELECT COUNT(*) FROM playlist_shares sh WHERE sh."playlistId" = p.id AND sh.status = 'accepted')::int AS "memberCount",
    (SELECT COALESCE(json_agg(c.cover), '[]'::json) FROM (
       SELECT s."songData"->'image'->2->>'link' AS cover
       FROM playlist_songs ps JOIN songs s ON s.id = ps."songRefId"
       WHERE ps."playlistId" = p.id
       ORDER BY ps.position ASC LIMIT 4
     ) c) AS covers
  FROM playlists p
  JOIN users u ON u.userid = p."ownerId"`

const toSummary = (row, myRole) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  songCount: row.songCount,
  memberCount: row.memberCount,
  covers: (row.covers || []).filter(Boolean),
  owner: {
    userid: row.ownerId,
    name: row.ownerName,
    username: row.ownerUsername,
    profilepic: row.ownerPic,
  },
  ...(myRole ? { myRole } : {}),
})

/**
 * Who may do what with a playlist:
 *  - "owner": everything (edit, share, delete)
 *  - "editor": accepted a share — can add/remove songs and rename
 *  - null: no access
 */
const getAccess = async (playlistId, userId) => {
  const playlist = await Playlist.findByPk(playlistId)
  if (!playlist) throw new HttpError(404, "Playlist not found")

  if (playlist.ownerId === userId) return { playlist, role: "owner" }

  const share = await PlaylistShare.findOne({
    where: { playlistId, sharedWith: userId, status: "accepted" },
  })
  return { playlist, role: share ? "editor" : null }
}

const requireAccess = async (playlistId, userId, allowed = ["owner", "editor"]) => {
  const access = await getAccess(playlistId, userId)
  if (!access.role) throw new HttpError(404, "Playlist not found")
  if (!allowed.includes(access.role)) {
    throw new HttpError(403, "Only the playlist owner can do this")
  }
  return access
}

/** Full playlist: summary, songs in order, and the people it is shared with. */
const getPlaylistDetail = async (playlistId) => {
  const [summaryRow] = await sequelize.query(`${PLAYLIST_SUMMARY_SQL} WHERE p.id = :id`, {
    replacements: { id: playlistId },
    type: QueryTypes.SELECT,
  })
  if (!summaryRow) throw new HttpError(404, "Playlist not found")

  const [songs, members] = await Promise.all([
    sequelize.query(
      `SELECT ps.id AS "itemId", ps.position, ps."createdAt" AS "addedAt",
         s.id AS "dbId", s."songData", s.source, s."isActive",
         u.userid AS "addedById", u.name AS "addedByName"
       FROM playlist_songs ps
       JOIN songs s ON s.id = ps."songRefId"
       LEFT JOIN users u ON u.userid = ps."addedBy"
       WHERE ps."playlistId" = :id
       ORDER BY ps.position ASC, ps.id ASC`,
      { replacements: { id: playlistId }, type: QueryTypes.SELECT },
    ),
    sequelize.query(
      `SELECT sh.id AS "shareId", sh.status, sh."createdAt", sh."respondedAt",
         u.userid, u.name, u.username, u.profilepic
       FROM playlist_shares sh JOIN users u ON u.userid = sh."sharedWith"
       WHERE sh."playlistId" = :id AND sh.status IN ('pending', 'accepted')
       ORDER BY sh."createdAt" ASC`,
      { replacements: { id: playlistId }, type: QueryTypes.SELECT },
    ),
  ])

  return {
    ...toSummary(summaryRow),
    songs: songs.map((row) => ({
      ...row.songData,
      dbId: row.dbId,
      source: row.source,
      isActive: row.isActive,
      itemId: row.itemId,
      addedAt: row.addedAt,
      addedBy: row.addedById ? { userid: row.addedById, name: row.addedByName } : null,
    })),
    members,
  }
}

/** Everyone who can currently edit the playlist (owner + accepted collaborators). */
const getEditorIds = async (playlist) => {
  const shares = await PlaylistShare.findAll({
    where: { playlistId: playlist.id, status: "accepted" },
    attributes: ["sharedWith"],
    raw: true,
  })
  return [playlist.ownerId, ...shares.map((s) => s.sharedWith)]
}

/** Tells the other editors to refresh — keeps collaborative playlists live. */
const notifyEditors = async (playlist, actorId, action) => {
  try {
    const ids = await getEditorIds(playlist)
    ids
      .filter((id) => id !== actorId)
      .forEach((id) =>
        emitToUser(id, "playlist-updated", { playlistId: playlist.id, name: playlist.name, action }),
      )
  } catch (err) {
    console.error("[Playlist] notify failed:", err.message)
  }
}

module.exports = {
  PLAYLIST_SUMMARY_SQL,
  toSummary,
  getAccess,
  requireAccess,
  getPlaylistDetail,
  getEditorIds,
  notifyEditors,
  playlistSchema,
}
