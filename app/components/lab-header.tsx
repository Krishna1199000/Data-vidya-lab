import { ChevronRight } from "lucide-react"
import Link from "next/link"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface LabHeaderProps {
  breadcrumbs: BreadcrumbItem[]
}

export function LabHeader({ breadcrumbs }: LabHeaderProps) {
  return (
    <nav className="flex items-center space-x-2 p-4 text-sm border-b">
      {breadcrumbs.map((item, index) => (
        <div key={item.label} className="flex items-center">
          {item.href ? (
            <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
          {index < breadcrumbs.length - 1 && <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />}
        </div>
      ))}
    </nav>
  )
}

