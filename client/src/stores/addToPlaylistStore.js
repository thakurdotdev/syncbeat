import { create } from "zustand"

/** Opens the single "Add to playlist" dialog from anywhere in the app. */
export const useAddToPlaylistStore = create((set) => ({
  song: null,
  open: (song) => set({ song }),
  close: () => set({ song: null }),
}))
