import { Check, Loader2, Plus, Users } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useAddSongToPlaylist, useMyPlaylists } from "@/hooks/queries/usePlaylistQueries"
import { getSongArtists, plural } from "@/lib/song"
import { useAddToPlaylistStore } from "@/stores/addToPlaylistStore"
import PlaylistCover from "./PlaylistCover"
import PlaylistFormDialog from "./PlaylistFormDialog"

/** Mounted once in the app layout; opened with useAddToPlaylistStore().open(song). */
const AddToPlaylistDialog = () => {
  const { song, close } = useAddToPlaylistStore()
  const open = Boolean(song)
  const [createOpen, setCreateOpen] = useState(false)
  const [addedTo, setAddedTo] = useState(null)
  const { data: playlists, isLoading } = useMyPlaylists({ enabled: open })
  const addSong = useAddSongToPlaylist({ onSuccess: (p) => setAddedTo(p.id) })

  const handleOpenChange = (value) => {
    if (!value) {
      close()
      setAddedTo(null)
    }
  }

  return (
    <>
      <Dialog open={open && !createOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to playlist</DialogTitle>
            <DialogDescription className="truncate">
              {song ? `${song.name} · ${getSongArtists(song)}` : ""}
            </DialogDescription>
          </DialogHeader>

          <Button variant="outline" className="justify-start" onClick={() => setCreateOpen(true)}>
            <Plus />
            New playlist
          </Button>

          <div className="max-h-80 space-y-1 overflow-y-auto -mx-2 px-2">
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            {!isLoading && !playlists?.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                You don't have any playlists yet.
              </p>
            )}
            {playlists?.map((playlist) => {
              const pending = addSong.isPending && addSong.variables?.id === playlist.id
              const done = addedTo === playlist.id
              return (
                <button
                  key={playlist.id}
                  type="button"
                  disabled={addSong.isPending}
                  onClick={() => addSong.mutate({ id: playlist.id, song })}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-accent/60 disabled:opacity-60 cursor-pointer"
                >
                  <PlaylistCover covers={playlist.covers} className="h-10 w-10 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{playlist.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      {plural(playlist.songCount, "song")}
                      {playlist.myRole === "editor" && (
                        <>
                          {" · "}
                          <Users className="h-3 w-3" /> shared by {playlist.owner.name}
                        </>
                      )}
                    </p>
                  </div>
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {done && !pending && <Check className="h-4 w-4 text-primary" />}
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      <PlaylistFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(playlist) => song && addSong.mutate({ id: playlist.id, song })}
      />
    </>
  )
}

export default AddToPlaylistDialog
