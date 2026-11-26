const { QueryTypes } = require("sequelize")
const sequelize = require("../utils/sequelize")
const { registry } = require("../socket/registry")
const { toClientSong, getTopCharts } = require("../services/songService")
const { PLAYLIST_SUMMARY_SQL, toSummary } = require("../services/playlistService")

const select = (sql, replacements) =>
  sequelize.query(sql, { replacements, type: QueryTypes.SELECT })

/**
 * GET /api/dashboard — everything the signed-in user's dashboard shows:
 * their stats, recent and most played songs, playlists, friends and what's trending.
 */
exports.getMyDashboard = async (req, res) => {
  const me = req.user.userid

  const [[stats], recent, mostPlayed, playlists, friends, trending] = await Promise.all([
    select(
      `SELECT
         COALESCE((SELECT SUM("playedCount") FROM history_songs WHERE "userId" = :me), 0)::int AS "totalPlays",
         (SELECT COUNT(*) FROM history_songs WHERE "userId" = :me)::int AS "uniqueSongs",
         COALESCE((SELECT SUM(h."playedCount" * COALESCE(s.duration, 0))
                   FROM history_songs h JOIN songs s ON s.id = h."songRefId"
                   WHERE h."userId" = :me), 0)::int AS "secondsListened",
         (SELECT COUNT(*) FROM song_likes WHERE "userId" = :me)::int AS "likedCount",
         (SELECT COUNT(*) FROM playlists WHERE "ownerId" = :me)::int AS "ownPlaylists",
         (SELECT COUNT(*) FROM playlist_shares
            WHERE "sharedWith" = :me AND status = 'accepted')::int AS "sharedWithMe",
         (SELECT COUNT(*) FROM playlist_shares
            WHERE "sharedWith" = :me AND status = 'pending')::int AS "pendingInvites",
         (SELECT COUNT(*) FROM playlist_shares sh JOIN playlists p ON p.id = sh."playlistId"
            WHERE p."ownerId" = :me AND sh.status = 'accepted')::int AS "collaborators"`,
      { me },
    ),
    select(
      `SELECT s.id AS "dbId", s."songData", s.source, s."isActive", s."createdAt",
         h."playedCount" AS "myPlayCount", h."lastPlayedAt"
       FROM history_songs h JOIN songs s ON s.id = h."songRefId"
       WHERE h."userId" = :me ORDER BY h."lastPlayedAt" DESC LIMIT 6`,
      { me },
    ),
    select(
      `SELECT s.id AS "dbId", s."songData", s.source, s."isActive", s."createdAt",
         h."playedCount" AS "myPlayCount", h."lastPlayedAt"
       FROM history_songs h JOIN songs s ON s.id = h."songRefId"
       WHERE h."userId" = :me ORDER BY h."playedCount" DESC, h."lastPlayedAt" DESC LIMIT 5`,
      { me },
    ),
    select(
      `${PLAYLIST_SUMMARY_SQL}
       WHERE p."ownerId" = :me OR EXISTS (
         SELECT 1 FROM playlist_shares sh
         WHERE sh."playlistId" = p.id AND sh."sharedWith" = :me AND sh.status = 'accepted'
       )
       ORDER BY p."updatedAt" DESC LIMIT 4`,
      { me },
    ),
    // "Friends" = people you share at least one playlist with
    select(
      `SELECT u.userid, u.name, u.username, u.profilepic
       FROM users u
       WHERE u.userid <> :me AND u."isDeleted" = false AND u.userid IN (
         SELECT sh."sharedWith" FROM playlist_shares sh JOIN playlists p ON p.id = sh."playlistId"
           WHERE p."ownerId" = :me AND sh.status = 'accepted'
         UNION
         SELECT p."ownerId" FROM playlist_shares sh JOIN playlists p ON p.id = sh."playlistId"
           WHERE sh."sharedWith" = :me AND sh.status = 'accepted'
         UNION
         SELECT other."sharedWith" FROM playlist_shares mine
           JOIN playlist_shares other ON other."playlistId" = mine."playlistId"
           WHERE mine."sharedWith" = :me AND mine.status = 'accepted' AND other.status = 'accepted'
       )
       ORDER BY u.name LIMIT 30`,
      { me },
    ),
    getTopCharts({ period: "week", limit: 5 }),
  ])

  const withHistory = (row) => ({
    ...toClientSong(row),
    myPlayCount: row.myPlayCount,
    lastPlayedAt: row.lastPlayedAt,
  })
  const online = registry.onlineUsers

  res.json({
    stats,
    recent: recent.map(withHistory),
    mostPlayed: mostPlayed.map(withHistory),
    playlists: playlists.map((row) => toSummary(row, row.ownerId === me ? "owner" : "editor")),
    friends: friends
      .map((f) => ({ ...f, isOnline: online.has(f.userid) }))
      .sort((a, b) => Number(b.isOnline) - Number(a.isOnline)),
    trending,
  })
}
