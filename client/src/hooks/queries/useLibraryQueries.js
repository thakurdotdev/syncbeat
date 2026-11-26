import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { errorMessage } from "@/api/http"
import {
  fetchCharts,
  fetchLiked,
  fetchLikedIds,
  fetchRecent,
  fetchSongs,
  libraryKeys,
  searchOnline,
  toggleLike,
} from "@/api/music/library"

export const useCatalogSongs = (params) =>
  useQuery({
    queryKey: libraryKeys.songs(params),
    queryFn: () => fetchSongs(params),
    placeholderData: keepPreviousData,
  })

export const useRecentSongs = () => useQuery({ queryKey: libraryKeys.recent(), queryFn: fetchRecent })

export const useLikedSongs = () => useQuery({ queryKey: libraryKeys.liked(), queryFn: fetchLiked })

export const useCharts = (params) =>
  useQuery({
    queryKey: libraryKeys.charts(params),
    queryFn: () => fetchCharts(params),
    placeholderData: keepPreviousData,
  })

export const useOnlineSearch = (query) =>
  useQuery({
    queryKey: libraryKeys.online(query),
    queryFn: () => searchOnline(query),
    enabled: Boolean(import.meta.env.VITE_SONG_URL) && query.trim().length > 1,
    staleTime: 5 * 60 * 1000,
  })

/** Set of liked song ids, shared by every heart button in the app. */
export const useLikedIds = () => {
  const query = useQuery({
    queryKey: libraryKeys.likedIds(),
    queryFn: fetchLikedIds,
    staleTime: 5 * 60 * 1000,
    select: (ids) => new Set(ids),
  })
  return query.data || new Set()
}

export const useToggleLike = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: toggleLike,
    // Flip the heart immediately, roll back if the request fails
    onMutate: async (song) => {
      await queryClient.cancelQueries({ queryKey: libraryKeys.likedIds() })
      const previous = queryClient.getQueryData(libraryKeys.likedIds()) || []
      const next = previous.includes(song.id)
        ? previous.filter((id) => id !== song.id)
        : [...previous, song.id]
      queryClient.setQueryData(libraryKeys.likedIds(), next)
      return { previous }
    },
    onError: (error, _song, context) => {
      queryClient.setQueryData(libraryKeys.likedIds(), context?.previous)
      toast.error(errorMessage(error, "Could not update like"))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.all })
    },
  })
}
