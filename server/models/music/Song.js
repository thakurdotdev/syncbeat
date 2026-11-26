const { DataTypes, Model } = require("sequelize")
const sequelize = require("../../utils/sequelize")

class Song extends Model {
  static extractArtistNames(songData) {
    const artists =
      songData?.artist_map?.artists ||
      songData?.artist_map?.primary_artists ||
      songData?.artists ||
      []

    if (!Array.isArray(artists)) return "Unknown"

    return (
      artists
        .map((a) => a?.name)
        .filter(Boolean)
        .slice(0, 4)
        .join(", ") || "Unknown"
    )
  }

  /**
   * Builds a song object in the same shape the music API returns, so admin-created
   * songs play through the existing player without any special cases.
   */
  static buildSongData({ id, name, artists, album, language, duration, audioUrl, coverUrl }) {
    const artistList = String(artists || "")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean)
      .map((artistName) => ({ name: artistName, role: "singer", type: "artist" }))

    return {
      id,
      name,
      type: "song",
      source: "admin",
      album: album || "",
      language: language || "unknown",
      duration: Number(duration) || 0,
      artist_map: { primary_artists: artistList, artists: artistList },
      image: ["50x50", "150x150", "500x500"].map((quality) => ({ quality, link: coverUrl })),
      download_url: ["12kbps", "48kbps", "96kbps", "160kbps", "320kbps"].map((quality) => ({
        quality,
        link: audioUrl,
      })),
    }
  }

  static async getOrCreate(songData) {
    if (!songData?.id) throw new Error("songData.id is required")

    try {
      return await Song.create({
        songId: songData.id,
        name: songData.name || songData.title || "Unknown",
        artistNames: Song.extractArtistNames(songData),
        albumName: songData.album?.name || songData.album_name || songData.album || null,
        language: songData.language || "unknown",
        duration: songData.duration || 0,
        songData,
      })
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        return Song.findOne({ where: { songId: songData.id } })
      }
      throw err
    }
  }

  static async bulkGetOrCreate(songsData) {
    if (!songsData?.length) return { created: 0, skipped: 0 }

    const records = songsData
      .filter((s) => s?.id)
      .map((songData) => ({
        songId: songData.id,
        name: songData.name || songData.title || "Unknown",
        artistNames: Song.extractArtistNames(songData),
        albumName: songData.album?.name || songData.album_name || songData.album || null,
        language: songData.language || "unknown",
        duration: songData.duration || 0,
        songData,
      }))

    const result = await Song.bulkCreate(records, {
      ignoreDuplicates: true,
      returning: false,
    })

    return { created: result.length, total: records.length }
  }
}

Song.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    songId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: "External song ID from Saavn/API",
    },
    name: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Song name (indexed for search)",
    },
    artistNames: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Comma-separated artist names (indexed for search)",
    },
    albumName: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Album name (indexed for search)",
    },
    language: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Song language (indexed for filtering)",
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Duration in seconds",
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "external",
      comment: "external (cached from the music API) | admin (added by an admin via links)",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Hidden songs are excluded from the catalogue and charts",
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Admin userid that created the song (admin songs only)",
    },
    songData: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: "Complete song object with all fields (image, download_url, artist_map, etc.)",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    timestamps: true,
    tableName: "songs",
    modelName: "Song",
  },
)

module.exports = Song
