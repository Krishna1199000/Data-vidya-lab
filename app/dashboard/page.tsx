'use client'

import { useEffect } from "react"
import { motion } from "framer-motion"
import { signOut, useSession } from "next-auth/react"
import { Button } from "../../ui/button"
import { useTheme } from "next-themes"
import { LogOut } from 'lucide-react'
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const { setTheme } = useTheme()
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    setTheme("dark")
  }, [setTheme])

  // Handle loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Handle unauthenticated state
  if (status === "unauthenticated") {
    router.push("/signin")
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8"
      >
        <div className="flex items-center justify-between mb-8">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold text-primary"
          >
            Welcome, {session?.user?.name || 'User'}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-accent"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Logout</span>
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 * (i + 1) }}
              className="rounded-lg p-6 bg-gradient-to-br from-accent to-background border border-border"
            >
              <div className="h-32 flex items-center justify-center">
                <p className="text-muted-foreground">Coming Soon</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

