// src/app/api/courses/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    // Einfache Version ohne komplexe Beziehungen
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        coverImage: true,
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    return NextResponse.json(courses)
  } catch (error) {
    console.error("Fehler beim Abrufen der Kurse:", error)
    
    // Fallback für Entwicklung: Demo-Daten zurückgeben
    const demoData = [
      { 
        id: 'pcep-course', 
        name: 'PCEP Vorbereitung', 
        description: 'Python Certified Entry-Level Programmer',
        createdAt: new Date()
      }
    ]
    
    return NextResponse.json(demoData)
  }
}