import { yupResolver } from "@hookform/resolvers/yup"
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import * as yup from "yup"
import { adminLogin } from "@/api/admin"
import { errorMessage } from "@/api/http"
import { useProfile } from "@/Context/Context"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const schema = yup.object({
  email: yup.string().trim().required("Email is required").email("Enter a valid email address"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
})

/** Separate sign-in page for the admin portal. Only admin accounts can sign in here. */
const AdminLogin = () => {
  const { user, loading, getProfile } = useProfile()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const form = useForm({ resolver: yupResolver(schema), defaultValues: { email: "", password: "" } })

  useEffect(() => {
    document.title = "SyncBeat Admin - Sign in"
  }, [])

  // Already signed in as admin: go straight to the portal
  if (!loading && user?.role === "admin") {
    const returnTo = params.get("returnTo")
    return <Navigate to={returnTo?.startsWith("/admin") ? returnTo : "/admin"} replace />
  }

  const onSubmit = async (values) => {
    setSubmitting(true)
    setFormError("")
    try {
      await adminLogin(values)
      await getProfile()
      toast.success("Welcome back, admin")
    } catch (error) {
      setFormError(errorMessage(error, "Could not sign in. Please try again."))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">SyncBeat Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage music, clients and playlists.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" autoComplete="username" placeholder="admin@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {formError && (
                <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                Sign in to admin portal
              </Button>
            </form>
          </Form>
        </div>

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mx-auto mt-5 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Not an admin? Go to the user login
        </button>
      </div>
    </div>
  )
}

export default AdminLogin
