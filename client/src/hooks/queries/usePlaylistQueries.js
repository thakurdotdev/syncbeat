import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { errorMessage } from "@/api/http"
import {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  fetchIncomingShares,
  fetchMyPlaylists,
  fetchPlaylist,
  playlistKeys,
  removePlaylistMember,
  removeSongFromPlaylist,
  respondToShare,
  sharePlaylist,
  updatePlaylist,
} from "@/api/playlists"

export const useMyPlaylists = (options = {}) =>
  useQuery({ queryKey: playlistKeys.mine(), queryFn: fetchMyPlaylists, ...options })

export const usePlaylist = (id) =>
  useQuery({
    queryKey: playlistKeys.detail(id),
    queryFn: () => fetchPlaylist(id),
    enabled: Boolean(id),
    retry: false,
  })

export const useIncomingShares = () =>
  useQuery({
    queryKey: playlistKeys.incoming(),
    queryFn: fetchIncomingShares,
    refetchInterval: 60 * 1000,
  })

/** Mutation that refreshes playlist data afterwards and shows errors as toasts. */
const usePlaylistMutation = (mutationFn, { success, onSuccess } = {}) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      if (data?.id) queryClient.setQueryData(playlistKeys.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: playlistKeys.all })
      if (success) toast.success(typeof success === "function" ? success(data, variables) : success)
      onSuccess?.(data, variables)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export const useCreatePlaylist = (opts) =>
  usePlaylistMutation(createPlaylist, { success: "Playlist created", ...opts })

export const useUpdatePlaylist = (opts) =>
  usePlaylistMutation(updatePlaylist, { success: "Playlist updated", ...opts })

export const useDeletePlaylist = (opts) =>
  usePlaylistMutation(deletePlaylist, { success: "Playlist deleted", ...opts })

export const useAddSongToPlaylist = (opts) =>
  usePlaylistMutation(addSongToPlaylist, {
    success: (playlist) => `Added to ${playlist.name}`,
    ...opts,
  })

export const useRemoveSongFromPlaylist = (opts) =>
  usePlaylistMutation(removeSongFromPlaylist, { success: "Removed from playlist", ...opts })

export const useSharePlaylist = (opts) =>
  usePlaylistMutation(sharePlaylist, { success: "Invite sent", ...opts })

export const useRemovePlaylistMember = (opts) => usePlaylistMutation(removePlaylistMember, opts)

export const useRespondToShare = (opts) =>
  usePlaylistMutation(respondToShare, {
    success: (_data, { action }) =>
      action === "accept" ? "Playlist added to your library" : "Invite declined",
    ...opts,
  })
