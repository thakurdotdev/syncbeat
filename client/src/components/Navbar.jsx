import ProfileDropdownMenu from "./ProfileDropdownMenu"
import { Card } from "./ui/card"

const Navbar = () => {
  return (
    <Card className="fixed top-0 w-full z-10 rounded-none h-14">
      <div className="mx-auto px-4">
        <div className="flex justify-around items-center py-1">
          <div>Group Player</div>
          <div className="flex items-center gap-3">
            <ProfileDropdownMenu fromSidebar={false} />
          </div>
        </div>
      </div>
    </Card>
  )
}

export default Navbar
