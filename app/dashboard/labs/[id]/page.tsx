"use client"
import * as React from "react"
import { useEffect, useState, use } from "react"
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
import { Button } from "../../../../ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../ui/Tabs"
import { Badge } from "../../../../ui/badge"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import ErrorBoundary from "../../../../ui/error-boundary"

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

export default function LabPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [lab, setLab] = useState<Lab | null>(null)
  const [loading, setLoading] = useState(true)
  const [authorProfile, setAuthorProfile] = useState<Profile | null>(null)
  const router = useRouter()
  const { status } = useSession()

  useEffect(() => {
    console.log("useEffect triggered with params.id:", resolvedParams.id)
    if (resolvedParams.id) {
      fetchLab()
    }
  }, [resolvedParams.id])

  useEffect(() => {
    if (lab?.author) {
      fetchAuthorProfile()
    }
  }, [lab?.author])

  const fetchAuthorProfile = async () => {
    try {
      if (!lab?.author?.id) {
        console.error('Author ID not available')
        return
      }
      const response = await fetch(`https://data-lab-git-master-krishna-gohils-projects-ed07ca7d.vercel.app/aips/profile/${lab.author.id}`, {
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
  }

  const fetchLab = async () => {
    console.log("Fetching lab data...")
    try {
      const response = await fetch(`https://data-lab-git-master-krishna-gohils-projects-ed07ca7d.vercel.app/aips/labs/${resolvedParams.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) throw new Error("Failed to fetch lab")
      const data = await response.json()
      console.log("Fetched lab data:", data)

      // Extract steps from the nested structure
      let parsedSteps = []
      if (data.steps && data.steps.setup && Array.isArray(data.steps.setup)) {
        parsedSteps = data.steps.setup.map((step: string) => ({
          title: step,
          isLocked: false,
        }))
      }

      setLab({
        ...data,
        steps: parsedSteps,
      })
    } catch (error) {
      console.error("Error fetching lab:", error)
      notFound()
    } finally {
      setLoading(false)
    }
  }

  if (status === "unauthenticated") {
    router.push("/signin")
    return null
  }

  if (loading || !lab) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const breadcrumbs = [{ label: "Training Library", href: "/dashboard/labs" }, { label: lab.title }]

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <nav className="border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={item.label}>
                  {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  {item.href ? (
                    <Link href={item.href} className="text-muted-foreground hover:text-foreground">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-foreground">{item.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="text-xs font-semibold tracking-[3px] text-emerald-600 mb-4">HANDS-ON LAB</div>
            <h1 className="text-3xl font-bold text-foreground mb-4">{lab.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              <span className="font-medium text-foreground">{lab.difficulty}</span>
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
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
              Start lab
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-3 gap-6">
                <div className="p-6 bg-card rounded-lg border border-border">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <PlayCircle className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Get guided in a real environment</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Practice with a step-by-step scenario in a real, provisioned environment.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-card rounded-lg border border-border">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Learn and validate</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Use validations to check your solutions every step of the way.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-card rounded-lg border border-border">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <BarChart className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">See results</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Track your knowledge and monitor your progress.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="about" className="w-full">
                <TabsList className="border-b w-full justify-start rounded-none h-auto p-0 space-x-8">
                  <TabsTrigger
                    value="about"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-foreground px-0"
                  >
                    About
                  </TabsTrigger>
                  <TabsTrigger
                    value="author"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-foreground px-0"
                  >
                    Author
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="about" className="space-y-8 pt-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Description</h2>
                    <div className="prose prose-gray dark:prose-invert max-w-none">
                      <p>{lab.description}</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Lab Objectives</h2>
                    <div className="prose prose-gray dark:prose-invert max-w-none">
                      <ul>
                        {lab.objectives?.map((objective, index) => (
                          <li key={index}>{objective}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {lab.prerequisites && (
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-4">Lab Prerequisites</h2>
                      <div className="prose prose-gray dark:prose-invert max-w-none space-y-2">
                        {Array.isArray(lab.prerequisites) ? (
                          <ul>
                            {lab.prerequisites.map((prerequisite, index) => (
                              <li key={index}>{prerequisite}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>{lab.prerequisites}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Covered Topics</h2>
                    <div className="flex flex-wrap gap-2">
                      {lab.coveredTopics.map((topic, index) => (
                        <Badge key={index} variant="secondary">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Intended Audience</h2>
                    <div className="prose prose-gray dark:prose-invert max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: lab.audience }} />
                    </div>
                  </div>

                  {lab.environmentImageBefore || lab.environmentImageAfter ? (
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-4">Lab Environment</h2>
                      <div className="space-y-6">
                        {lab.environmentImageBefore && (
                          <div>
                            <p className="italic mb-4">
                              Before completing the Lab instructions, the environment will look as follows:
                            </p>
                            <div className="border rounded-lg p-4 bg-card">
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
                            <p className="italic mb-4">
                              After completing the Lab instructions, the environment should look similar to:
                            </p>
                            <div className="border rounded-lg p-4 bg-card">
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
                    <div className="bg-gray-900 rounded-2xl shadow-lg overflow-hidden">
                      {/* Cover Image - Gradient Background */}
                      <div className="h-32 bg-gradient-to-r from-blue-900 to-indigo-900"></div>

                      <div className="relative px-6 pb-8">
                        {/* Author Avatar */}
                        <div className="relative -mt-16 mb-4">
                          {authorProfile?.user?.image ? (
                            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-800 shadow-lg">
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
                            <div className="w-32 h-32 rounded-full border-4 border-gray-800 shadow-lg bg-gray-700 flex items-center justify-center">
                              <Camera className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Author Info */}
                        <div className="space-y-6">
                          {/* Name and Title */}
                          <div>
                            <h3 className="text-2xl font-bold text-white">{lab.author.name}</h3>
                            <p className="text-lg text-gray-400">{lab.author.title}</p>
                          </div>

                          {/* Location and Company */}
                          {authorProfile && (
                            <div className="flex flex-wrap gap-6 text-gray-400">
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
                            <div className="prose prose-invert max-w-none">
                              <p className="text-gray-300 leading-relaxed">{authorProfile.bio}</p>
                            </div>
                          )}

                          {/* Social Links */}
                          <div className="flex flex-wrap gap-4">
                            {authorProfile?.linkedin && (
                              <a
                                href={authorProfile.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center px-4 py-2 bg-gray-800 text-blue-400 rounded-lg hover:bg-gray-700 transition-colors"
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
                                className="flex items-center px-4 py-2 bg-gray-800 text-blue-400 rounded-lg hover:bg-gray-700 transition-colors"
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
                                className="flex items-center px-4 py-2 bg-gray-800 text-blue-400 rounded-lg hover:bg-gray-700 transition-colors"
                              >
                                <Github className="w-5 h-5 mr-2" />
                                GitHub
                              </a>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                            <div className="bg-gray-800 p-4 rounded-lg">
                              <div className="text-4xl font-bold text-blue-400 mb-2">
                                {lab.views?.toLocaleString() || 0}
                              </div>
                              <div className="text-sm text-gray-400">Total Lab Views</div>
                            </div>
                            <div className="bg-gray-800 p-4 rounded-lg">
                              <div className="text-4xl font-bold text-blue-400 mb-2">
                                {lab.rating?.score || 0}/{lab.rating?.total || 5}
                              </div>
                              <div className="text-sm text-gray-400">Average Rating</div>
                            </div>
                            <div className="bg-gray-800 p-4 rounded-lg">
                              <div className="text-4xl font-bold text-blue-400 mb-2">{lab.objectives?.length || 0}</div>
                              <div className="text-sm text-gray-400">Learning Objectives</div>
                            </div>
                          </div>

                          {/* Topics of Expertise */}
                          <div className="mt-8">
                            <h4 className="text-lg font-semibold text-white mb-4">Topics of Expertise</h4>
                            <div className="flex flex-wrap gap-2">
                              {lab.coveredTopics.map((topic, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="bg-gray-700 text-gray-200 hover:bg-gray-600"
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
              <div className="border border-border rounded-lg">
                <div className="p-4 border-b border-border">
                  <h2 className="font-semibold text-foreground">Lab steps</h2>
                </div>
                <div className="divide-y divide-border">
                  {lab.steps && lab.steps.length > 0 ? (
                    lab.steps.map((step, index) => (
                      <div key={index} className="p-4 flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs">
                          {step.isLocked ? <Lock className="h-4 w-4" /> : index + 1}
                        </div>
                        <span className="text-sm text-muted-foreground">{step.title}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">No steps available for this lab.</div>
                  )}
                </div>
              </div>

              <div className="border border-border rounded-lg">
                <div className="p-4 border-b border-border">
                  <h2 className="font-semibold text-foreground">Lab rules apply</h2>
                </div>
                <div className="p-4">
                  <ul className="list-disc pl-4 space-y-2 text-sm text-muted-foreground">
                    <li>Stay within resource usage requirements.</li>
                    <li>Do not engage in or encourage activity that is illegal.</li>
                    <li>Do not engage in cryptocurrency mining.</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-4">
                    Breaking the rules will result in suspension or a ban from the labs product.
                  </p>
                  <Link href="#" className="text-sm text-blue-500 hover:underline block mt-4">
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