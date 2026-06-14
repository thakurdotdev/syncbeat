import { memo } from "react"

const Footer = memo(() => {
  return (
    <footer>
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-5">
          <p className="text-sm text-white/30">
            © {new Date().getFullYear()} SyncVibe. All rights reserved.
          </p>
          <p className="text-sm text-white/30">Made with ♥ by Chandan Kumar</p>
        </div>
      </div>
    </footer>
  )
})

export default Footer
