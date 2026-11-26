import AddToPlaylistDialog from "./AddToPlaylistDialog"
import PlayerBar from "./PlayerBar"
import PlaylistRealtime from "./PlaylistRealtime"

/** Things every signed-in layout needs once: solo player, add-to-playlist dialog, live updates. */
const AppOverlays = () => (
  <>
    <PlayerBar />
    <AddToPlaylistDialog />
    <PlaylistRealtime />
  </>
)

export default AppOverlays
