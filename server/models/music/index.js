const User = require("../auth/userModel")
const Song = require("./Song")
const GroupSessionHistory = require("./GroupSessionHistory")

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

module.exports = {
  Song,
  GroupSessionHistory,
}
