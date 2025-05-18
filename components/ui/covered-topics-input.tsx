"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, X } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

interface CoveredTopicsInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  required?: boolean
}

export function CoveredTopicsInput({
  value,
  onChange,
  label = "Covered Topics",
  required = false
}: CoveredTopicsInputProps) {
  const [inputValue, setInputValue] = useState("")
  const topics = value.split('\n').filter(Boolean)

  const addTopic = () => {
    if (inputValue.trim()) {
      const newTopics = [...topics, inputValue.trim()]
      onChange(newTopics.join('\n'))
      setInputValue("")
    }
  }

  const removeTopic = (index: number) => {
    const newTopics = [...topics]
    newTopics.splice(index, 1)
    onChange(newTopics.join('\n'))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addTopic()
    }
  }

  return (
    <div className="space-y-4">
      <Label htmlFor="topicInput">{label}{required && <span className="text-destructive ml-1">*</span>}</Label>
      
      <div className="flex flex-wrap gap-2 min-h-10 p-2 border rounded-md bg-background">
        {topics.map((topic, index) => (
          <Badge 
            key={index} 
            variant="secondary"
            className="flex items-center gap-1 text-sm py-1.5 px-3 hover:bg-secondary/80 transition-colors"
          >
            {topic}
            <button 
              type="button"
              onClick={() => removeTopic(index)}
              className="ml-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </Badge>
        ))}
        {topics.length === 0 && (
          <span className="text-muted-foreground text-sm px-2 py-1">
            No topics added yet. Add some below.
          </span>
        )}
      </div>
      
      <div className="flex gap-2">
        <Textarea
          id="topicInput"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a topic and press Enter or Add"
          className="resize-none"
          rows={2}
        />
        <Button 
          type="button" 
          onClick={addTopic}
          disabled={!inputValue.trim()}
          className="self-end shrink-0"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>
    </div>
  )
}