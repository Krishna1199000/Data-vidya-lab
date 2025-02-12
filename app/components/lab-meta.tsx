import { Clock, Star, Users } from "lucide-react"

interface LabMetaProps {
  difficulty: string
  duration: string
  rating: {
    score: number
    total: number
    count: number
  }
}

export function LabMeta({ difficulty, duration, rating }: LabMetaProps) {
  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{difficulty}</span>
      <span>|</span>
      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4" />
        <span>Up to {duration}</span>
      </div>
      <span>|</span>
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        <span>
          {rating.score}/{rating.total}
        </span>
      </div>
      <span>|</span>
      <div className="flex items-center gap-1">
        <Users className="h-4 w-4" />
        <span>{rating.count.toLocaleString()}</span>
      </div>
    </div>
  )
}

