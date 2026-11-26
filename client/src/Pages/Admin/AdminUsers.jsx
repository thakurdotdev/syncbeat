import { Search } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import EmptyState from "@/components/music/EmptyState"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminUsers } from "@/hooks/queries/useAdminQueries"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { getProfileCloudinaryUrl } from "@/Utils/Cloudinary"
import { AdminPageHeader, formatDate, Pagination, TableShell, Td, Th } from "./components"

export const UserStatusBadges = ({ user }) => (
  <div className="flex flex-wrap gap-1">
    {user.role === "admin" && <Badge>Admin</Badge>}
    {user.isDeleted ? (
      <Badge variant="destructive">Banned</Badge>
    ) : !user.verified ? (
      <Badge variant="outline">Unverified</Badge>
    ) : (
      <Badge variant="secondary">Active</Badge>
    )}
    {user.isOnline && (
      <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
        Online
      </Badge>
    )}
  </div>
)

const AdminUsers = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [sort, setSort] = useState("newest")
  const [page, setPage] = useState(1)
  const debounced = useDebouncedValue(search.trim(), 300)
  const { data, isLoading, isError, refetch } = useAdminUsers({
    search: debounced,
    status,
    sort,
    page,
  })

  const resetPage = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  return (
    <>
      <AdminPageHeader title="Clients" description="Everyone who has signed up. Open a client to see their details." />

      <div className="mb-4 flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
            placeholder="Search by name, email or username"
            className="pl-9"
            aria-label="Search clients"
          />
        </div>
        <div className="flex gap-2">
          <Select value={status} onValueChange={resetPage(setStatus)}>
            <SelectTrigger className="w-full md:w-40" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={resetPage(setSort)}>
            <SelectTrigger className="w-full md:w-40" aria-label="Sort clients">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name">Name (A–Z)</SelectItem>
              <SelectItem value="lastLogin">Last login</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError ? (
        <EmptyState title="Couldn't load clients" action={{ label: "Retry", onClick: refetch }} />
      ) : isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : !data.users.length ? (
        <EmptyState title="No clients match these filters" />
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>Client</Th>
                <Th>Status</Th>
                <Th className="text-right">Playlists</Th>
                <Th className="text-right">Likes</Th>
                <Th className="text-right">Plays</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr
                  key={u.userid}
                  onClick={() => navigate(`/admin/users/${u.userid}`)}
                  className="cursor-pointer hover:bg-accent/30"
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={getProfileCloudinaryUrl(u.profilepic)} alt="" />
                        <AvatarFallback className="text-xs">{u.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <button
                          type="button"
                          className="truncate font-medium hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/admin/users/${u.userid}`)
                          }}
                        >
                          {u.name}
                        </button>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <UserStatusBadges user={u} />
                  </Td>
                  <Td className="text-right tabular-nums">{u.playlistCount}</Td>
                  <Td className="text-right tabular-nums">{u.likeCount}</Td>
                  <Td className="text-right tabular-nums">{u.playCount}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} label="clients" />
        </>
      )}
    </>
  )
}

export default AdminUsers
