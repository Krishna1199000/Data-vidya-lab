import Image from "next/image"

interface LabEnvironmentProps {
  before: string
  after: string
}

export function LabEnvironment({ before, after }: LabEnvironmentProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="italic mb-4">Before completing the Lab instructions, the environment will look as follows:</p>
        <div className="border rounded-lg p-4 bg-white">
          <Image
            src={before || "/placeholder.svg"}
            alt="Initial lab environment"
            width={800}
            height={400}
            className="w-full"
          />
        </div>
      </div>
      <div>
        <p className="italic mb-4">After completing the Lab instructions, the environment should look similar to:</p>
        <div className="border rounded-lg p-4 bg-white">
          <Image
            src={after || "/placeholder.svg"}
            alt="Final lab environment"
            width={800}
            height={400}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}

