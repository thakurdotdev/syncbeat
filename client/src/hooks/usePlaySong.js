import { useCallback } from "react"
import { useGroupMusic } from "@/Context/GroupMusicContext"
import { usePlayerStore } from "@/stores/playerStore"

/**
 * One way to play songs from any page:
 * - in a group session -> add to the group queue (everyone hears it)
 * - otherwise          -> play in the personal player
 */
export const usePlaySong = () => {
  const { currentGroup, addToQueue, addPlaylistToQueue } = useGroupMusic()
  const inGroup = Boolean(currentGroup)

  const play = useCallback(
    (song, list) => {
      if (inGroup) addToQueue(song)
      else usePlayerStore.getState().playSong(song, list)
    },
    [inGroup, addToQueue],
  )

  const playAll = useCallback(
    (songs) => {
      if (!songs?.length) return
      if (inGroup) addPlaylistToQueue(songs)
      else usePlayerStore.getState().playSong(songs[0], songs)
    },
    [inGroup, addPlaylistToQueue],
  )

  return { play, playAll, inGroup }
}
