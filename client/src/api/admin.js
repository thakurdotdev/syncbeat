import { api } from "./http"

export const adminKeys = {
  all: ["admin"],
  stats: () => ["admin", "stats"],
  users: (params) => ["admin", "users", params],
  user: (id) => ["admin", "user", Number(id)],
  songs: (params) => ["admin", "songs", params],
  playlists: (params) => ["admin", "playlists", params],
  playlist: (id) => ["admin", "playlist", Number(id)],
}

export const fetchAdminStats = async () => (await api.get("/admin/stats")).data

export const fetchAdminUsers = async (params) => (await api.get("/admin/users", { params })).data

export const fetchAdminUser = async (id) => (await api.get(`/admin/users/${id}`)).data

export const updateAdminUser = async ({ id, ...body }) =>
  (await api.patch(`/admin/users/${id}`, body)).data.user

export const fetchAdminSongs = async (params) => (await api.get("/admin/songs", { params })).data

export const createAdminSong = async (body) => (await api.post("/admin/songs", body)).data.song

export const updateAdminSong = async ({ id, ...body }) =>
  (await api.put(`/admin/songs/${id}`, body)).data.song

export const setAdminSongVisibility = async ({ id, isActive }) =>
  (await api.patch(`/admin/songs/${id}/visibility`, { isActive })).data.song

export const deleteAdminSong = async (id) => (await api.delete(`/admin/songs/${id}`)).data

export const fetchAdminPlaylists = async (params) =>
  (await api.get("/admin/playlists", { params })).data

export const fetchAdminPlaylist = async (id) => (await api.get(`/admin/playlists/${id}`)).data.playlist

export const deleteAdminPlaylist = async (id) => (await api.delete(`/admin/playlists/${id}`)).data

export const adminLogin = async (body) => (await api.post("/admin/login", body)).data

export const updateAdminPlaylist = async ({ id, ...body }) =>
  (await api.patch(`/admin/playlists/${id}`, body)).data.playlist

export const removeAdminPlaylistSong = async ({ id, songRefId }) =>
  (await api.delete(`/admin/playlists/${id}/songs/${songRefId}`)).data.playlist
