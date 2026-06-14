const { DataTypes, Model } = require("sequelize")
const sequelize = require("../../utils/sequelize")

class User extends Model {}

User.init(
  {
    userid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    username: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    bio: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    profilepic: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    logintype: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "EMAILPASSWORD",
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    passkeyEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lastPasskeyLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    passKeyChallenge: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    challengeExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expoPushToken: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLogout: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false, // whether the user has enabled 2FA
    },
    twoFactorSecret: {
      type: DataTypes.TEXT,
      allowNull: true, // store encrypted secret for TOTP
    },
    resetPasswordToken: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "User",
    timestamps: false,
    tableName: "users",
  },
)

module.exports = User
