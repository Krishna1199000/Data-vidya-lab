"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { User, Mail, Shield, Building2, MapPin, Github, Twitter, Linkedin, Loader2, Camera } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"
import type { Session } from "next-auth"
import { toast } from "sonner"

interface Profile {
  bio: string | null
  role: string | null
  company: string | null
  location: string | null
  github: string | null
  twitter: string | null
  linkedin: string | null
  user: {
    name: string | null
    email: string | null
    image: string | null
  }
}

interface ProfileDialogProps {
  session: Session | null
}

export function ProfileDialog({ session }: ProfileDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/profile/${session?.user?.id}`)
        if (!response.ok) {
          if (response.status !== 404) {
            throw new Error("Failed to fetch profile")
          }
          return
        }
        const data = await response.json()
        setProfile(data)
      } catch (error) {
        console.error('Profile fetch error:', error)
        toast.error("Failed to load profile")
      } finally {
        setIsLoading(false)
      }
    }

    if (isOpen && session?.user?.id) {
      fetchProfile()
    }
  }, [isOpen, session?.user?.id])

  if (!session?.user) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Profile Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="border-none shadow-none">
              <CardHeader className="pb-4">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    {profile?.user?.image ? (
                      <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-background">
                        <Image
                          src={profile.user.image}
                          alt={profile.user.name || "Profile"}
                          className="h-full w-full object-cover"
                          layout="fill"
                          objectFit="cover"
                          onError={(e) => {
                            console.error('Image failed to load:', e)
                            e.currentTarget.src = "/placeholder.svg"
                            toast.error("Failed to load profile image")
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border-4 border-background">
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-2xl font-bold text-center">{profile?.user?.name || session.user.name || "User"}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="text-sm">{profile?.user?.email || session.user.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm capitalize">{profile?.role || "User"}</span>
                </div>
                {profile && (
                  <>
                    {profile.company && (
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        <span className="text-sm">{profile.company}</span>
                      </div>
                    )}
                    {profile.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <span className="text-sm">{profile.location}</span>
                      </div>
                    )}
                    {profile.bio && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium">About</h4>
                        <p className="text-sm text-muted-foreground">{profile.bio}</p>
                      </div>
                    )}
                    <div className="flex gap-4 mt-6 justify-center">
                      {profile.github && (
                        <a
                          href={profile.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Github className="h-5 w-5" />
                          <span className="sr-only">GitHub Profile</span>
                        </a>
                      )}
                      {profile.twitter && (
                        <a
                          href={profile.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Twitter className="h-5 w-5" />
                          <span className="sr-only">Twitter Profile</span>
                        </a>
                      )}
                      {profile.linkedin && (
                        <a
                          href={profile.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Linkedin className="h-5 w-5" />
                          <span className="sr-only">LinkedIn Profile</span>
                        </a>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  )
}