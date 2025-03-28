"use client"
import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Github, Twitter, Linkedin, Upload, Camera, AlertCircle } from "lucide-react"
import Image from 'next/image'

function Profile() {
  const [profile, setProfile] = useState({
    bio: "",
    twitter: "",
    linkedin: "",
    github: "",
    company: "",
    location: "",
    image: null as File | null,
    imagePreview: "",
  })


  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const errors: Record<string, string> = {}
    const requiredFields = ['bio', 'twitter', 'linkedin', 'github', 'company', 'location']
    
    requiredFields.forEach(field => {
      if (!profile[field as keyof typeof profile]) {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`
      }
    })

    if (!profile.image) {
      errors.image = 'Profile image is required'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log("Selected file:", {
        name: file.name,
        size: file.size,
        type: file.type
      })

      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds the limit of 5MB")
        return
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError("Please upload an image file")
        return
      }

      setProfile((prev) => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file),
      }))
      setError(null)
      setFieldErrors(prev => ({ ...prev, image: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      setError("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)

    try {
      console.log("Starting form submission")
      const formData = new FormData()

      // Append all fields, including empty ones
      Object.entries(profile).forEach(([key, value]) => {
        if (key !== 'imagePreview') {
          console.log(`Adding to FormData: ${key}`, value instanceof File ? 'File' : value)
          formData.append(key, value || '') // Send empty string for empty fields
        }
      })

      console.log("Sending request to /admin/api/profile")
      const response = await fetch("/api/profile", {
        method: "POST",
        body: formData,
      })

      console.log("Response status:", response.status)
      const data = await response.json()
      console.log("Profile data:", data); // Log to check response
      setProfile(data);



      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to update profile")
      }

      // Redirect to dashboard on success
      window.location.href = "/admin/dashboard"
    } catch (error) {
      console.error("Error updating profile:", error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="relative w-32 h-32 mx-auto">
          <div className={`w-full h-full rounded-full overflow-hidden border-2 ${fieldErrors.image ? 'border-red-500' : 'border-gray-200'}`}>
            {profile.imagePreview ? (
              <Image
                src={profile.imagePreview}
                alt="Profile preview"
                layout="fill"
                objectFit="cover"
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <label
            htmlFor="image-upload"
            className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg cursor-pointer hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" />
            <input 
              id="image-upload" 
              type="file" 
              accept="image/*"
              onChange={handleImageChange} 
              className="hidden" 
              required
            />
          </label>
          {fieldErrors.image && (
            <div className="text-red-500 text-xs mt-2 text-center">{fieldErrors.image}</div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm text-center bg-red-50 p-3 rounded">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <textarea
              placeholder="Tell us about yourself... *"
              value={profile.bio}
              onChange={(e) => {
                setProfile((prev) => ({ ...prev, bio: e.target.value }))
                setFieldErrors(prev => ({ ...prev, bio: '' }))
              }}
              className={`w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 ${
                fieldErrors.bio ? 'border-red-500' : ''
              }`}
              rows={4}
              required
            />
            {fieldErrors.bio && (
              <div className="text-red-500 text-xs mt-1">{fieldErrors.bio}</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className={`flex items-center space-x-2 p-3 border rounded-lg ${
                fieldErrors.twitter ? 'border-red-500' : ''
              }`}>
                <Twitter className="w-5 h-5 text-blue-400" />
                <input
                  type="text"
                  placeholder="Twitter username *"
                  value={profile.twitter}
                  onChange={(e) => {
                    setProfile((prev) => ({ ...prev, twitter: e.target.value }))
                    setFieldErrors(prev => ({ ...prev, twitter: '' }))
                  }}
                  className="flex-1 focus:outline-none"
                  required
                />
              </div>
              {fieldErrors.twitter && (
                <div className="text-red-500 text-xs mt-1">{fieldErrors.twitter}</div>
              )}
            </div>

            <div>
              <div className={`flex items-center space-x-2 p-3 border rounded-lg ${
                fieldErrors.linkedin ? 'border-red-500' : ''
              }`}>
                <Linkedin className="w-5 h-5 text-blue-700" />
                <input
                  type="text"
                  placeholder="LinkedIn username *"
                  value={profile.linkedin}
                  onChange={(e) => {
                    setProfile((prev) => ({ ...prev, linkedin: e.target.value }))
                    setFieldErrors(prev => ({ ...prev, linkedin: '' }))
                  }}
                  className="flex-1 focus:outline-none"
                  required
                />
              </div>
              {fieldErrors.linkedin && (
                <div className="text-red-500 text-xs mt-1">{fieldErrors.linkedin}</div>
              )}
            </div>

            <div>
              <div className={`flex items-center space-x-2 p-3 border rounded-lg ${
                fieldErrors.github ? 'border-red-500' : ''
              }`}>
                <Github className="w-5 h-5" />
                <input
                  type="text"
                  placeholder="GitHub username *"
                  value={profile.github}
                  onChange={(e) => {
                    setProfile((prev) => ({ ...prev, github: e.target.value }))
                    setFieldErrors(prev => ({ ...prev, github: '' }))
                  }}
                  className="flex-1 focus:outline-none"
                  required
                />
              </div>
              {fieldErrors.github && (
                <div className="text-red-500 text-xs mt-1">{fieldErrors.github}</div>
              )}
            </div>

            <div>
              <div className={`flex items-center space-x-2 p-3 border rounded-lg ${
                fieldErrors.company ? 'border-red-500' : ''
              }`}>
                <input
                  type="text"
                  placeholder="Company *"
                  value={profile.company}
                  onChange={(e) => {
                    setProfile((prev) => ({ ...prev, company: e.target.value }))
                    setFieldErrors(prev => ({ ...prev, company: '' }))
                  }}
                  className="flex-1 focus:outline-none"
                  required
                />
              </div>
              {fieldErrors.company && (
                <div className="text-red-500 text-xs mt-1">{fieldErrors.company}</div>
              )}
            </div>

            <div className="md:col-span-2">
              <div className={`flex items-center space-x-2 p-3 border rounded-lg ${
                fieldErrors.location ? 'border-red-500' : ''
              }`}>
                <input
                  type="text"
                  placeholder="Location *"
                  value={profile.location}
                  onChange={(e) => {
                    setProfile((prev) => ({ ...prev, location: e.target.value }))
                    setFieldErrors(prev => ({ ...prev, location: '' }))
                  }}
                  className="flex-1 focus:outline-none"
                  required
                />
              </div>
              {fieldErrors.location && (
                <div className="text-red-500 text-xs mt-1">{fieldErrors.location}</div>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Updating..." : "Update Profile"}
        </button>
      </motion.form>
    </div>
  );
}

export default Profile