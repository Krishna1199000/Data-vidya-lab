"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Clock, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"  
import { Checkbox } from "@/components/ui/checkbox"
import type { Lab } from "../../types/lab" 

const FILTER_OPTIONS = {
  topics: ["Web Development", "Mobile Development", "Cloud Computing", "DevOps", "Data Science", "Machine Learning"],
  contentTypes: ["Course", "Tutorial", "Workshop", "Documentation", "Video", "Interactive"],
  levels: ["Beginner", "Intermediate", "Advanced"],
  platforms: ["Web", "iOS", "Android", "Cross-platform"],
  programming: ["JavaScript", "Python", "Java", "C++", "Ruby", "Go"],
  tools: ["VS Code", "Git", "Docker", "Kubernetes", "AWS", "Firebase"],
}

const LabIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-emerald-500"
  >
    <rect width="32" height="32" rx="6" fill="currentColor" />
    <path d="M10 24h12c.667 0 1-.333 1-1 0-2.667-3-8-3-8V9h1V8H11v1h1v6s-3 5.333-3 8c0 .667.333 1 1 1z" fill="white" />
    <path d="M13 9h6v6l2.5 6h-11l2.5-6V9z" stroke="white" strokeWidth="1" fill="none" />
  </svg>
)

const FilterSection = ({ title, options }: { title: string; options: string[] }) => (
  <div className="space-y-3">
    <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    <div className="space-y-2">
      {options.map((option) => (
        <div key={option} className="flex items-center space-x-2">
          <Checkbox id={option} />
          <label
            htmlFor={option}
            className="text-sm font-medium leading-none text-gray-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {option}
          </label>
        </div>
      ))}
    </div>
  </div>
)

export default function LabsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [labs, setLabs] = useState<Lab[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLabs()
  }, [])

  const fetchLabs = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/labs", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },        
        credentials: "include",
        mode: "cors",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setLabs(data)
    } catch (error) {
      console.error("Error fetching labs:", error)
      setError("Failed to fetch labs. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const handleLabClick = (labId: string) => {
    router.push(`/User/dashboard/labs/${labId}`)
  }

  const filteredLabs = labs.filter(
    (lab) =>
      lab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500">{error}</p>
          <button onClick={fetchLabs} className="text-emerald-600 hover:underline">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Explore all library</h1>
          <div className="flex items-center gap-4">
            <div className="relative w-[400px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="search"
                placeholder="Search in our library..."
                className="pl-9 bg-white border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 text-gray-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border-gray-200 hover:bg-gray-50"
                >
                  Filters
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl bg-white">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-gray-900">Filters</DialogTitle>
                    <Button variant="ghost" size="icon" onClick={() => setIsFilterOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <DialogDescription className="text-gray-600">
                    Filter labs by topic, content type, level, platform, programming language, and tools.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 p-4">
                  <FilterSection title="Topic" options={FILTER_OPTIONS.topics} />
                  <FilterSection title="Content type" options={FILTER_OPTIONS.contentTypes} />
                  <FilterSection title="Level" options={FILTER_OPTIONS.levels} />
                  <FilterSection title="Platform" options={FILTER_OPTIONS.platforms} />
                  <FilterSection title="Programming" options={FILTER_OPTIONS.programming} />
                  <FilterSection title="Tool" options={FILTER_OPTIONS.tools} />
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsFilterOpen(false)}
                    className="text-gray-700 bg-white border-gray-200 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => setIsFilterOpen(false)}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Apply Filters
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredLabs.map((lab) => (
            <Card
              key={lab.id}
              className="overflow-hidden bg-white border border-gray-200 hover:border-emerald-500 transition-colors cursor-pointer hover:-translate-y-1 duration-200 shadow-sm"
              onClick={() => handleLabClick(lab.id)}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <LabIcon />
                  <span className="text-xs font-semibold tracking-[3px] text-emerald-600">HANDS-ON LAB</span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">{lab.title}</h2>
                  <div className="text-sm text-gray-600 line-clamp-2" dangerouslySetInnerHTML={{ __html: lab.description }} />
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {lab.difficulty.charAt(0) + lab.difficulty.slice(1).toLowerCase()}
                    </span>
                    <span className="text-gray-300">|</span>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Up to {lab.duration}m</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{lab.objectives.length} Lab steps</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}