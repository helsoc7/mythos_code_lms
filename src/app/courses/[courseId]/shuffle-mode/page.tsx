'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import QuizFrage from '@/app/quiz/[topic]/QuizFrage'
import { Switch } from "@/components/ui/switch"
import LanguageSwitcherDialog from '@/components/LanguageSwitcherDialog'
import { Loader2, Shuffle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { CheckCircle, Info } from "lucide-react"
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
  topic: string
  language: string
}

type ShuffleProgress = {
  currentQuestion: number
  answered: boolean[]
  correctCount: number
  answeredCount: number
  language: string
  questionIds: string[]
  courseId: string
}

export default function CourseShuffleModePage() {
  const { courseId } = useParams() as { courseId: string }
  const [fragen, setFragen] = useState<Frage[]>([])
  const [questionPool, setQuestionPool] = useState<Frage[]>([])
  const [aktuelleFrage, setAktuelleFrage] = useState(0)
  const [answered, setAnswered] = useState<boolean[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState<'de' | 'en'>('de')
  const [showLanguageDialog, setShowLanguageDialog] = useState(false)
  const [manuallyFinished, setManuallyFinished] = useState(false)

  // Sprache aus SessionStorage laden mit courseId als Teil des Keys
  useEffect(() => {
    const savedLang = sessionStorage.getItem(`shuffle-selected-language-${courseId}`) as 'de' | 'en' | null
    if (savedLang && savedLang !== language) {
      setLanguage(savedLang)
    }
  }, [language, courseId])

  const getProgressKey = useCallback(() => {
    return `shuffle-progress-${courseId}-${language}`
  }, [courseId, language])

  const saveProgress = useCallback((currentQuestion: number, answeredState: boolean[], correct: number, answeredTotal: number, questionIds: string[]) => {
    const progressData: ShuffleProgress = {
      currentQuestion,
      answered: answeredState,
      correctCount: correct,
      answeredCount: answeredTotal,
      language,
      questionIds,
      courseId,
    }
    try {
      sessionStorage.setItem(getProgressKey(), JSON.stringify(progressData))
    } catch (error) {
      console.error("Fehler beim Speichern des Fortschritts:", error)
    }
  }, [language, courseId, getProgressKey])

  const loadProgress = useCallback((): ShuffleProgress | null => {
    try {
      const savedProgress = sessionStorage.getItem(getProgressKey())
      if (savedProgress) {
        return JSON.parse(savedProgress) as ShuffleProgress
      }
    } catch (error) {
      console.error("Fehler beim Laden des Fortschritts:", error)
    }
    return null
  }, [getProgressKey])

  const shuffleQuestions = useCallback((questions: Frage[]) => {
    const shuffled = [...questions]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }, [])

  useEffect(() => {
    const fetchAllQuestions = async () => {
      setIsLoading(true)
      try {
        // Hole alle Fragen des Kurses, indem wir zuerst die Themen holen
        const topics = ["Grundlagen", "Datentypen", "Print_Input", "Schleifen", "Datenstrukturen", "Funktionen"]
        let allQuestions: Frage[] = []
        
        // Option 1: Sammle alle Fragen von allen Themen
        for (const topic of topics) {
          try {
            const res = await fetch(`/api/questions/${topic}?lang=${language}&courseId=${courseId}`)
            if (res.ok) {
              const data = await res.json()
              const parsedData = data.map((frage: Frage): Frage => ({
                ...frage,
                correctIndexes: Array.isArray(frage.correctIndexes)
                  ? frage.correctIndexes
                  : JSON.parse(frage.correctIndexes ?? '[]'),
                explanationWrong: Array.isArray(frage.explanationWrong)
                  ? frage.explanationWrong
                  : JSON.parse(frage.explanationWrong),
                topic: topic // Setze das Thema explizit
              }))
              allQuestions = [...allQuestions, ...parsedData]
            }
          } catch (err) {
            console.error(`Fehler beim Laden der Fragen für Thema ${topic}:`, err)
            // Wir machen mit dem nächsten Thema weiter, auch wenn bei einem Fehler auftritt
          }
        }
        
        // Falls keine Fragen gefunden wurden, versuchen wir es mit der Prüfungs-API als Fallback
        if (allQuestions.length === 0) {
          const res = await fetch(`/api/exam/questions?lang=${language}&courseId=${courseId}`)
          if (res.ok) {
            const data = await res.json()
            const parsedData = data.map((frage: Frage): Frage => ({
              ...frage,
              correctIndexes: Array.isArray(frage.correctIndexes)
                ? frage.correctIndexes
                : JSON.parse(frage.correctIndexes ?? '[]'),
              explanationWrong: Array.isArray(frage.explanationWrong)
                ? frage.explanationWrong
                : JSON.parse(frage.explanationWrong),
            }))
            allQuestions = parsedData
          } else {
            throw new Error('Keine Fragen gefunden')
          }
        }
        
        console.log(`Insgesamt ${allQuestions.length} Fragen geladen`)
        setQuestionPool(allQuestions)

        const savedProgress = loadProgress()
        if (savedProgress && 
            savedProgress.language === language && 
            savedProgress.courseId === courseId && 
            savedProgress.questionIds.length > 0) {
          // Fortschritt wiederherstellen
          const restoredQuestions = savedProgress.questionIds.map(id => 
            allQuestions.find(q => q.id === id)
          ).filter(Boolean) as Frage[]
          
          if (restoredQuestions.length === savedProgress.questionIds.length) {
            setFragen(restoredQuestions)
            setAktuelleFrage(savedProgress.currentQuestion)
            setAnswered(savedProgress.answered)
            setCorrectCount(savedProgress.correctCount)
            setAnsweredCount(savedProgress.answeredCount)
            console.log("Fortschritt wiederhergestellt:", savedProgress)
          } else {
            // Fortschritt inkonsistent, neue Fragen laden
            initializeNewSession(allQuestions)
          }
        } else {
          initializeNewSession(allQuestions)
        }
      } catch (error) {
        console.error("Fehler beim Laden der Fragen:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllQuestions()
  }, [language, courseId, loadProgress, shuffleQuestions])

  const initializeNewSession = useCallback((allQuestions: Frage[]) => {
    const shuffledQuestions = shuffleQuestions(allQuestions)
    setFragen(shuffledQuestions)
    setAktuelleFrage(0)
    setAnswered(new Array(shuffledQuestions.length).fill(false))
    setCorrectCount(0)
    setAnsweredCount(0)
    setManuallyFinished(false)
  }, [shuffleQuestions])

  useEffect(() => {
    if (fragen.length > 0 && !isLoading) {
      const questionIds = fragen.map(q => q.id)
      saveProgress(aktuelleFrage, answered, correctCount, answeredCount, questionIds)
    }
  }, [aktuelleFrage, answered, correctCount, answeredCount, fragen, isLoading, saveProgress])

  const handleLanguageChange = () => {
    const newLang = language === 'de' ? 'en' : 'de'
    sessionStorage.removeItem(getProgressKey())
    sessionStorage.setItem(`shuffle-selected-language-${courseId}`, newLang)
    setLanguage(newLang)
    setShowLanguageDialog(false)
  }

  const handleReshuffleCurrent = () => {
    if (questionPool.length > 0) {
      const shuffledQuestions = shuffleQuestions(questionPool)
      setFragen(shuffledQuestions)
      setAktuelleFrage(0)
      setAnswered(new Array(shuffledQuestions.length).fill(false))
      setCorrectCount(0)
      setAnsweredCount(0)
      setManuallyFinished(false)
      // Lösche den gespeicherten Fortschritt beim Reshuffle
      sessionStorage.removeItem(getProgressKey())
    }
  }
  
  const handleCancel = () => {
    // Manuellen Beendigungsmodus aktivieren
    setManuallyFinished(true)
  }

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
  
  const handleTryAgain = () => {
    // Neue Fragen laden, anstatt nur die Zustände zurückzusetzen
    if (questionPool.length > 0) {
      initializeNewSession(questionPool)
    }
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
  
  if (fragen.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[50vh] p-8">
      <div className="bg-card rounded-lg border border-border shadow-sm p-8 flex flex-col items-center space-y-4">
        <p className="text-muted-foreground font-medium">
          {language === 'de' ? 'Keine Fragen gefunden.' : 'No questions found.'}
        </p>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header-Bereich mit Sprachumschalter und Reshuffle-Button */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-3 text-sm font-medium text-foreground">{language === 'de' ? 'Sprache:' : 'Language:'}</span>
          <div className="flex items-center rounded-md border border-input bg-background p-0.5">
            <button 
              onClick={() => { setLanguage('de'); sessionStorage.setItem(`shuffle-selected-language-${courseId}`, 'de'); }}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-sm transition-colors ${language === 'de' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              DE
            </button>
            <button 
              onClick={() => { setLanguage('en'); sessionStorage.setItem(`shuffle-selected-language-${courseId}`, 'en'); }}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-sm transition-colors ${language === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              EN
            </button>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
            onClick={handleReshuffleCurrent}
          >
            <Shuffle className="h-4 w-4" />
            {language === 'de' ? 'Neu mischen' : 'Reshuffle'}
          </Button>
          
          {!isFinished && (
            <Button 
              variant="outline" 
              size="sm"
              className="text-primary hover:bg-primary/10 hover:text-primary border-primary/20"
              onClick={handleCancel}
            >
              {language === 'de' ? 'Beenden' : 'Finish'}
            </Button>
          )}
        </div>
      </div>
      
      <LanguageSwitcherDialog
        open={showLanguageDialog}
        onClose={() => setShowLanguageDialog(false)}
        onConfirm={handleLanguageChange}
      />
      
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
                ? (language === 'de' ? 'Beendet!' : 'Finished!') 
                : (language === 'de' ? 'Fertig! 🎉' : 'Completed! 🎉')}
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
                            ? 'Der Gesamtfortschritt zeigt den Prozentsatz der korrekt beantworteten Fragen im Verhältnis zu allen geladenen Fragen.' 
                            : 'Overall progress shows the percentage of correctly answered questions relative to all loaded questions.'}
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
          {fragen.length > 0 && (
            <>
              {fragen[aktuelleFrage].topic && (
                <div className="mb-4 bg-gray-100 py-2 px-3 rounded-md text-sm">
                  <span className="font-medium">{language === 'de' ? 'Thema:' : 'Topic:'}</span> {fragen[aktuelleFrage].topic}
                </div>
              )}
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
            </>
          )}
        </div>
      )}
    </div>
  )
}