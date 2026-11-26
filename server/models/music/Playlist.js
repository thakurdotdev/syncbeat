const { DataTypes } = require("sequelize")
const sequelize = require("../../utils/sequelize")

const Playlist = sequelize.define(
  "Playlist",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "userid" },
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "playlists",
    timestamps: true,
    indexes: [{ fields: ["ownerId"] }],
  },
)

module.exports = Playlist
