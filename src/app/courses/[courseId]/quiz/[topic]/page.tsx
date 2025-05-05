// src/app/courses/[courseId]/quiz/[topic]/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import QuizFrage from '@/app/quiz/[topic]/QuizFrage'
import { Switch } from "@/components/ui/switch"
import LanguageSwitcherDialog from '@/components/LanguageSwitcherDialog'
import { Loader2 } from "lucide-react"

type Frage = {
  id: string
  question: string
  answers: string[]
  correctIndexes: number[]
  explanation: string
  explanationWrong: string[]
  language: string
}

type QuizProgress = {
  currentQuestion: number
  answered: boolean[]
  correctCount: number
  answeredCount: number
  topic: string
  language: string
  courseId: string
}

export default function CourseTopicQuizPage() {
  const { courseId, topic } = useParams() as { courseId: string, topic: string }
  const [fragen, setFragen] = useState<Frage[]>([])
  const [aktuelleFrage, setAktuelleFrage] = useState(0)
  const [answered, setAnswered] = useState<boolean[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState<'de' | 'en'>('de')
  const [showLanguageDialog, setShowLanguageDialog] = useState(false)

  // Sprache aus SessionStorage laden mit courseId als Teil des Keys
  useEffect(() => {
    const savedLang = sessionStorage.getItem(`quiz-selected-language-${courseId}`) as 'de' | 'en' | null
    if (savedLang && savedLang !== language) {
      setLanguage(savedLang)
    }
  }, [language, courseId])

  const getProgressKey = useCallback(() => {
    return `quiz-progress-${courseId}-${topic}-${language}`
  }, [topic, language, courseId])

  const saveProgress = useCallback((currentQuestion: number, answeredState: boolean[], correct: number, answeredTotal: number) => {
    const progressData: QuizProgress = {
      currentQuestion,
      answered: answeredState,
      correctCount: correct,
      answeredCount: answeredTotal,
      topic,
      language,
      courseId,
    }
    try {
      sessionStorage.setItem(getProgressKey(), JSON.stringify(progressData))
    } catch (error) {
      console.error("Fehler beim Speichern des Fortschritts:", error)
    }
  }, [topic, language, courseId, getProgressKey])

  const loadProgress = useCallback((): QuizProgress | null => {
    try {
      const savedProgress = sessionStorage.getItem(getProgressKey())
      if (savedProgress) {
        return JSON.parse(savedProgress) as QuizProgress
      }
    } catch (error) {
      console.error("Fehler beim Laden des Fortschritts:", error)
    }
    return null
  }, [getProgressKey])

  useEffect(() => {
    const fetchFragen = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/questions/${topic}?lang=${language}&courseId=${courseId}`)
        const data = await res.json()
        const parsedData = data.map((frage: Frage): Frage => ({
          ...frage,
          correctIndexes: Array.isArray(frage.correctIndexes)
            ? frage.correctIndexes
            : JSON.parse(frage.correctIndexes ?? '[]'),
        }))
        setFragen(parsedData)

        const savedProgress = loadProgress()
        if (savedProgress && 
            savedProgress.topic === topic && 
            savedProgress.language === language && 
            savedProgress.courseId === courseId && 
            savedProgress.answered.length === parsedData.length) {
          setAktuelleFrage(savedProgress.currentQuestion)
          setAnswered(savedProgress.answered)
          setCorrectCount(savedProgress.correctCount)
          setAnsweredCount(savedProgress.answeredCount)
          console.log("Fortschritt wiederhergestellt:", savedProgress)
        } else {
          setAktuelleFrage(0)
          setAnswered(new Array(parsedData.length).fill(false))
          setCorrectCount(0)
          setAnsweredCount(0)
        }
      } catch (error) {
        console.error("Fehler beim Laden der Fragen:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFragen()
  }, [topic, language, courseId, loadProgress])

  useEffect(() => {
    if (fragen.length > 0 && !isLoading) {
      saveProgress(aktuelleFrage, answered, correctCount, answeredCount)
    }
  }, [aktuelleFrage, answered, correctCount, answeredCount, fragen.length, isLoading, saveProgress])

  const handleLanguageChange = () => {
    const newLang = language === 'de' ? 'en' : 'de'
    sessionStorage.setItem(`quiz-selected-language-${courseId}`, newLang)
    setLanguage(newLang)
    setShowLanguageDialog(false)
  }

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[50vh] p-8">
      <div className="bg-card rounded-lg border border-border shadow-sm p-8 flex flex-col items-center space-y-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">
          {language === 'de' ? 'Fragen werden geladen...' : 'Loading questions...'}
        </p>
      </div>
    </div>
  )
  
  if (fragen.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[50vh] p-8">
      <div className="bg-card rounded-lg border border-border shadow-sm p-8 flex flex-col items-center space-y-4">
        <p className="text-muted-foreground font-medium">
          {language === 'de' ? 'Keine Fragen für dieses Thema gefunden.' : 'No questions found for this topic.'}
        </p>
      </div>
    </div>
  )

  const aktuelle = fragen[aktuelleFrage]

  const handleNext = (wasCorrect: boolean) => {
    setAnswered((prev) => {
      const updated = [...prev]
      updated[aktuelleFrage] = true
      return updated
    })
    setAnsweredCount((prev) => prev + 1)
    if (wasCorrect) setCorrectCount((prev) => prev + 1)
    setAktuelleFrage((prev) => Math.min(prev + 1, fragen.length - 1))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-center items-center mb-6">
        <div className="flex items-center space-x-4 bg-muted rounded-lg px-4 py-2 shadow-sm">
          <span className="text-sm font-medium text-gray-700">Sprache:</span>
          <span className="text-sm font-semibold">{language.toUpperCase()}</span>
          <div className="flex items-center space-x-2">
            <span className="text-xs">DE</span>
            <Switch checked={language === 'en'} onCheckedChange={() => setShowLanguageDialog(true)} />
            <span className="text-xs">EN</span>
          </div>
        </div>
      </div>

      <LanguageSwitcherDialog
        open={showLanguageDialog}
        onClose={() => setShowLanguageDialog(false)}
        onConfirm={handleLanguageChange}
      />

      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <QuizFrage
          id={aktuelle.id}
          question={aktuelle.question}
          answers={aktuelle.answers}
          correctIndexes={aktuelle.correctIndexes}
          explanation={aktuelle.explanation}
          explanationWrong={aktuelle.explanationWrong}
          onNext={aktuelleFrage < fragen.length - 1 ? handleNext : undefined}
          currentIndex={aktuelleFrage}
          total={fragen.length}
          onJumpTo={setAktuelleFrage}
          answered={answered}
          correctCount={correctCount}
          answeredCount={answeredCount}
        />
      </div>
    </div>
  )
}