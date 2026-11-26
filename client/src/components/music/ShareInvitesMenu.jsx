import { Bell, Check, Loader2, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useIncomingShares, useRespondToShare } from "@/hooks/queries/usePlaylistQueries"
import { plural } from "@/lib/song"
import { getProfileCloudinaryUrl } from "@/Utils/Cloudinary"

export const ShareInviteItem = ({ share, compact }) => {
  const respond = useRespondToShare()
  const busy = respond.isPending
  return (
    <div className="flex items-start gap-3 rounded-lg p-2">
      <Avatar className="h-9 w-9">
        <AvatarImage src={getProfileCloudinaryUrl(share.sharedBy.profilepic)} alt="" />
        <AvatarFallback>{share.sharedBy.name?.[0]}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{share.sharedBy.name}</span> shared{" "}
          <span className="font-medium">“{share.playlistName}”</span> with you
        </p>
        <p className="text-xs text-muted-foreground">
          {plural(share.songCount, "song")} · you'll be able to add and remove songs
        </p>
        <div className={`mt-2 flex gap-2 ${compact ? "" : "sm:mt-3"}`}>
          <Button
            size="sm"
            className="h-8"
            disabled={busy}
            onClick={() => respond.mutate({ shareId: share.shareId, action: "accept" })}
          >
            {busy && respond.variables?.action === "accept" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Check />
            )}
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            disabled={busy}
            onClick={() => respond.mutate({ shareId: share.shareId, action: "decline" })}
          >
            <X />
            Decline
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Navbar bell listing playlist invites waiting for an answer. */
const ShareInvitesMenu = () => {
  const { data: shares = [] } = useIncomingShares()
  const count = shares.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent/60 cursor-pointer"
          aria-label={count ? `${count} playlist invites` : "Notifications"}
        >
          <Bell className="h-4.5 w-4.5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-2">
        <p className="px-2 pb-1 pt-1 text-sm font-semibold">Playlist invites</p>
        {count === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No pending invites
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {shares.map((share) => (
              <ShareInviteItem key={share.shareId} share={share} compact />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default ShareInvitesMenu
