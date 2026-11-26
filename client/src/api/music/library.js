import axios from "axios"
import { api } from "../http"

export const libraryKeys = {
  all: ["library"],
  songs: (params) => ["library", "songs", params],
  recent: () => ["library", "recent"],
  liked: () => ["library", "liked"],
  likedIds: () => ["library", "liked-ids"],
  charts: (params) => ["library", "charts", params],
  online: (query) => ["library", "online", query],
}

export const fetchSongs = async ({ search = "", sort = "latest", page = 1, limit = 30 }) => {
  const { data } = await api.get("/songs", { params: { search, sort, page, limit } })
  return data
}

export const fetchRecent = async () => (await api.get("/songs/recent")).data.songs

export const fetchLiked = async () => (await api.get("/songs/liked")).data.songs

export const fetchLikedIds = async () => (await api.get("/songs/liked-ids")).data.ids

export const toggleLike = async (song) => (await api.post("/songs/like", { song })).data

export const recordPlay = async (song) => {
  try {
    await api.post("/songs/played", { song })
  } catch {
    // Listening history is best effort; never interrupt playback for it
  }
}

export const fetchCharts = async ({ period = "all", search = "" }) =>
  (await api.get("/songs/charts", { params: { period, search, limit: 50 } })).data.songs

/** Searches the external music API (same source the group search uses). */
export const searchOnline = async (query) => {
  const base = import.meta.env.VITE_SONG_URL
  if (!base || !query.trim()) return []
  const { data } = await axios.get(`${base}/search/songs`, { params: { q: query } })
  return data?.data?.results || []
}
