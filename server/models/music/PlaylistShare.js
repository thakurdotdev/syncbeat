const { DataTypes } = require("sequelize")
const sequelize = require("../../utils/sequelize")

/**
 * A playlist shared with another user. Once the recipient accepts, they become a
 * collaborator and can add/remove songs just like the owner.
 */
const PlaylistShare = sequelize.define(
  "PlaylistShare",
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
    sharedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "userid" },
      onDelete: "CASCADE",
    },
    sharedWith: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "userid" },
      onDelete: "CASCADE",
    },
    status: {
      type: DataTypes.ENUM("pending", "accepted", "declined"),
      allowNull: false,
      defaultValue: "pending",
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "playlist_shares",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["playlistId", "sharedWith"] },
      { fields: ["sharedWith", "status"] },
    ],
  },
)

module.exports = PlaylistShare
