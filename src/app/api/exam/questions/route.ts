import { NextResponse, NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/getUserFromToken"

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req)
    const lang = req.nextUrl.searchParams.get('lang') || 'de'
    const courseId = req.nextUrl.searchParams.get('courseId') // NEU

    if (!user) {
      return NextResponse.json({ error: "Nicht eingeloggt oder Token ungültig" }, { status: 401 })
    }

    const progress = user.progress


    const whereClause = {
      language: lang,
    }
    
    // Wenn courseId gegeben ist, zum Filterkriterium hinzufügen
    if (courseId) {
      whereClause.courseId = courseId
    }

    // Alle verfügbaren Fragen für die gewählte Sprache laden
    const allQuestions = await prisma.question.findMany({
      select: {
        id: true,
        question: true,
        answers: true,
        correctIndexes: true, 
        topic: true,
        explanation: true,
        explanationWrong: true,
      },
      where: whereClause
    })

    // Fragen parsen
    const parsedQuestions = allQuestions.map(q => ({
      ...q,
      answers: Array.isArray(q.answers) ? q.answers : JSON.parse(q.answers),
      correctIndexes: Array.isArray(q.correctIndexes)
        ? q.correctIndexes.map(Number)
        : JSON.parse(q.correctIndexes ?? '[]').map(Number),
      explanationWrong: Array.isArray(q.explanationWrong)
        ? q.explanationWrong
        : JSON.parse(q.explanationWrong),
    }))

    // Fallback: Wenn kein Fortschritt, einfach 40 beliebige Fragen holen
    if (progress.length === 0) {
      console.log("progress ist leer")
      const shuffled = [...parsedQuestions].sort(() => Math.random() - 0.5)
      return NextResponse.json(shuffled.slice(0, 40))
    }

    // Map für den User-Progress erstellen
    const progressMap = new Map(progress.map(p => [p.questionId, p]))
    
    // Gewichteter Pool mit allen Fragen erstellen (inkl. unbesuchter Fragen mit nextRound=0)
    const weightedPool = parsedQuestions.flatMap(q => {
      // Entweder existierenden Progress verwenden oder virtuellen mit nextRound=0
      const userProgress = progressMap.get(q.id)
      const nextRound = userProgress ? (userProgress.nextRound ?? 0) : 0
      const weight = Math.max(1, 5 - Math.min(nextRound, 5))
      
      return Array(weight).fill(q)
    })

    // Shuffle
    const shuffled = [...weightedPool].sort(() => Math.random() - 0.5)
    const seen = new Set<string>()
    const selected: typeof parsedQuestions = []

    for (const q of shuffled) {
      if (!seen.has(q.id)) {
        selected.push(q)
        seen.add(q.id)
      }
      if (selected.length >= 40) break
    }

    // console.log("Questions Count:", parsedQuestions.length)
    // console.log("Progress Count:", progress.length)
    // console.log("Pool Size:", weightedPool.length)
    // console.log("Selected:", selected.length)

    return NextResponse.json(selected)

  } catch (error) {
    console.error("Fehler:", error)
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
