"use client"
import * as React from "react"
import { useEffect, useState, useCallback, use } from "react"
import { notFound, useRouter } from "next/navigation"
import {
  PlayCircle,
  CheckCircle,
  BarChart,
  Clock,
  Users,
  Star,
  ChevronRight,
  Lock,
  Github,
  Linkedin,
  Twitter,
  MapPin,
  Building2,
  Camera,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { Badge } from "@/components/ui/badge"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"

import ErrorBoundary from "@/components/ui/error-boundary"

interface Profile {
  id: string
  bio: string
  role: string
  company: string
  location: string
  github: string
  twitter: string
  linkedin: string
  user: {
    name: string
    email: string
    image: string
  }
}

interface Lab {
  id: string
  title: string
  description: string
  difficulty: string
  duration: number
  views: number
  rating: {
    score: number
    total: number
  }
  objectives: string[]
  prerequisites: string | string[]
  environment: {
    before: string
    after: string
  }
  author: {
    id: string
    name: string
    title: string
    image: string
    bio: string
    links: {
      linkedin?: string
      twitter?: string
      github?: string
    }
  }
  steps: {
    title: string
    isLocked: boolean
  }[]
  labRules: {
    rules: string[]
    warning: string
  }
  coveredTopics: string[]
  audience: string
  environmentImageBefore?: string
  environmentImageAfter?: string
}

// Define component props type
interface LabPageProps {
  params: Promise<{ id: string }>;
}

// Use React.FC and explicitly type props
const LabPage: React.FC<LabPageProps> = ({ params }) => {
  const resolvedParams = use(params)
  const [lab, setLab] = useState<Lab | null>(null)
  const [loading, setLoading] = useState(true)
  const [authorProfile, setAuthorProfile] = useState<Profile | null>(null)
  const router = useRouter()
  const { status } = useSession()
  const { toast } = useToast()

  const handleStartLab = () => {
    if (resolvedParams?.id) {
      router.push(`/User/dashboard/labs/${resolvedParams.id}/credentials`);
    } else {
      console.error("Lab ID not resolved yet");
      toast({ title: "Error", description: "Could not determine Lab ID.", variant: "destructive" });
    }
  };

  const fetchAuthorProfile = useCallback(async () => {
    try {
      if (!lab?.author?.id) {
        console.error('Author ID not available')
        return
      }
      const response = await fetch(`/api/profile/${lab.author.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) throw new Error("Failed to fetch author profile")
      const data = await response.json()
      setAuthorProfile(data)
    } catch (error) {
      console.error("Error fetching author profile:", error)
    }
  }, [lab?.author?.id])

  const fetchLab = useCallback(async () => {
    try {
      const response = await fetch(`/api/labs/${resolvedParams.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) throw new Error("Failed to fetch lab")
      const data = await response.json()

      // Extract steps from the nested structure
      let parsedSteps = []
      if (data.steps?.setup && Array.isArray(data.steps.setup)) {
        parsedSteps = data.steps.setup.map((step: { title: string; content: string }) => ({
          title: step.title,
          isLocked: false
        }))
      }

      setLab({
        ...data,
        steps: parsedSteps
      })
    } catch (error) {
      console.error("Error fetching lab:", error)
      notFound()
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.id])

  useEffect(() => {
    console.log("useEffect triggered with params.id:", resolvedParams.id)
    if (resolvedParams.id) {
      fetchLab()
    }
  }, [resolvedParams.id, fetchLab])

  useEffect(() => {
    if (lab?.author) {
      fetchAuthorProfile()
    }
  }, [lab?.author, fetchAuthorProfile])

  if (status === "unauthenticated") {
    router.push("/User/signin")
    return null
  }

  if (loading || !lab) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const breadcrumbs = [{ label: "Training Library", href: "/User/dashboard/labs" }, { label: lab.title }]

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={item.label}>
                  {index > 0 && <ChevronRight className="h-4 w-4 text-gray-600" />}
                  {item.href ? (
                    <Link href={item.href} className="text-gray-600 hover:text-gray-900">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-gray-900">{item.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="text-xs font-semibold tracking-[3px] text-emerald-700 mb-4">HANDS-ON LAB</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{lab.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-700 mb-6">
              <span className="font-medium text-gray-900">{lab.difficulty}</span>
              <span>|</span>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Up to {lab.duration}m</span>
              </div>
              <span>|</span>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{lab.views?.toLocaleString()}</span>
              </div>
              <span>|</span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span>
                  {lab.rating?.score}/{lab.rating?.total}
                </span>
              </div>
            </div>
            
            <Button 
              onClick={handleStartLab}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Start Lab
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <PlayCircle className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Get guided in a real environment</h3>
                      <p className="text-sm text-gray-700 mt-1">
                        Practice with a step-by-step scenario in a real, provisioned environment.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Learn and validate</h3>
                      <p className="text-sm text-gray-700 mt-1">
                        Use validations to check your solutions every step of the way.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <BarChart className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">See results</h3>
                      <p className="text-sm text-gray-700 mt-1">
                        Track your knowledge and monitor your progress.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="about" className="w-full">
                <TabsList className="border-b border-b-gray-200 w-full justify-start rounded-none h-auto p-0 space-x-8 bg-white text-gray-700">
                  <TabsTrigger
                    value="about"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-gray-900 px-0 data-[state=active]:bg-white"
                  >
                    About
                  </TabsTrigger>
                  <TabsTrigger
                    value="author"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-gray-900 px-0 data-[state=active]:bg-white"
                  >
                    Author
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="about" className="space-y-8 pt-6 text-gray-900">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
                    <div className="prose prose-gray max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: lab.description }} />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Lab Objectives</h2>
                    <div className="prose prose-gray max-w-none">
                      {Array.isArray(lab.objectives) ? (
                        <ul>
                          {lab.objectives.map((objective, index) => (
                            <li key={index} dangerouslySetInnerHTML={{ __html: objective }} />
                          ))}
                        </ul>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: lab.objectives }} />
                      )}
                    </div>
                  </div>

                  {lab.prerequisites && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Lab Prerequisites</h2>
                      <div className="prose prose-gray max-w-none space-y-2">
                        {Array.isArray(lab.prerequisites) ? (
                          <ul>
                            {lab.prerequisites.map((prerequisite, index) => (
                              <li key={index} dangerouslySetInnerHTML={{ __html: prerequisite }} />
                            ))}
                          </ul>
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: lab.prerequisites }} />
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Covered Topics</h2>
                    <div className="flex flex-wrap gap-2">
                      {lab.coveredTopics.map((topic, index) => (
                        <Badge key={index} variant="secondary" className="bg-gray-200 text-gray-900 hover:bg-gray-300">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Intended Audience</h2>
                    <div className="prose prose-gray max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: lab.audience }} />
                    </div>
                  </div>

                  {lab.environmentImageBefore || lab.environmentImageAfter ? (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Lab Environment</h2>
                      <div className="space-y-6">
                        {lab.environmentImageBefore && (
                          <div>
                            <p className="italic mb-4 text-gray-700">
                              Before completing the Lab instructions, the environment will look as follows:
                            </p>
                            <div className="border rounded-lg p-4 bg-white border-gray-200">
                              <Image
                                src={lab.environmentImageBefore}
                                alt="Initial lab environment"
                                width={800}
                                height={400}
                                className="w-full"
                                unoptimized
                              />
                            </div>
                          </div>
                        )}
                        {lab.environmentImageAfter && (
                          <div>
                            <p className="italic mb-4 text-gray-700">
                              After completing the Lab instructions, the environment should look similar to:
                            </p>
                            <div className="border rounded-lg p-4 bg-white border-gray-200">
                              <Image
                                src={lab.environmentImageAfter}
                                alt="Final lab environment"
                                width={800}
                                height={400}
                                className="w-full"
                                unoptimized
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </TabsContent>
                <TabsContent value="author" className="pt-6">
                  {lab?.author && (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                      {/* Cover Image - Gradient Background (optional, could replace with solid color) */}
                      <div className="h-32 bg-gray-200"></div>

                      <div className="relative px-6 pb-8 text-gray-900">
                        {/* Author Avatar */}
                        <div className="relative -mt-16 mb-4">
                          {authorProfile?.user?.image ? (
                            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md">
                              <Image
                                src={authorProfile.user.image}
                                alt={lab.author.name}
                                className="h-full w-full object-cover"
                                width={128}
                                height={128}
                                onError={(e) => {
                                  console.error('Image failed to load:', e)
                                  e.currentTarget.src = "/placeholder.svg"
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-32 h-32 rounded-full border-4 border-white shadow-md bg-gray-300 flex items-center justify-center text-gray-700">
                              <Camera className="h-8 w-8" />
                            </div>
                          )}
                        </div>

                        {/* Author Info */}
                        <div className="space-y-6">
                          {/* Name and Title */}
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900">{lab.author.name}</h3>
                            <p className="text-lg text-gray-700">{lab.author.title}</p>
                          </div>

                          {/* Location and Company */}
                          {authorProfile && (
                            <div className="flex flex-wrap gap-6 text-gray-700">
                              {authorProfile.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-5 h-5" />
                                  <span>{authorProfile.location}</span>
                                </div>
                              )}
                              {authorProfile.company && (
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-5 h-5" />
                                  <span>{authorProfile.company}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Bio */}
                          {authorProfile?.bio && (
                            <div className="prose prose-gray max-w-none">
                              <p className="text-gray-700 leading-relaxed">{authorProfile.bio}</p>
                            </div>
                          )}

                          {/* Social Links */}
                          <div className="flex flex-wrap gap-4">
                            {authorProfile?.linkedin && (
                              <a
                                href={authorProfile.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center px-4 py-2 bg-gray-200 text-blue-700 rounded-lg hover:bg-gray-300 transition-colors"
                              >
                                <Linkedin className="w-5 h-5 mr-2" />
                                LinkedIn
                              </a>
                            )}
                            {authorProfile?.twitter && (
                              <a
                                href={authorProfile.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center px-4 py-2 bg-gray-200 text-blue-700 rounded-lg hover:bg-gray-300 transition-colors"
                              >
                                <Twitter className="w-5 h-5 mr-2" />
                                Twitter
                              </a>
                            )}
                            {authorProfile?.github && (
                              <a
                                href={authorProfile.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center px-4 py-2 bg-gray-200 text-blue-700 rounded-lg hover:bg-gray-300 transition-colors"
                              >
                                <Github className="w-5 h-5 mr-2" />
                                GitHub
                              </a>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                            <div className="bg-gray-100 p-4 rounded-lg text-gray-900">
                              <div className="text-4xl font-bold text-emerald-700 mb-2">
                                {lab.views?.toLocaleString() || 0}
                              </div>
                              <div className="text-sm text-gray-700">Total Lab Views</div>
                            </div>
                            <div className="bg-gray-100 p-4 rounded-lg text-gray-900">
                              <div className="text-4xl font-bold text-emerald-700 mb-2">
                                {lab.rating?.score || 0}/{lab.rating?.total || 5}
                              </div>
                              <div className="text-sm text-gray-700">Average Rating</div>
                            </div>
                            <div className="bg-gray-100 p-4 rounded-lg text-gray-900">
                              <div className="text-4xl font-bold text-emerald-700 mb-2">{lab.objectives?.length || 0}</div>
                              <div className="text-sm text-gray-700">Learning Objectives</div>
                            </div>
                          </div>

                          {/* Topics of Expertise */}
                          <div className="mt-8">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Topics of Expertise</h4>
                            <div className="flex flex-wrap gap-2">
                              {lab.coveredTopics.map((topic, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="bg-gray-200 text-gray-900 hover:bg-gray-300"
                                >
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg bg-white">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">Lab steps</h2>
                </div>
                <div className="divide-y divide-gray-200 text-gray-900">
                  {lab.steps && lab.steps.length > 0 ? (
                    lab.steps.map((step, index) => (
                      <div key={index} className="p-4 flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 text-xs text-gray-700">
                          {step.isLocked ? <Lock className="h-4 w-4 text-gray-700" /> : index + 1}
                        </div>
                        <span className="text-sm text-gray-900">{step.title}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-gray-700">No steps available for this lab.</div>
                  )}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg bg-white">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">Lab rules apply</h2>
                </div>
                <div className="p-4 text-gray-900">
                  <ul className="list-disc pl-4 space-y-2 text-sm text-gray-700">
                    <li>Stay within resource usage requirements.</li>
                    <li>Do not engage in or encourage activity that is illegal.</li>
                    <li>Do not engage in cryptocurrency mining.</li>
                  </ul>
                  <p className="text-sm text-gray-700 mt-4">
                    Breaking the rules will result in suspension or a ban from the labs product.
                  </p>
                  <Link href="#" className="text-sm text-blue-700 hover:underline block mt-4">
                    Read general Terms of Service
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default LabPage;