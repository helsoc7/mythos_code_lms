'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import QuizFrage from '@/app/quiz/[topic]/QuizFrage'
import { motion } from "framer-motion"
import { CheckCircle, Loader2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type Frage = {
  id: string
  question: string
  answers: string[]
  correctIndexes: number[]
  explanation: string
  explanationWrong: string[]
  nextRound?: number
  language: string
}

export default function CourseExamPage() {
  const { courseId } = useParams() as { courseId: string }
  const [fragen, setFragen] = useState<Frage[]>([])
  const [aktuelleFrage, setAktuelleFrage] = useState(0)
  const [answered, setAnswered] = useState<boolean[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [language, setLanguage] = useState<'de' | 'en'>('de')
  const [manuallyFinished, setManuallyFinished] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Sprache beim Laden aus dem sessionStorage holen
  useEffect(() => {
    const savedLang = sessionStorage.getItem(`exam-selected-language-${courseId}`) as 'de' | 'en' | null
    if (savedLang) {
      setLanguage(savedLang)
    }
  }, [courseId])

  // Fragen laden Funktion
  const fetchFragen = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/exam/questions?lang=${language}&courseId=${courseId}`)
      const raw: Frage[] = await res.json()

      const expanded = raw.flatMap((frage) => {
        const weight = Math.max(1, 5 - (frage.nextRound ?? 0))

        const parsedFrage: Frage = {
          ...frage,
          answers: Array.isArray(frage.answers) ? frage.answers : JSON.parse(frage.answers),
          explanationWrong: Array.isArray(frage.explanationWrong) ? frage.explanationWrong : JSON.parse(frage.explanationWrong),
        }

        return Array(weight).fill(parsedFrage)
      })

      let final = [...expanded]
      while (final.length < 40) {
        final = [...final, ...expanded]
      }

      const shuffled = final.sort(() => Math.random() - 0.5).slice(0, 40)
      setFragen(shuffled)
      setAnswered(new Array(shuffled.length).fill(false))
      setCorrectCount(0)
      setAnsweredCount(0)
      setAktuelleFrage(0)
      setManuallyFinished(false)
    } catch (error) {
      console.error("Fehler beim Laden der Fragen:", error)
    } finally {
      setIsLoading(false)
    }
  }, [language, courseId])

  // Fragen initial laden
  useEffect(() => {
    fetchFragen()
  }, [fetchFragen])

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

  const handleJumpTo = (index: number) => {
    setAktuelleFrage(index)
  }
  
  const handleCancel = () => {
    // Manuellen Beendigungsmodus aktivieren
    setManuallyFinished(true)
  }
  
  const handleTryAgain = () => {
    // Neue Fragen laden, anstatt nur die Zustände zurückzusetzen
    fetchFragen()
  }
  
  const isFinished = answeredCount === fragen.length || manuallyFinished
  
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header-Bereich mit Sprachumschalter und Beenden-Button */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-3 text-sm font-medium text-foreground">{language === 'de' ? 'Sprache:' : 'Language:'}</span>
          <div className="flex items-center rounded-md border border-input bg-background p-0.5">
            <button 
              onClick={() => { setLanguage('de'); sessionStorage.setItem(`exam-selected-language-${courseId}`, 'de'); }}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-sm transition-colors ${language === 'de' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              DE
            </button>
            <button 
              onClick={() => { setLanguage('en'); sessionStorage.setItem(`exam-selected-language-${courseId}`, 'en'); }}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-sm transition-colors ${language === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              EN
            </button>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          className="text-primary hover:bg-primary/10 hover:text-primary border-primary/20"
          onClick={handleCancel}
        >
          {language === 'de' ? 'Prüfung abgeben' : 'Submit exam'}
        </Button>
      </div>
      
      {isFinished ? (
        <div className="bg-card rounded-lg border border-border shadow-sm p-8 mx-auto max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="text-emerald-500 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {manuallyFinished 
                ? (language === 'de' ? 'Prüfung beendet!' : 'Exam ended!') 
                : (language === 'de' ? 'Fertig! 🎉' : 'Finished! 🎉')}
            </h2>
            <p className="text-muted-foreground">
              {manuallyFinished 
                ? (language === 'de' 
                    ? `Du hast ${answeredCount} von ${fragen.length} Fragen beantwortet.` 
                    : `You answered ${answeredCount} out of ${fragen.length} questions.`)
                : (language === 'de'
                    ? `Du hast alle ${fragen.length} Fragen beantwortet.`
                    : `You answered all ${fragen.length} questions.`)}
            </p>
            <div className="space-y-3 max-w-sm mx-auto">
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">{language === 'de' ? 'Richtig:' : 'Correct:'}</span>
                <span className="font-medium">{correctCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">{language === 'de' ? 'Falsch:' : 'Wrong:'}</span>
                <span className="font-medium">{answeredCount - correctCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="font-medium text-foreground">{language === 'de' ? 'Erfolgsquote:' : 'Success rate:'}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-help ml-1">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-sm">
                          {language === 'de' 
                            ? 'Die Erfolgsquote zeigt den Prozentsatz der korrekt beantworteten Fragen im Verhältnis zu allen beantworteten Fragen.' 
                            : 'Success rate shows the percentage of correctly answered questions relative to all questions you answered.'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="font-medium">{answeredCount > 0 ? ((correctCount / answeredCount) * 100).toFixed(1) : '0.0'}%</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <div className="flex items-center">
                  <span className="font-medium text-foreground">{language === 'de' ? 'Gesamtfortschritt:' : 'Overall progress:'}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-help ml-1">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-sm">
                          {language === 'de' 
                            ? 'Der Gesamtfortschritt zeigt den Prozentsatz der korrekt beantworteten Fragen im Verhältnis zu allen 40 Prüfungsfragen.' 
                            : 'Overall progress shows the percentage of correctly answered questions relative to all 40 exam questions.'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="font-medium">{((correctCount / fragen.length) * 100).toFixed(1)}%</span>
              </div>
              <Progress 
                value={(correctCount / fragen.length) * 100} 
                className="h-2 mt-2"
              />
            </div>
            <div className="flex space-x-4 justify-center pt-2">
              <Button 
                variant="default"
                className="bg-black text-white hover:bg-gray-800"
                onClick={handleTryAgain}
              >
                {language === 'de' ? 'Neu starten' : 'Try again'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = `/courses/${courseId}`}
              >
                {language === 'de' ? 'Zurück zum Kurs' : 'Back to course'}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : (
        /* Quiz */
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          {fragen.length > 0 ? (
            <QuizFrage
              id={fragen[aktuelleFrage].id}
              question={fragen[aktuelleFrage].question}
              answers={fragen[aktuelleFrage].answers}
              correctIndexes={fragen[aktuelleFrage].correctIndexes}
              explanation={fragen[aktuelleFrage].explanation}
              explanationWrong={fragen[aktuelleFrage].explanationWrong}
              onNext={aktuelleFrage < fragen.length - 1 ? handleNext : undefined}
              currentIndex={aktuelleFrage}
              total={fragen.length}
              onJumpTo={handleJumpTo}
              answered={answered}
              correctCount={correctCount}
              answeredCount={answeredCount}
            />
          ) : (
            <p>Keine Fragen verfügbar.</p>
          )}
        </div>
      )}
    </div>
  )
}