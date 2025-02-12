'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { signUp, verifyOtp } from "../actions/auth"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { Icons } from "../components/icons"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation";

const signUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Invalid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [phone, setPhone] = useState("")
  const router = useRouter()

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
    },
  })

  async function onSubmit(data: z.infer<typeof signUpSchema>) {
    try {
      setIsLoading(true)
      const result = await signUp(data)
      if (result.success) {
        setPhone(data.phone)
        setShowOtp(true)
        toast.success("OTP sent to your phone")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  async function onVerifyOtp(otp: string) {
    try {
      setIsLoading(true)
      const result = await verifyOtp({ phone, otp })
      if (result.success) {
        toast.success("Account created successfully")
        // Sign in the user automatically
        const signInResult = await signIn("credentials", {
          email: form.getValues("email"),
          password: form.getValues("password"),
          redirect: false,
        })

        if (signInResult?.error) {
          toast.error("Error signing in")
          router.push("/signin")
          return
        }

        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      toast.error("Invalid OTP")
    } finally {
      setIsLoading(false)
    }
  }

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
              Create an account
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your details below to create your account
            </p>
          </div>

          {!showOtp ? (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  type="text"
                  disabled={isLoading}
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
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
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+1234567890"
                  type="tel"
                  disabled={isLoading}
                  {...form.register("phone")}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.phone.message}
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
                Sign up
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  placeholder="123456"
                  type="text"
                  disabled={isLoading}
                  onChange={(e) => {
                    if (e.target.value.length === 6) {
                      onVerifyOtp(e.target.value)
                    }
                  }}
                  maxLength={6}
                />
              </div>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            type="button"
            disabled={isLoading}
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            <Icons.google className="mr-2 h-4 w-4" />
            Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/signin" className="underline underline-offset-4 hover:text-primary">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

