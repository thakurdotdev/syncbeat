import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { errorMessage } from "@/api/http"
import {
  adminKeys,
  createAdminSong,
  deleteAdminPlaylist,
  deleteAdminSong,
  fetchAdminPlaylist,
  fetchAdminPlaylists,
  fetchAdminSongs,
  fetchAdminStats,
  fetchAdminUser,
  fetchAdminUsers,
  removeAdminPlaylistSong,
  setAdminSongVisibility,
  updateAdminPlaylist,
  updateAdminSong,
  updateAdminUser,
} from "@/api/admin"
import { libraryKeys } from "@/api/music/library"

export const useAdminStats = () =>
  useQuery({ queryKey: adminKeys.stats(), queryFn: fetchAdminStats, refetchInterval: 30 * 1000 })

export const useAdminUsers = (params) =>
  useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => fetchAdminUsers(params),
    placeholderData: keepPreviousData,
  })

export const useAdminUser = (id) =>
  useQuery({ queryKey: adminKeys.user(id), queryFn: () => fetchAdminUser(id), retry: false })

export const useAdminSongs = (params) =>
  useQuery({
    queryKey: adminKeys.songs(params),
    queryFn: () => fetchAdminSongs(params),
    placeholderData: keepPreviousData,
  })

export const useAdminPlaylists = (params) =>
  useQuery({
    queryKey: adminKeys.playlists(params),
    queryFn: () => fetchAdminPlaylists(params),
    placeholderData: keepPreviousData,
  })

export const useAdminPlaylist = (id) =>
  useQuery({
    queryKey: adminKeys.playlist(id),
    queryFn: () => fetchAdminPlaylist(id),
    enabled: Boolean(id),
  })

const useAdminMutation = (mutationFn, success) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
      queryClient.invalidateQueries({ queryKey: libraryKeys.all })
      if (success) toast.success(typeof success === "function" ? success(data, variables) : success)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export const useUpdateAdminUser = () =>
  useAdminMutation(updateAdminUser, (user, vars) => {
    if (vars.role) return `${user.name} is now ${vars.role === "admin" ? "an admin" : "a user"}`
    return user.isDeleted ? `${user.name} has been banned` : `${user.name} has been unbanned`
  })

export const useCreateAdminSong = () => useAdminMutation(createAdminSong, "Song added")
export const useUpdateAdminSong = () => useAdminMutation(updateAdminSong, "Song updated")
export const useSetSongVisibility = () =>
  useAdminMutation(setAdminSongVisibility, (song) =>
    song.isActive ? "Song is visible again" : "Song hidden from users",
  )
export const useDeleteAdminSong = () => useAdminMutation(deleteAdminSong, "Song deleted")
export const useDeleteAdminPlaylist = () => useAdminMutation(deleteAdminPlaylist, "Playlist deleted")
export const useUpdateAdminPlaylist = () => useAdminMutation(updateAdminPlaylist, "Playlist updated")
export const useRemoveAdminPlaylistSong = () =>
  useAdminMutation(removeAdminPlaylistSong, "Song removed from playlist")
