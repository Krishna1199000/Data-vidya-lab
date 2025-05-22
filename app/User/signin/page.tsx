'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/icons"
import { signIn, useSession } from "next-auth/react"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"

const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
})

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { data: session, status } = useSession()

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(data: z.infer<typeof signInSchema>) {
    try {
      setIsLoading(true)
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error("Invalid credentials")
        setIsLoading(false)
        return
      }

      let sessionCheckInterval: NodeJS.Timeout | null = null
      const sessionCheckTimeout = setTimeout(() => {
        if (status === "authenticated" && session?.user?.role) {
          handleRoleRedirect(session.user.role)
        } else {
          console.warn("Session did not update within timeout, forcing redirect.")
          router.push("/User/dashboard/labs")
          router.refresh()
        }
        setIsLoading(false)
      }, 2000)

      sessionCheckInterval = setInterval(() => {
        if (status === "authenticated" && session?.user?.role) {
          clearInterval(sessionCheckInterval!)
          clearTimeout(sessionCheckTimeout)
          toast.success("Successfully signed in")
          handleRoleRedirect(session.user.role)
          setIsLoading(false)
        }
      }, 200)
    } catch (error) {
      console.error("Sign in error:", error)
      toast.error("Something went wrong")
      setIsLoading(false)
    }
  }

  const handleRoleRedirect = (role: string) => {
    if (role === "ADMIN") {
      router.push("/admin/Profile")
    } else {
      router.push("/User/dashboard/labs")
    }
    router.refresh()
  }

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      handleRoleRedirect(session.user.role)
    }
  }, [status, session, router])

  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Icons.logo className="mr-2 h-6 w-6" />
          Lab Platform
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your details to sign in to your account
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="name@example.com"
                type="email"
                disabled={isLoading}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                placeholder="********"
                type="password"
                disabled={isLoading}
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/User/signup" className="underline underline-offset-4 hover:text-primary">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
