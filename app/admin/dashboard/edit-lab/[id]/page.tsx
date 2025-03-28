"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, ImageIcon } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"
import { toast } from "sonner"

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
}

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export default function EditLab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentSection, setCurrentSection] = useState(0)
  const [selectedBeforeFile, setSelectedBeforeFile] = useState<File | null>(null)
  const [selectedAfterFile, setSelectedAfterFile] = useState<File | null>(null)
  const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null)
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState("BEGINNER")
  const totalSections = 4

  const [formData, setFormData] = useState({
    title: "",
    difficulty: "BEGINNER",
    duration: "",
    description: "",
    audience: "",
    prerequisites: "",
    objectives: "",
    coveredTopics: "",
    environment: "",
    steps: "",
  })

  useEffect(() => {
    const fetchLab = async () => {
      try {
        const response = await fetch(`/api/labs/${id}`)
        if (!response.ok) throw new Error("Failed to fetch lab")
        const lab = await response.json()

        setFormData({
          title: lab.title,
          difficulty: lab.difficulty,
          duration: lab.duration.toString(),
          description: lab.description,
          audience: lab.audience,
          prerequisites: lab.prerequisites,
          objectives: lab.objectives.join("\n"),
          coveredTopics: lab.coveredTopics.join("\n"),
          environment: lab.environment.images?.join("\n") || "",
          steps: lab.steps.setup?.join("\n") || "",
        })

        setDifficulty(lab.difficulty)
        if (lab.environmentImageBefore) {
          setBeforeImagePreview(lab.environmentImageBefore)
        }
        if (lab.environmentImageAfter) {
          setAfterImagePreview(lab.environmentImageAfter)
        }
      } catch {
        toast.error("Failed to load lab")
        router.push("/admin/dashboard")
      } finally {
        setIsLoading(false)
      }
    }

    if ((session?.user as { id: string })?.id) {
      fetchLab()
    }
  }, [id, session?.user, router])

  const validateCurrentSection = () => {
    switch (currentSection) {
      case 0:
        return formData.title.trim() !== "" && formData.duration.trim() !== "" && formData.description.trim() !== ""
      case 1:
        return formData.audience.trim() !== "" && formData.prerequisites.trim() !== ""
      case 2:
        return formData.coveredTopics.trim() !== ""
      case 3:
        return formData.steps.trim() !== ""
      default:
        return false
    }
  }

  const handleNext = () => {
    if (validateCurrentSection()) {
      setCurrentSection(Math.min(totalSections - 1, currentSection + 1))
    } else {
      toast.error("Please fill in all required fields before proceeding")
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB")
        return
      }
      if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
        toast.error("Only JPEG, PNG and GIF files are allowed")
        return
      }

      if (type === 'before') {
        setSelectedBeforeFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
          setBeforeImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setSelectedAfterFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
          setAfterImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleDifficultyChange = (value: string) => {
    setDifficulty(value)
    setFormData((prev) => ({
      ...prev,
      difficulty: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const requiredFields = {
      title: formData.title.trim(),
      duration: formData.duration.trim(),
      description: formData.description.trim(),
      audience: formData.audience.trim(),
      prerequisites: formData.prerequisites.trim(),
    }

    const emptyFields = Object.entries(requiredFields)
      .filter(([ value]) => !value)
      .map(([key]) => key)

    if (emptyFields.length > 0) {
      toast.error(`Please fill in all required fields: ${emptyFields.join(", ")}`)
      return
    }

    setIsSubmitting(true)

    try {
      const formDataObj = new FormData()

      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        formDataObj.set(key, value)
      })

      // Add the files if selected
      if (selectedBeforeFile) {
        formDataObj.set("environmentImageBefore", selectedBeforeFile)
      }
      if (selectedAfterFile) {
        formDataObj.set("environmentImageAfter", selectedAfterFile)
      }

      // Process arrays
      const objectives = formData.objectives.split("\n").filter(Boolean)
      const coveredTopics = formData.coveredTopics.split("\n").filter(Boolean)
      const environmentUrls = formData.environment.split("\n").filter(Boolean)
      const steps = formData.steps.split("\n").filter(Boolean)

      formDataObj.set("objectives", JSON.stringify(objectives))
      formDataObj.set("coveredTopics", JSON.stringify(coveredTopics))
      formDataObj.set("environment", JSON.stringify({ images: environmentUrls }))
      formDataObj.set("steps", JSON.stringify({ setup: steps }))

      const response = await fetch(`/api/labs/${id}`, {
        method: "PUT",
        body: formDataObj,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update lab")
      }

      toast.success("Lab updated successfully!")
      router.push("/admin/dashboard")
    } catch (error: unknown) {
      console.error("Error:", error)
      if (error instanceof Error) {
        toast.error(error.message || "Failed to update lab")
      } else {
        toast.error("Failed to update lab")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderFormSection = () => {
    switch (currentSection) {
      case 0:
        return (
          <motion.div {...fadeIn} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                className="transition-all duration-200 focus:ring-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select name="difficulty" value={difficulty} onValueChange={handleDifficultyChange}>
                  <SelectTrigger id="difficulty">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Beginner</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="ADVANCED">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  type="number"
                  id="duration"
                  name="duration"
                  required
                  min="1"
                  value={formData.duration}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                required
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>
          </motion.div>
        )
      case 1:
        return (
          <motion.div {...fadeIn} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="objectives">Objectives (one per line)</Label>
              <Textarea
                id="objectives"
                name="objectives"
                required
                value={formData.objectives}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">Target Audience</Label>
              <Textarea
                id="audience"
                name="audience"
                required
                value={formData.audience}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prerequisites">Prerequisites</Label>
              <Textarea
                id="prerequisites"
                name="prerequisites"
                required
                value={formData.prerequisites}
                onChange={handleInputChange}
              />
            </div>
          </motion.div>
        )
      case 2:
        return (
          <motion.div {...fadeIn} className="space-y-6">
            <div className="space-y-4">
              <Label>Environment Images</Label>
              <div className="grid grid-cols-2 gap-4">
                {/* Before Image Upload */}
                <div className="space-y-2">
                  <Label>Before Image</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    <input
                      type="file"
                      id="environmentImageBefore"
                      name="environmentImageBefore"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={(e) => handleFileChange(e, 'before')}
                      className="hidden"
                    />
                    <label
                      htmlFor="environmentImageBefore"
                      className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                    >
                      {beforeImagePreview ? (
                        <div className="relative w-full aspect-video">
                          <Image
                            src={beforeImagePreview}
                            alt="Before Preview"
                            className="rounded-lg object-cover w-full h-full"
                            layout="fill"
                            objectFit="cover"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                          <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground mt-2">Upload Before Image</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* After Image Upload */}
                <div className="space-y-2">
                  <Label>After Image</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    <input
                      type="file"
                      id="environmentImageAfter"
                      name="environmentImageAfter"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={(e) => handleFileChange(e, 'after')}
                      className="hidden"
                    />
                    <label
                      htmlFor="environmentImageAfter"
                      className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                    >
                      {afterImagePreview ? (
                        <div className="relative w-full aspect-video">
                          <Image
                            src={afterImagePreview}
                            alt="After Preview"
                            className="rounded-lg object-cover w-full h-full"
                            layout="fill"
                            objectFit="cover"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                          <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground mt-2">Upload After Image</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Additional Environment URLs (one per line)</Label>
              <Textarea
                id="environment"
                name="environment"
                placeholder="Enter additional image URLs, one per line"
                value={formData.environment}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coveredTopics">Covered Topics (one per line)</Label>
              <Textarea
                id="coveredTopics"
                name="coveredTopics"
                required
                value={formData.coveredTopics}
                onChange={handleInputChange}
              />
            </div>
          </motion.div>
        )
      case 3:
        return (
          <motion.div {...fadeIn} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="steps">Steps (one per line)</Label>
              <Textarea
                id="steps"
                name="steps"
                required
                className="min-h-[200px]"
                value={formData.steps}
                onChange={handleInputChange}
              />
            </div>
          </motion.div>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={stagger}
      className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div {...fadeIn}>
          <Button variant="ghost" onClick={() => router.back()} className="mb-6 hover:bg-secondary/50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </motion.div>

        <motion.div {...fadeIn}>
          <Card className="backdrop-blur-sm bg-card/95">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Edit Lab</CardTitle>
              <CardDescription>
                Step {currentSection + 1} of {totalSections}
              </CardDescription>
              <div className="w-full bg-secondary/30 h-2 rounded-full mt-4">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${((currentSection + 1) / totalSections) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {renderFormSection()}

                <div className="flex justify-between mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                    disabled={currentSection === 0}
                  >
                    Previous
                  </Button>

                  {currentSection === totalSections - 1 ? (
                    <Button type="submit" disabled={isSubmitting || !validateCurrentSection()}>
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            className="h-4 w-4 border-2 border-white rounded-full border-t-transparent"
                          />
                          Updating Lab...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Save Changes
                        </div>
                      )}
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleNext}>
                      Next
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}