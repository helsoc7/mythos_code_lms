import { NextRequest, NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
)
{
  try {
  const { topic } = context.params

  const questions = await prisma.question.findMany({
    where: { topic },
  })

  return NextResponse.json(
    questions.map((q) => ({
      id: q.id,
      question: q.question,
      answers: JSON.parse(q.answers),
      correctIndex: q.correctIndex,
      correctIndexes: Array.isArray(q.correctIndexes)
        ? q.correctIndexes.map(Number)
        : JSON.parse(q.correctIndexes ?? '[]').map(Number),
      explanation: q.explanation,
      explanationWrong: JSON.parse(q.explanationWrong),
    }))
  )
} catch (error) {
  console.error("❌ Fehler:", error)
  return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 })
}
}