const { DataTypes } = require("sequelize")
const sequelize = require("../../utils/sequelize")

const SongLike = sequelize.define(
  "SongLike",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "userid" },
      onDelete: "CASCADE",
    },
    songRefId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "songs", key: "id" },
      onDelete: "CASCADE",
    },
  },
  {
    sequelize,
    tableName: "song_likes",
    timestamps: true,
    updatedAt: false,
    indexes: [{ unique: true, fields: ["userId", "songRefId"] }, { fields: ["songRefId"] }],
  },
)

module.exports = SongLike
