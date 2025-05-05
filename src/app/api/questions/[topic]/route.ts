import { NextResponse, NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/getUserFromToken"

export async function GET(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
)
{
  try {
    const { topic } = context.params
    const lang = req.nextUrl.searchParams.get('lang') || 'de'
    const courseId = req.nextUrl.searchParams.get('courseId') // Optional: Kurs-spezifische Abfrage

    // Definiere die Where-Klausel für die Abfrage
    const whereClause = {
      topic,
      language: lang,
    }
    
    // Wenn courseId gegeben ist, zum Filterkriterium hinzufügen
    if (courseId) {
      whereClause.courseId = courseId
    }

    const questions = await prisma.question.findMany({
      where: whereClause,
    })

    return NextResponse.json(
      questions.map((q) => ({
        id: q.id,
        question: q.question,
        answers: JSON.parse(q.answers),
        correctIndexes: Array.isArray(q.correctIndexes)
          ? q.correctIndexes.map(Number)
          : JSON.parse(q.correctIndexes ?? '[]').map(Number),
        explanation: q.explanation,
        explanationWrong: JSON.parse(q.explanationWrong),
        topic: q.topic,
      }))
    )
  } catch (error) {
    console.error("Fehler:", error)
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}