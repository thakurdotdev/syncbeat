const User = require("../auth/userModel")
const Song = require("./Song")
const GroupSessionHistory = require("./GroupSessionHistory")
const HistorySong = require("./HistorySong")
const SongLike = require("./SongLike")
const Playlist = require("./Playlist")
const PlaylistSong = require("./PlaylistSong")
const PlaylistShare = require("./PlaylistShare")

Song.hasMany(GroupSessionHistory, {
  foreignKey: "songRefId",
  as: "groupSessionEntries",
})

GroupSessionHistory.belongsTo(Song, {
  foreignKey: "songRefId",
  as: "song",
})

GroupSessionHistory.belongsTo(User, {
  foreignKey: "addedByUserId",
  targetKey: "userid",
  as: "addedBy",
})

// Likes
Song.hasMany(SongLike, { foreignKey: "songRefId", as: "likes" })
SongLike.belongsTo(Song, { foreignKey: "songRefId", as: "song" })
SongLike.belongsTo(User, { foreignKey: "userId", targetKey: "userid", as: "user" })

// Listening history (recent plays)
HistorySong.belongsTo(Song, { foreignKey: "songRefId", as: "song" })
HistorySong.belongsTo(User, { foreignKey: "userId", targetKey: "userid", as: "user" })

// Playlists
Playlist.belongsTo(User, { foreignKey: "ownerId", targetKey: "userid", as: "owner" })
Playlist.hasMany(PlaylistSong, { foreignKey: "playlistId", as: "items", onDelete: "CASCADE" })
Playlist.hasMany(PlaylistShare, { foreignKey: "playlistId", as: "shares", onDelete: "CASCADE" })

PlaylistSong.belongsTo(Playlist, { foreignKey: "playlistId", as: "playlist" })
PlaylistSong.belongsTo(Song, { foreignKey: "songRefId", as: "song" })
PlaylistSong.belongsTo(User, { foreignKey: "addedBy", targetKey: "userid", as: "adder" })

PlaylistShare.belongsTo(Playlist, { foreignKey: "playlistId", as: "playlist" })
PlaylistShare.belongsTo(User, { foreignKey: "sharedBy", targetKey: "userid", as: "sender" })
PlaylistShare.belongsTo(User, { foreignKey: "sharedWith", targetKey: "userid", as: "recipient" })

module.exports = {
  Song,
  GroupSessionHistory,
  HistorySong,
  SongLike,
  Playlist,
  PlaylistSong,
  PlaylistShare,
}
