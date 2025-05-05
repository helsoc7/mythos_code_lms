import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"

export default function CourseLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { courseId: string }
}) {
  return (
    <div className="space-y-6">
      {/* Zurück-Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/courses">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Zurück</span>
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">Zurück zur Kursübersicht</span>
      </div>
      
      {children}
    </div>
  )
}