import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Route, BrowserRouter as Router, Routes } from "react-router-dom"
import "./App.css"
import { ChatProvider } from "./Context/ChatContext"
import { ContextProvider } from "./Context/Context"
import { GroupMusicProvider } from "./Context/GroupMusicContext"
import { ThemeProvider } from "./Context/ThemeProvider"
import { Toaster } from "./components/ui/sonner"
import {
  AdminRoutes,
  adminLoginRoute,
  adminRoutes,
  ProtectedRoutes,
  PublicRoutes,
  privateRoutes,
  publicRoutes,
} from "./Routes"

const queryClient = new QueryClient()

function AppRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoutes />}>
        {privateRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Route>

      <Route path={adminLoginRoute.path} element={adminLoginRoute.element} />
      <Route path="/admin" element={<AdminRoutes />}>
        {adminRoutes.map((route) => (
          <Route
            key={route.path || "index"}
            index={route.index}
            path={route.path}
            element={route.element}
          />
        ))}
      </Route>

      <Route element={<PublicRoutes />}>
        {publicRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <ContextProvider>
            <ChatProvider>
              <GroupMusicProvider>
                <Toaster position="bottom-right" />
                <AppRoutes />
              </GroupMusicProvider>
            </ChatProvider>
          </ContextProvider>
        </ThemeProvider>
      </Router>
    </QueryClientProvider>
  )
}

export default App
