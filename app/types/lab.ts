export interface Lab {
    id: string
    title: string
    difficulty: "Beginner" | "Intermediate" | "Advanced"
    duration: string
    rating: {
      score: number
      total: number
      count: number
    }
    averageCompletionTime: number
    description: string
    objectives: string[]
    prerequisites: {
      description: string
      items: string[]
    }
    environment: {
      before: string
      after: string
    }
    updates: Array<{
      date: string
      description: string
    }>
    coveredTopics: string[]
    labSteps: Array<{
      title: string
      isLocked: boolean
    }>
    labRules: {
      rules: string[]
      warning: string
    }
  }
  
  