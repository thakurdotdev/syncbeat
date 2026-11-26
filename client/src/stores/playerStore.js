import { toast } from "sonner"
import { create } from "zustand"
import { recordPlay } from "@/api/music/library"
import { getSongArtists, getSongAudioUrl, getSongCover } from "@/lib/song"

/**
 * Personal (solo) player used on the Library, Playlist and Charts pages.
 * Group sessions keep using their own synced player; while you are in a group,
 * "play" adds songs to the group queue instead (see usePlaySong).
 */
let audio = null

const getAudio = () => {
  if (audio) return audio
  audio = new Audio()
  audio.preload = "auto"

  audio.addEventListener("timeupdate", () =>
    usePlayerStore.setState({ currentTime: audio.currentTime }),
  )
  audio.addEventListener("loadedmetadata", () =>
    usePlayerStore.setState({ duration: audio.duration || 0 }),
  )
  audio.addEventListener("play", () => usePlayerStore.setState({ isPlaying: true }))
  audio.addEventListener("pause", () => usePlayerStore.setState({ isPlaying: false }))
  audio.addEventListener("waiting", () => usePlayerStore.setState({ isLoading: true }))
  audio.addEventListener("playing", () => usePlayerStore.setState({ isLoading: false }))
  audio.addEventListener("ended", () => usePlayerStore.getState().next(true))
  audio.addEventListener("error", () => {
    if (!audio.src) return
    usePlayerStore.setState({ isLoading: false, isPlaying: false })
    toast.error("This song could not be played. Check its audio link.")
  })
  return audio
}

const updateMediaSession = (song) => {
  if (!("mediaSession" in navigator) || !song) return
  const cover = getSongCover(song, "large")
  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.name,
    artist: getSongArtists(song),
    artwork: cover ? [{ src: cover, sizes: "500x500" }] : [],
  })
  const { toggle, next, previous } = usePlayerStore.getState()
  navigator.mediaSession.setActionHandler("play", toggle)
  navigator.mediaSession.setActionHandler("pause", toggle)
  navigator.mediaSession.setActionHandler("nexttrack", () => next())
  navigator.mediaSession.setActionHandler("previoustrack", previous)
}

export const usePlayerStore = create((set, get) => ({
  queue: [],
  index: -1,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  volume: 1,

  currentSong: () => get().queue[get().index] || null,

  /** Plays `song`; `list` (optional) becomes the queue so next/previous work. */
  playSong: (song, list) => {
    const queue = list?.length ? list : [song]
    const index = Math.max(
      queue.findIndex((s) => s.id === song.id),
      0,
    )
    set({ queue, index })
    get().loadCurrent()
  },

  loadCurrent: async () => {
    const song = get().queue[get().index]
    const url = getSongAudioUrl(song)
    if (!song || !url) {
      toast.error("This song has no audio link")
      return
    }
    const el = getAudio()
    el.src = url
    el.volume = get().volume
    set({ currentTime: 0, duration: song.duration || 0, isLoading: true })
    updateMediaSession(song)
    recordPlay(song)
    try {
      await el.play()
    } catch (err) {
      if (err?.name !== "AbortError") set({ isLoading: false, isPlaying: false })
    }
  },

  toggle: async () => {
    const el = getAudio()
    if (!el.src) return
    if (el.paused) {
      await el.play().catch(() => {})
    } else {
      el.pause()
    }
  },

  next: (auto = false) => {
    const { index, queue } = get()
    if (index + 1 < queue.length) {
      set({ index: index + 1 })
      get().loadCurrent()
    } else if (auto) {
      set({ isPlaying: false, currentTime: 0 })
    }
  },

  previous: () => {
    const { index } = get()
    const el = getAudio()
    if (el.currentTime > 3 || index === 0) {
      el.currentTime = 0
      return
    }
    set({ index: index - 1 })
    get().loadCurrent()
  },

  seek: (seconds) => {
    const el = getAudio()
    el.currentTime = seconds
    set({ currentTime: seconds })
  },

  setVolume: (volume) => {
    getAudio().volume = volume
    set({ volume })
  },

  stop: () => {
    if (audio) {
      audio.pause()
      audio.removeAttribute("src")
      audio.load()
    }
    set({ queue: [], index: -1, isPlaying: false, isLoading: false, currentTime: 0, duration: 0 })
  },
}))
