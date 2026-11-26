const { QueryTypes } = require("sequelize")
const sequelize = require("../utils/sequelize")
const User = require("../models/auth/userModel")
const { Playlist, PlaylistSong, PlaylistShare } = require("../models/music")
const { HttpError, parseId } = require("../utils/http")
const { emitToUser } = require("../socket/registry")
const { resolveSong } = require("../services/songService")
const {
  PLAYLIST_SUMMARY_SQL,
  toSummary,
  requireAccess,
  getPlaylistDetail,
  notifyEditors,
  playlistSchema,
} = require("../services/playlistService")

const MAX_SONGS_PER_PLAYLIST = 500


/** Bumps updatedAt so recently edited playlists sort first. */
const touch = async (playlist) => {
  playlist.changed("updatedAt", true)
  await playlist.save()
}

/** GET /api/playlists — playlists I own plus playlists shared with me that I accepted. */
exports.listMine = async (req, res) => {
  const me = req.user.userid
  const rows = await sequelize.query(
    `${PLAYLIST_SUMMARY_SQL}
     WHERE p."ownerId" = :me OR EXISTS (
       SELECT 1 FROM playlist_shares sh
       WHERE sh."playlistId" = p.id AND sh."sharedWith" = :me AND sh.status = 'accepted'
     )
     ORDER BY p."updatedAt" DESC`,
    { replacements: { me }, type: QueryTypes.SELECT },
  )
  res.json({
    playlists: rows.map((row) => toSummary(row, row.ownerId === me ? "owner" : "editor")),
  })
}

/** POST /api/playlists { name, description } */
exports.create = async (req, res) => {
  const data = await playlistSchema.validate(req.body, { stripUnknown: true })
  const playlist = await Playlist.create({ ...data, ownerId: req.user.userid })
  res.status(201).json({ playlist: { ...(await getPlaylistDetail(playlist.id)), myRole: "owner" } })
}

/** GET /api/playlists/:id */
exports.getOne = async (req, res) => {
  const id = parseId(req.params.id, "playlist id")
  const { role } = await requireAccess(id, req.user.userid)
  res.json({ playlist: { ...(await getPlaylistDetail(id)), myRole: role } })
}

/** PATCH /api/playlists/:id { name, description } — owner or collaborators. */
exports.update = async (req, res) => {
  const id = parseId(req.params.id, "playlist id")
  const { playlist, role } = await requireAccess(id, req.user.userid)
  const data = await playlistSchema.validate(req.body, { stripUnknown: true })
  await playlist.update(data)
  notifyEditors(playlist, req.user.userid, "renamed")
  res.json({ playlist: { ...(await getPlaylistDetail(id)), myRole: role } })
}

/** DELETE /api/playlists/:id — owner only. */
exports.remove = async (req, res) => {
  const id = parseId(req.params.id, "playlist id")
  const { playlist } = await requireAccess(id, req.user.userid, ["owner"])
  await notifyEditors(playlist, req.user.userid, "deleted")
  await playlist.destroy()
  res.json({ success: true })
}

/** POST /api/playlists/:id/songs { song } — owner or collaborators. */
exports.addSong = async (req, res) => {
  const id = parseId(req.params.id, "playlist id")
  const { playlist, role } = await requireAccess(id, req.user.userid)
  const songRecord = await resolveSong(req.body.song)

  const exists = await PlaylistSong.findOne({ where: { playlistId: id, songRefId: songRecord.id } })
  if (exists) throw new HttpError(409, "Song is already in this playlist")

  const count = await PlaylistSong.count({ where: { playlistId: id } })
  if (count >= MAX_SONGS_PER_PLAYLIST) {
    throw new HttpError(400, `A playlist can have at most ${MAX_SONGS_PER_PLAYLIST} songs`)
  }

  const maxPosition = (await PlaylistSong.max("position", { where: { playlistId: id } })) ?? -1
  await PlaylistSong.create({
    playlistId: id,
    songRefId: songRecord.id,
    addedBy: req.user.userid,
    position: maxPosition + 1,
  })
  await touch(playlist)
  notifyEditors(playlist, req.user.userid, "song-added")

  res.status(201).json({ playlist: { ...(await getPlaylistDetail(id)), myRole: role } })
}

/** DELETE /api/playlists/:id/songs/:songRefId — owner or collaborators. */
exports.removeSong = async (req, res) => {
  const id = parseId(req.params.id, "playlist id")
  const songRefId = parseId(req.params.songRefId, "song id")
  const { playlist, role } = await requireAccess(id, req.user.userid)

  const deleted = await PlaylistSong.destroy({ where: { playlistId: id, songRefId } })
  if (!deleted) throw new HttpError(404, "Song is not in this playlist")
  await touch(playlist)
  notifyEditors(playlist, req.user.userid, "song-removed")

  res.json({ playlist: { ...(await getPlaylistDetail(id)), myRole: role } })
}

/** POST /api/playlists/:id/share { userId } — owner invites a user; they must accept. */
exports.share = async (req, res) => {
  const id = parseId(req.params.id, "playlist id")
  const targetId = parseId(req.body?.userId, "user id")
  const me = req.user.userid
  const { playlist } = await requireAccess(id, me, ["owner"])

  if (targetId === me) throw new HttpError(400, "You already own this playlist")

  const target = await User.findOne({
    where: { userid: targetId, isDeleted: false },
    attributes: ["userid", "name"],
  })
  if (!target) throw new HttpError(404, "User not found")

  let share = await PlaylistShare.findOne({ where: { playlistId: id, sharedWith: targetId } })
  if (share?.status === "accepted") throw new HttpError(409, `${target.name} already has access`)
  if (share?.status === "pending") throw new HttpError(409, `${target.name} is already invited`)

  if (share) {
    // Previously declined: invite again
    await share.update({ status: "pending", sharedBy: me, respondedAt: null })
  } else {
    share = await PlaylistShare.create({ playlistId: id, sharedBy: me, sharedWith: targetId })
  }

  emitToUser(targetId, "playlist-share-received", {
    shareId: share.id,
    playlistId: id,
    playlistName: playlist.name,
    sharedBy: { userid: me, name: req.user.name, profilepic: req.user.profilepic },
  })

  res.status(201).json({ playlist: { ...(await getPlaylistDetail(id)), myRole: "owner" } })
}

/** GET /api/playlists/shares/incoming — pending invites waiting for my answer. */
exports.incomingShares = async (req, res) => {
  const rows = await sequelize.query(
    `SELECT sh.id AS "shareId", sh."createdAt", p.id AS "playlistId", p.name AS "playlistName",
       p.description,
       (SELECT COUNT(*) FROM playlist_songs ps WHERE ps."playlistId" = p.id)::int AS "songCount",
       u.userid AS "senderId", u.name AS "senderName", u.profilepic AS "senderPic"
     FROM playlist_shares sh
     JOIN playlists p ON p.id = sh."playlistId"
     JOIN users u ON u.userid = sh."sharedBy"
     WHERE sh."sharedWith" = :me AND sh.status = 'pending'
     ORDER BY sh."createdAt" DESC`,
    { replacements: { me: req.user.userid }, type: QueryTypes.SELECT },
  )
  res.json({
    shares: rows.map((r) => ({
      shareId: r.shareId,
      createdAt: r.createdAt,
      playlistId: r.playlistId,
      playlistName: r.playlistName,
      description: r.description,
      songCount: r.songCount,
      sharedBy: { userid: r.senderId, name: r.senderName, profilepic: r.senderPic },
    })),
  })
}

/** POST /api/playlists/shares/:shareId/:action (accept | decline) */
exports.respondToShare = async (req, res) => {
  const shareId = parseId(req.params.shareId, "share id")
  const { action } = req.params
  if (!["accept", "decline"].includes(action)) throw new HttpError(400, "Invalid action")

  const share = await PlaylistShare.findOne({
    where: { id: shareId, sharedWith: req.user.userid },
    include: [{ model: Playlist, as: "playlist", attributes: ["id", "name", "ownerId"] }],
  })
  if (!share) throw new HttpError(404, "Invite not found")
  if (share.status !== "pending") throw new HttpError(409, "This invite was already answered")

  const status = action === "accept" ? "accepted" : "declined"
  await share.update({ status, respondedAt: new Date() })

  emitToUser(share.sharedBy, "playlist-share-responded", {
    playlistId: share.playlistId,
    playlistName: share.playlist?.name,
    status,
    user: { userid: req.user.userid, name: req.user.name },
  })

  res.json({ success: true, status, playlistId: share.playlistId })
}

/**
 * DELETE /api/playlists/:id/members/:userId
 * Owner removes a collaborator (or cancels a pending invite); a collaborator can remove themselves (leave).
 */
exports.removeMember = async (req, res) => {
  const id = parseId(req.params.id, "playlist id")
  const memberId = parseId(req.params.userId, "user id")
  const me = req.user.userid
  const { playlist, role } = await requireAccess(id, me)

  if (role !== "owner" && memberId !== me) {
    throw new HttpError(403, "Only the playlist owner can remove other people")
  }

  const deleted = await PlaylistShare.destroy({ where: { playlistId: id, sharedWith: memberId } })
  if (!deleted) throw new HttpError(404, "That user is not part of this playlist")

  if (memberId !== me) {
    emitToUser(memberId, "playlist-updated", {
      playlistId: id,
      name: playlist.name,
      action: "removed",
    })
  } else {
    emitToUser(playlist.ownerId, "playlist-updated", { playlistId: id, action: "member-left" })
  }

  res.json({ success: true })
}
