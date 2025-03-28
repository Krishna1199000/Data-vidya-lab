"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { DefaultSession } from "next-auth"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ProfileDialog } from "@/components/profile-dialog"
import { LogOut, LayoutDashboard, Plus, Beaker, Pencil, Trash2, Clock, UserCog } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { getRelativeTime } from "@/lib/utilses/format-time"
import { fadeIn, stagger, slideIn, scaleIn, springConfig } from "@/lib/animations/animation"

interface Lab {
  id: string
  title: string
  description: string
  difficulty: string
  duration: number
  published: boolean
  isOwner: boolean
  authorId: string
  createdAt: string
  updatedAt: string
  author: {
    name: string | null
    email: string | null
  }
}

declare module "next-auth" {
  interface Session {
    user?: {
      role?: string | null
      id?: string | null
    } & DefaultSession["user"]
  }
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [labs, setLabs] = useState<Lab[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const isAdmin = session?.user?.role === "ADMIN"

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/auth")
    }
  }, [status, router])

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        const response = await fetch("/api/labs")
        if (!response.ok) throw new Error("Failed to fetch labs")
        const data = await response.json()
        setLabs(data)
      } catch {
        toast.error("Failed to load labs")
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchLabs()
    }
  }, [session?.user?.id])

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error("Only administrators can delete labs")
      return
    }

    const lab = labs.find((l) => l.id === id)
    if (!lab?.isOwner) {
      toast.error("You can only delete your own labs")
      return
    }

    if (!confirm("Are you sure you want to delete this lab?")) return

    try {
      const response = await fetch(`/api/labs/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete lab")
      }

      setLabs(labs.filter((lab) => lab.id !== id))
      toast.success("Lab deleted successfully")
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Failed to delete lab")
      } else {
        toast.error("Failed to delete lab")
      }
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const ownedLabs = labs.filter((lab) => lab.isOwner)

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={stagger}
      className="min-h-screen bg-background dark:bg-gradient-to-b dark:from-background dark:to-background/50"
    >
      <motion.nav variants={slideIn} className="border-b backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div variants={fadeIn} className="flex items-center">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              <span className="ml-2 text-xl font-semibold">Dashboard</span>
            </motion.div>
            <div className="flex items-center gap-4">
              <motion.div variants={fadeIn} className="text-sm">
                Welcome, {session.user?.name || session.user?.email}
                {isAdmin && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="ml-2 text-primary"
                  >
                    (Admin)
                  </motion.span>
                )}
              </motion.div>
              <motion.div variants={fadeIn}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/admin/edit-profile")}
                  className="flex items-center gap-2"
                >
                  <UserCog className="h-4 w-4" />
                  Edit Profile
                </Button>
              </motion.div>
              <ProfileDialog session={session} />
              <ThemeToggle />
              <motion.div variants={fadeIn}>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/auth" })}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {isAdmin && (
            <AnimatePresence mode="wait">
              <motion.div layout>
                <motion.div variants={fadeIn} className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50">
                    Your Labs
                  </h2>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => router.push("/admin/dashboard/create-lab")}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4" />
                      Create New Lab
                    </Button>
                  </motion.div>
                </motion.div>

                {ownedLabs.length === 0 ? (
                  <motion.div variants={scaleIn} transition={springConfig}>
                    <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/5 dark:to-primary/10 mb-8 overflow-hidden relative">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                        animate={{
                          x: ["0%", "100%"],
                        }}
                        transition={{
                          duration: 3,
                          ease: "linear",
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                      />
                      <CardContent className="flex flex-col items-center justify-center py-12 relative">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, ...springConfig }}
                        >
                          <Beaker className="h-12 w-12 text-primary mb-4" />
                        </motion.div>
                        <h3 className="text-xl font-semibold mb-2">No Labs Created Yet</h3>
                        <p className="text-muted-foreground mb-6">Create your first lab to get started</p>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={() => router.push("/admin/dashboard/create-lab")}
                            className="group relative overflow-hidden"
                          >
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Create Lab
                            </div>
                          </Button>
                        </motion.div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {ownedLabs.map((lab, index) => (
                      <motion.div
                        key={lab.id}
                        variants={scaleIn}
                        transition={{
                          delay: index * 0.1,
                          ...springConfig,
                        }}
                      >
                        <Card className="hover:shadow-lg transition-shadow dark:hover:shadow-primary/10 group">
                          <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                              <span className="text-xl font-semibold group-hover:text-primary transition-colors">
                                {lab.title}
                              </span>
                              <div className="flex gap-2">
                                <motion.div whileHover={{ scale: 1.1 }}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.push(`/admin/dashboard/edit-lab/${lab.id}`)}
                                    className="h-8 w-8 hover:text-primary"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.1 }}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(lab.id)}
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </motion.div>
                              </div>
                            </CardTitle>
                            <CardDescription>
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 mt-2"
                              >
                                <span className="px-2 py-1 rounded-full bg-primary/10 text-xs">{lab.difficulty}</span>
                                <span className="text-sm">{lab.duration} minutes</span>
                              </motion.div>
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground line-clamp-2">{lab.description}</p>
                          </CardContent>
                          <CardFooter>
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.5 }}
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                              <Clock className="h-3 w-3" />
                              <span>Created {getRelativeTime(lab.createdAt)}</span>
                              {lab.updatedAt !== lab.createdAt && (
                                <span className="italic">(edited {getRelativeTime(lab.updatedAt)})</span>
                              )}
                            </motion.div>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          <motion.div variants={fadeIn} className="mt-8">
            <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50">
              All Labs
            </h2>
            {labs.length === 0 ? (
              <motion.div variants={scaleIn}>
                <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Beaker className="h-12 w-12 text-primary/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Labs Available</h3>
                    <p className="text-muted-foreground">No labs have been created yet</p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {labs.map((lab, index) => (
                  <motion.div
                    key={lab.id}
                    variants={scaleIn}
                    transition={{
                      delay: index * 0.1,
                      ...springConfig,
                    }}
                  >
                    <Card className="hover:shadow-lg transition-shadow dark:hover:shadow-primary/10 group">
                      <CardHeader>
                        <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors">
                          {lab.title}
                        </CardTitle>
                        <CardDescription>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 mt-2"
                          >
                            <span className="px-2 py-1 rounded-full bg-primary/10 text-xs">{lab.difficulty}</span>
                            <span className="text-sm">{lab.duration} minutes</span>
                          </motion.div>
                          <div className="mt-2 text-sm">by {lab.author.name || lab.author.email}</div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground line-clamp-2">{lab.description}</p>
                      </CardContent>
                      <CardFooter>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <Clock className="h-3 w-3" />
                          <span>Created {getRelativeTime(lab.createdAt)}</span>
                          {lab.updatedAt !== lab.createdAt && (
                            <span className="italic">(edited {getRelativeTime(lab.updatedAt)})</span>
                          )}
                        </motion.div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>
    </motion.div>
  )
}