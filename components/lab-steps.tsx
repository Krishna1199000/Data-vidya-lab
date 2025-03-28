import { Lock } from "lucide-react"

interface LabStep {
  title: string
  isLocked: boolean
}

interface LabStepsProps {
  steps: LabStep[]
}

export function LabSteps({ steps }: LabStepsProps) {
  return (
    <div className="border rounded-lg">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-foreground">Lab steps</h2>
      </div>
      <div className="divide-y">
        {steps.map((step, index) => (
          <div key={index} className="p-4 flex items-center gap-3">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{step.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
