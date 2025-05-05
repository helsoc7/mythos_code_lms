import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Shuffle } from 'lucide-react'

export default async function CoursePage({ params }: { params: { courseId: string }}) {
  const { courseId } = params
  
  // Kurs aus der Datenbank laden
  let course
  try {
    course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        name: true,
        description: true
      }
    })
    
    if (!course) {
      notFound()
    }
  } catch (error) {
    console.error("Fehler beim Laden des Kurses:", error)
    // Fallback für Entwicklung
    if (courseId === 'pcep-course') {
      course = {
        id: 'pcep-course',
        name: 'PCEP Vorbereitung',
        description: 'Python Certified Entry-Level Programmer'
      }
    } else {
      notFound()
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{course.name}</h1>
      <p className="text-muted-foreground">{course.description}</p>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Fragenkatalog</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Beantworte Fragen zu verschiedenen Themen im Spaced-Repetition-Modus
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/courses/${courseId}/quiz`}>
                Themen anzeigen
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shuffle className="h-4 w-4" />
              Shuffle Modus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Beantworte Fragen zu allen Themen im Zufalls-Modus
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/courses/${courseId}/shuffle-mode`}>
                Starten
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Prüfungsmodus</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Teste dein Wissen mit 40 zufälligen Fragen
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/courses/${courseId}/exam-mode`}>
                Prüfung starten
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Dein Fortschritt und Statistiken
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/courses/${courseId}/dashboard`}>
                Dashboard öffnen
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}