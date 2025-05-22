"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TinyMCEEditor } from "@/components/ui/tinymce-editor"
import { CombinedLabEditor } from "@/components/ui/combined-lab-editor"
import { CoveredTopicsInput } from "@/components/ui/covered-topics-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload, ImageIcon } from 'lucide-react'
import { motion } from "framer-motion"
import { toast } from "sonner"
import Image from "next/image"

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

const AWS_SERVICES = [
  "EC2", "S3", "Lambda", "RDS", "DynamoDB", "SQS", "SNS", "CloudWatch", "IAM", "VPC", "ECS", "EKS", "CloudFormation", "Route 53", "Elastic Beanstalk", "API Gateway", "CloudFront", "Kinesis", "Redshift", "ElastiCache", "Athena", "Glue", "Step Functions", "Secrets Manager", "Certificate Manager", "WAF", "AppSync", "Cognito", "SageMaker", "Elastic Transcoder", "Direct Connect", "Inspector"
];

export default function CreateLab() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentSection, setCurrentSection] = useState(0)
  const [selectedBeforeFile, setSelectedBeforeFile] = useState<File | null>(null)
  const [selectedAfterFile, setSelectedAfterFile] = useState<File | null>(null)
  const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null)
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState("BEGINNER")
  const totalSections = 3
  const [steps, setSteps] = useState<{ title: string; content: string }[]>([
    { title: 'Step 1', content: '' }
  ])

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
    services: [] as string[],
  })

  const validateCurrentSection = () => {
    switch (currentSection) {
      case 0:
        return formData.title.trim() !== "" && formData.duration.trim() !== ""
      case 1:
        return (
          formData.description.trim() !== "" &&
          formData.audience.trim() !== "" &&
          formData.prerequisites.trim() !== ""
        )
      case 2:
        return formData.coveredTopics.trim() !== ""
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleEditorChange = (name: string, value: string) => {
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

  const addStep = () => {
    setSteps([...steps, { title: `Step ${steps.length + 1}`, content: '' }])
  }

  const removeStep = (index: number) => {
    const newSteps = steps.filter((step, i) => i !== index)
    const renamedSteps = newSteps.map((step, idx) => ({
      ...step,
      title: `Step ${idx + 1}`
    }))
    setSteps(renamedSteps)
  }

  const updateStepTitle = (index: number, title: string) => {
    const newSteps = [...steps]
    newSteps[index].title = title
    setSteps(newSteps)
  }

  const updateStepContent = (index: number, content: string) => {
    const newSteps = [...steps]
    newSteps[index].content = content
    setSteps(newSteps)
  }

  const handleServicesChange = (selected: string[]) => {
    setFormData((prev) => ({
      ...prev,
      services: selected,
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
      .filter(([, value]) => !value)
      .map(([key]) => key)

    if (emptyFields.length > 0) {
      toast.error(`Please fill in all required fields: ${emptyFields.join(", ")}`)
      return
    }

    setIsSubmitting(true)

    try {
      const formDataObj = new FormData()

      // Add basic form data
      formDataObj.set("title", formData.title)
      formDataObj.set("duration", formData.duration)
      formDataObj.set("description", formData.description)
      formDataObj.set("audience", formData.audience)
      formDataObj.set("prerequisites", formData.prerequisites)
      formDataObj.set("difficulty", difficulty)
      formDataObj.set("authorId", (session?.user as { id: string }).id || "")

      // Handle file uploads
      if (selectedBeforeFile) {
        formDataObj.set("environmentImageBefore", selectedBeforeFile)
      }
      if (selectedAfterFile) {
        formDataObj.set("environmentImageAfter", selectedAfterFile)
      }

      // Process objectives and topics
      const objectives = formData.objectives.split("\n").filter(Boolean)
      const coveredTopics = formData.coveredTopics.split("\n").filter(Boolean)
      const environmentUrls = formData.environment.split("\n").filter(Boolean)

      formDataObj.set("objectives", JSON.stringify(objectives))
      formDataObj.set("coveredTopics", JSON.stringify(coveredTopics))
      formDataObj.set("environment", JSON.stringify({ images: environmentUrls }))
      formDataObj.set("services", JSON.stringify(formData.services))

      // Format steps data
      const formattedSteps = steps.map(step => ({
        title: step.title.trim(),
        content: step.content.trim()
      }))

      formDataObj.set("steps", JSON.stringify({
        setup: formattedSteps
      }))

      const response = await fetch("/api/labs", {
        method: "POST",
        body: formDataObj,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create lab")
      }

      toast.success("Lab created successfully!")
      router.push("/admin/dashboard")
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Detailed error:', error.message)
        console.error('Error stack:', error.stack)
        toast.error(error.message || "Failed to create lab. Please try again.")
      } else {
        console.error('An unknown error occurred:', error)
        toast.error("An unexpected error occurred.")
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
          </motion.div>
        )
      case 1:
        return (
          <motion.div {...fadeIn} className="space-y-6">
            <CombinedLabEditor
              description={formData.description}
              objectives={formData.objectives}
              audience={formData.audience}
              prerequisites={formData.prerequisites}
              onDescriptionChange={(value) => handleEditorChange("description", value)}
              onObjectivesChange={(value) => handleEditorChange("objectives", value)}
              onAudienceChange={(value) => handleEditorChange("audience", value)}
              onPrerequisitesChange={(value) => handleEditorChange("prerequisites", value)}
              height={400}
            />
            <div>
              <Label htmlFor="services">AWS Services</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {AWS_SERVICES.map((service) => (
                  <label key={service} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={service}
                      checked={formData.services.includes(service)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleServicesChange([...formData.services, service])
                        } else {
                          handleServicesChange(formData.services.filter((s) => s !== service))
                        }
                      }}
                    />
                    <span>{service}</span>
                  </label>
                ))}
              </div>
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
                            layout="fill"
                            objectFit="cover"
                            className="rounded-lg"
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
                            layout="fill"
                            objectFit="cover"
                            className="rounded-lg"
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
              <Input
                id="environment"
                name="environment"
                placeholder="Enter additional image URLs, one per line"
                value={formData.environment}
                onChange={handleInputChange}
              />
            </div>

            <CoveredTopicsInput
              value={formData.coveredTopics}
              onChange={(value) => handleEditorChange("coveredTopics", value)}
              required={true}
            />

            <div className="space-y-2">
              <Label htmlFor="steps">Lab Steps</Label>
              <div className="space-y-6">
                {steps.map((step, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <Input
                          value={step.title}
                          onChange={(e) => updateStepTitle(index, e.target.value)}
                          placeholder={`Step ${index + 1}`}
                          className="font-semibold"
                        />
                      </div>
                      {steps.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeStep(index)}
                          className="h-8 text-destructive hover:text-destructive/80"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    <TinyMCEEditor
                      id={`step-content-${index}`}
                      name={`step-content-${index}`}
                      value={step.content}
                      onChange={(content) => updateStepContent(index, content)}
                      height={200}
                      placeholder="Enter step instructions here..."
                    />
                  </div>
                ))}
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addStep}
                  className="w-full"
                >
                  Add Step
                </Button>
              </div>
            </div>
          </motion.div>
        )
    }
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
              <CardTitle className="text-2xl font-bold">Create New Lab</CardTitle>
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
                          Creating Lab...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          Create Lab
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