// src/app/courses/page.tsx
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default async function CoursesPage() {
  // Kurse laden
  let courses = []
  try {
    courses = await prisma.course.findMany({
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: {
        name: 'asc'
      }
    })
  } catch (error) {
    console.error("Fehler beim Laden der Kurse:", error)
    // Fallback: Standardkurs
    courses = [
      { 
        id: 'pcep-course', 
        name: 'PCEP Vorbereitung', 
        description: 'Python Certified Entry-Level Programmer'
      }
    ]
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verfügbare Kurse</h1>
        <p className="text-muted-foreground">Wähle einen Kurs aus, um mit dem Lernen zu beginnen.</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map(course => (
          <Card key={course.id}>
            <CardHeader>
              <CardTitle>{course.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{course.description}</p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/courses/${course.id}`}>
                  Zum Kurs
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}