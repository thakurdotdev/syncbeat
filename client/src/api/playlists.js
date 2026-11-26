import { api } from "./http"

export const playlistKeys = {
  all: ["playlists"],
  mine: () => ["playlists", "mine"],
  detail: (id) => ["playlists", "detail", Number(id)],
  incoming: () => ["playlists", "incoming"],
}

export const fetchMyPlaylists = async () => (await api.get("/playlists")).data.playlists

export const fetchPlaylist = async (id) => (await api.get(`/playlists/${id}`)).data.playlist

export const createPlaylist = async (body) => (await api.post("/playlists", body)).data.playlist

export const updatePlaylist = async ({ id, ...body }) =>
  (await api.patch(`/playlists/${id}`, body)).data.playlist

export const deletePlaylist = async (id) => (await api.delete(`/playlists/${id}`)).data

export const addSongToPlaylist = async ({ id, song }) =>
  (await api.post(`/playlists/${id}/songs`, { song })).data.playlist

export const removeSongFromPlaylist = async ({ id, songRefId }) =>
  (await api.delete(`/playlists/${id}/songs/${songRefId}`)).data.playlist

export const sharePlaylist = async ({ id, userId }) =>
  (await api.post(`/playlists/${id}/share`, { userId })).data.playlist

export const removePlaylistMember = async ({ id, userId }) =>
  (await api.delete(`/playlists/${id}/members/${userId}`)).data

export const fetchIncomingShares = async () => (await api.get("/playlists/shares/incoming")).data.shares

export const respondToShare = async ({ shareId, action }) =>
  (await api.post(`/playlists/shares/${shareId}/${action}`)).data

export const searchUsers = async (search) =>
  (await api.get("/user/invite-list", { params: { search } })).data.users
