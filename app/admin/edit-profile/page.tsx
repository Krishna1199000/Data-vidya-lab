"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail, Building2, MapPin, Github, Twitter, Linkedin, Loader2, Camera } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

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

export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
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
        if (data.user?.image) {
          setImagePreview(data.user.image)
        }
      } catch {
        toast.error("Failed to load profile")
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchProfile()
    }
  }, [session?.user?.id])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB")
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const formData = new FormData(e.currentTarget)
      const response = await fetch(`/api/profile/${session?.user?.id}`, {
        method: "PUT",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      toast.success("Profile updated successfully")
      router.push("/admin/dashboard") // Redirect to dashboard after successful update
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container max-w-2xl mx-auto py-8 px-4"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-background">
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Profile"
                      fill
                      className="object-cover"
                      sizes="128px"
                      onError={() => {
                        setImagePreview(null)
                        toast.error("Failed to load image")
                      }}
                    />
                  ) : (
                    <div className="h-full w-full bg-muted flex items-center justify-center">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="cursor-pointer text-white text-sm">
                      Change Photo
                      <input
                        type="file"
                        name="image"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{session?.user?.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="text-sm">{session?.user?.email}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="bio" className="text-sm font-medium">
                  Bio
                </label>
                <Textarea
                  id="bio"
                  name="bio"
                  defaultValue={profile?.bio || ""}
                  placeholder="Tell us about yourself"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company" className="text-sm font-medium">
                    Company
                  </label>
                  <div className="relative mt-1">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      name="company"
                      defaultValue={profile?.company || ""}
                      className="pl-10"
                      placeholder="Where do you work?"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="location" className="text-sm font-medium">
                    Location
                  </label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      name="location"
                      defaultValue={profile?.location || ""}
                      className="pl-10"
                      placeholder="Where are you based?"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="github" className="text-sm font-medium">
                    GitHub
                  </label>
                  <div className="relative mt-1">
                    <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="github"
                      name="github"
                      defaultValue={profile?.github || ""}
                      className="pl-10"
                      placeholder="GitHub profile URL"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="twitter" className="text-sm font-medium">
                    Twitter
                  </label>
                  <div className="relative mt-1">
                    <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="twitter"
                      name="twitter"
                      defaultValue={profile?.twitter || ""}
                      className="pl-10"
                      placeholder="Twitter profile URL"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="linkedin" className="text-sm font-medium">
                    LinkedIn
                  </label>
                  <div className="relative mt-1">
                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="linkedin"
                      name="linkedin"
                      defaultValue={profile?.linkedin || ""}
                      className="pl-10"
                      placeholder="LinkedIn profile URL"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/dashboard")}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="min-w-[100px]">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}