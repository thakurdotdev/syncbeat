import { ArrowLeft, BarChart3, LayoutDashboard, ListMusic, Music, Users } from "lucide-react"
import { NavLink, Outlet } from "react-router-dom"
import ProfileDropdownMenu from "@/components/ProfileDropdownMenu"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Clients", icon: Users },
  { to: "/admin/songs", label: "Music", icon: Music },
  { to: "/admin/playlists", label: "Playlists", icon: ListMusic },
  { to: "/admin/charts", label: "Top Charts", icon: BarChart3 },
]

const linkClass = ({ isActive }) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground",
    isActive && "bg-accent font-medium text-foreground",
  )

const AdminLayout = () => (
  <div className="min-h-svh bg-background">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/60 bg-card/40 p-4 lg:flex">
      <div className="mb-6 px-2">
        <p className="text-lg font-bold tracking-tight">SyncBeat</p>
        <p className="text-xs text-muted-foreground">Admin portal</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Admin">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass}>
            <Icon className="h-4 w-4" /> {label}
          </NavLink>
        ))}
      </nav>
      <NavLink to="/music" className={linkClass}>
        <ArrowLeft className="h-4 w-4" /> Back to app
      </NavLink>
    </aside>

    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-border/60 bg-background/90 px-3 backdrop-blur lg:ml-60 lg:px-6">
      <nav className="flex gap-1 overflow-x-auto lg:hidden" aria-label="Admin">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              cn(
                "flex h-9 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground",
                isActive && "bg-accent text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </NavLink>
        ))}
      </nav>
      <p className="hidden text-sm text-muted-foreground lg:block">Signed in as admin</p>
      <ProfileDropdownMenu />
    </header>

    <main className="lg:ml-60">
      <div className="mx-auto max-w-7xl px-3 pb-28 pt-5 sm:px-6 lg:pt-8">
        <Outlet />
      </div>
    </main>
  </div>
)

export default AdminLayout
