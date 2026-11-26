import { Eye, EyeOff, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { useState } from "react"
import EmptyState from "@/components/music/EmptyState"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useAdminSongs,
  useDeleteAdminSong,
  useSetSongVisibility,
} from "@/hooks/queries/useAdminQueries"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { usePlaySong } from "@/hooks/usePlaySong"
import { formatDuration, getSongArtists, getSongCover } from "@/lib/song"
import { AdminPageHeader, formatDate, Pagination, TableShell, Td, Th } from "./components"
import SongFormDialog from "./SongFormDialog"

const AdminSongs = () => {
  const [search, setSearch] = useState("")
  const [source, setSource] = useState("all")
  const [status, setStatus] = useState("all")
  const [sort, setSort] = useState("newest")
  const [page, setPage] = useState(1)
  const [formSong, setFormSong] = useState(undefined) // undefined = closed, null = new
  const [toDelete, setToDelete] = useState(null)
  const debounced = useDebouncedValue(search.trim(), 300)
  const { data, isLoading, isError, refetch } = useAdminSongs({
    search: debounced,
    source,
    status,
    sort,
    page,
  })
  const visibility = useSetSongVisibility()
  const remove = useDeleteAdminSong()
  const { play } = usePlaySong()

  const resetPage = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  return (
    <>
      <AdminPageHeader
        title="Music"
        description="Add songs from links, edit details, hide or delete songs."
        actions={
          <Button onClick={() => setFormSong(null)}>
            <Plus /> Add song
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
            placeholder="Search by song, artist or album"
            className="pl-9"
            aria-label="Search songs"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 lg:flex">
          <Select value={source} onValueChange={resetPage(setSource)}>
            <SelectTrigger className="lg:w-40" aria-label="Filter by source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="admin">Added by admin</SelectItem>
              <SelectItem value="external">From online</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={resetPage(setStatus)}>
            <SelectTrigger className="lg:w-32" aria-label="Filter by visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              <SelectItem value="active">Visible</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={resetPage(setSort)}>
            <SelectTrigger className="lg:w-36" aria-label="Sort songs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="likes">Most liked</SelectItem>
              <SelectItem value="plays">Most played</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError ? (
        <EmptyState title="Couldn't load songs" action={{ label: "Retry", onClick: refetch }} />
      ) : isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : !data.songs.length ? (
        <EmptyState
          title={debounced || source !== "all" || status !== "all" ? "No songs match" : "No songs yet"}
          description="Add a song by pasting its audio and cover links."
          action={{ label: "Add song", onClick: () => setFormSong(null) }}
        />
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>Song</Th>
                <Th>Source</Th>
                <Th className="text-right">Likes</Th>
                <Th className="text-right">Plays</Th>
                <Th className="text-right">Length</Th>
                <Th>Added</Th>
                <Th className="w-10">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {data.songs.map((song) => (
                <tr key={song.dbId} className={song.isActive ? "" : "opacity-60"}>
                  <Td>
                    <button
                      type="button"
                      onClick={() => play(song, data.songs)}
                      className="flex items-center gap-3 text-left cursor-pointer"
                      title="Preview"
                    >
                      <img
                        src={getSongCover(song, "small")}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-md object-cover"
                      />
                      <span className="min-w-0">
                        <span className="block max-w-[260px] truncate font-medium">{song.name}</span>
                        <span className="block max-w-[260px] truncate text-xs text-muted-foreground">
                          {getSongArtists(song)}
                        </span>
                      </span>
                    </button>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={song.source === "admin" ? "default" : "secondary"}>
                        {song.source === "admin" ? "Admin" : "Online"}
                      </Badge>
                      {!song.isActive && <Badge variant="outline">Hidden</Badge>}
                    </div>
                  </Td>
                  <Td className="text-right tabular-nums">{song.likeCount}</Td>
                  <Td className="text-right tabular-nums">{song.playCount}</Td>
                  <Td className="text-right tabular-nums text-muted-foreground">
                    {formatDuration(song.duration)}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{formatDate(song.createdAt)}</Td>
                  <Td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Actions for ${song.name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setFormSong(song)} className="cursor-pointer">
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => visibility.mutate({ id: song.dbId, isActive: !song.isActive })}
                          className="cursor-pointer"
                        >
                          {song.isActive ? <EyeOff /> : <Eye />}
                          {song.isActive ? "Hide from users" : "Show to users"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setToDelete(song)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} label="songs" />
        </>
      )}

      <SongFormDialog
        open={formSong !== undefined}
        onOpenChange={(open) => !open && setFormSong(undefined)}
        song={formSong}
      />

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.playlistCount
                ? `It's in ${toDelete.playlistCount} playlist(s). `
                : ""}
              The song, its likes and play history will be removed for everyone. To keep the history,
              hide it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => remove.mutate(toDelete?.dbId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default AdminSongs
