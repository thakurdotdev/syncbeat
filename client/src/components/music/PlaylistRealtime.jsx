import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { playlistKeys, respondToShare } from "@/api/playlists"
import { errorMessage } from "@/api/http"
import { useSocket } from "@/Context/ChatContext"

/** Listens for playlist socket events and keeps the UI in sync. Renders nothing. */
const PlaylistRealtime = () => {
  const { socket } = useSocket()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!socket) return

    const refresh = (playlistId) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.all })
      if (playlistId) queryClient.invalidateQueries({ queryKey: playlistKeys.detail(playlistId) })
    }

    const answer = async (share, action) => {
      try {
        await respondToShare({ shareId: share.shareId, action })
        refresh(share.playlistId)
        if (action === "accept") {
          toast.success(`“${share.playlistName}” added to your library`, {
            action: { label: "Open", onClick: () => navigate(`/playlists/${share.playlistId}`) },
          })
        }
      } catch (error) {
        toast.error(errorMessage(error))
      }
    }

    const onShareReceived = (share) => {
      refresh()
      toast(`${share.sharedBy?.name} shared “${share.playlistName}” with you`, {
        description: "Accept to listen and edit it together.",
        duration: 15000,
        action: { label: "Accept", onClick: () => answer(share, "accept") },
        cancel: { label: "Decline", onClick: () => answer(share, "decline") },
      })
    }

    const onShareResponded = ({ playlistId, playlistName, status, user }) => {
      refresh(playlistId)
      if (status === "accepted") toast.success(`${user?.name} joined “${playlistName}”`)
      else toast(`${user?.name} declined “${playlistName}”`)
    }

    const onPlaylistUpdated = ({ playlistId, name, action }) => {
      refresh(playlistId)
      const viewing = location.pathname === `/playlists/${playlistId}`
      if (action === "deleted" || action === "removed") {
        toast(
          action === "deleted"
            ? `“${name}” was deleted by its owner`
            : `You were removed from “${name}”`,
        )
        if (viewing) navigate("/library?tab=playlists")
      }
    }

    socket.on("playlist-share-received", onShareReceived)
    socket.on("playlist-share-responded", onShareResponded)
    socket.on("playlist-updated", onPlaylistUpdated)
    return () => {
      socket.off("playlist-share-received", onShareReceived)
      socket.off("playlist-share-responded", onShareResponded)
      socket.off("playlist-updated", onPlaylistUpdated)
    }
  }, [socket, queryClient, navigate, location.pathname])

  return null
}

export default PlaylistRealtime
