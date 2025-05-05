import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function CourseQuizPage({ params }: { params: { courseId: string }}) {
  const { courseId } = params
  
  // Themen für diesen Kurs laden
  const topics = await prisma.question.findMany({
    where: { courseId },
    select: { topic: true },
    distinct: ['topic']
  })
  
  // Mapping für benutzerfreundliche Namen
  const displayNames: Record<string, string> = {
    "Grundlagen": "Python Grundlagen",
    "Datentypen": "Datentypen & Operatoren",
    "Print_Input": "Print, Input und If-Else",
    "Schleifen": "Schleifen",
    "Datenstrukturen": "Datenstrukturen",
    "Funktionen": "Funktionen und Module"
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Themen</h2>
      
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map(({ topic }) => (
          <Card key={topic}>
            <CardHeader>
              <CardTitle>{displayNames[topic] || topic}</CardTitle>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/courses/${courseId}/quiz/${topic}`}>
                  Quiz starten
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}