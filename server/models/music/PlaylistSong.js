const { DataTypes } = require("sequelize")
const sequelize = require("../../utils/sequelize")

const PlaylistSong = sequelize.define(
  "PlaylistSong",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    playlistId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "playlists", key: "id" },
      onDelete: "CASCADE",
    },
    songRefId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "songs", key: "id" },
      onDelete: "CASCADE",
    },
    addedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "userid" },
      onDelete: "SET NULL",
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: "playlist_songs",
    timestamps: true,
    updatedAt: false,
    indexes: [{ unique: true, fields: ["playlistId", "songRefId"] }, { fields: ["songRefId"] }],
  },
)

module.exports = PlaylistSong
