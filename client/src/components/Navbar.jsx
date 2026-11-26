import { BarChart3, LayoutDashboard, Library, Shield, Users } from "lucide-react"
import { NavLink } from "react-router-dom"
import { useProfile } from "@/Context/Context"
import { cn } from "@/lib/utils"
import ShareInvitesMenu from "./music/ShareInvitesMenu"
import ProfileDropdownMenu from "./ProfileDropdownMenu"
import { Card } from "./ui/card"

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/music", label: "Group", icon: Users },
  { to: "/library", label: "Library", icon: Library },
  { to: "/charts", label: "Top Charts", icon: BarChart3 },
]

const Navbar = () => {
  const { user } = useProfile()
  const items =
    user?.role === "admin" ? [...NAV_ITEMS, { to: "/admin", label: "Admin", icon: Shield }] : NAV_ITEMS

  return (
    <Card className="fixed top-0 z-30 h-14 w-full rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-2 px-3 sm:px-4">
        <span className="hidden font-semibold tracking-tight sm:block">SyncBeat</span>
        <nav className="flex items-center gap-1" aria-label="Main">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                  isActive && "bg-accent text-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <ShareInvitesMenu />
          <ProfileDropdownMenu fromSidebar={false} />
        </div>
      </div>
    </Card>
  )
}

export default Navbar
