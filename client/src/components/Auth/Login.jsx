import { yupResolver } from "@hookform/resolvers/yup"
import axios from "axios"
import { Eye, EyeOff, Loader2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import * as yup from "yup"
import { useProfile } from "@/Context/Context"
import { homePathFor } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import ForgotPassword from "./ForgotPassword"

const validationSchema = yup.object().shape({
  email: yup.string().required("Email is required").email("Email is Invalid"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
})

const Login = () => {
  document.title = "SyncVibe - Login"
  window.scrollTo(0, 0)
  const { user, loading: loadingPro, getProfile } = useProfile()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get("returnTo")

  const form = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  useEffect(() => {
    if (!loadingPro && user?.email) {
      // Admins go to the admin portal unless they were sent here from a specific page
      navigate(returnTo || homePathFor(user))
    }
  }, [loadingPro, user, navigate, returnTo])

  const handleFormSubmit = async (data) => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/login`,
        data,
        { withCredentials: true },
      )

      if (response.status === 200) {
        // The effect above redirects once the profile (and role) has loaded
        getProfile()
        toast.success("Logged in successfully")
      }
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  const handleError = (error) => {
    const errorMessage =
      error.response?.data?.message || error.message || "An error occurred. Please try again."
    toast.error(errorMessage)
  }

  const togglePasswordVisibility = () => setShowPassword(!showPassword)

  return (
    <div className="min-h-svh flex flex-col justify-center items-center p-6 bg-[#050505] relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-[120px]" />

      <Card className="w-full max-w-sm z-10 bg-white/3 border-white/8 backdrop-blur-xs">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Login to SyncVibe</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="Email"
                        autoComplete="username webauthn"
                      />
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
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          autoComplete="current-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <ForgotPassword />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register"}
              className="text-primary underline-offset-4 hover:underline"
            >
              Register
            </Link>
          </div>
          <Link
            to="/admin/login"
            className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Admin? Sign in to the admin portal
          </Link>
          {/* <Button
            variant="outline"
            onClick={() => {
              window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google?client=${window.location.origin}`
            }}
            className="w-full"
            disabled={loading}
          >
            <img src={googleIcon} alt="Google" className="w-4 h-4 mr-2" />
            Login with Google
          </Button> */}
        </CardFooter>
      </Card>
    </div>
  )
}

export default Login
