'use client'

import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import EditableFrage from './EditableQuestion' 
import { SearchAndFilter } from './SearchAndFilter'
import AddQuestionButton from './AddQuestionButton'

interface Frage {
  id: string
  question: string
  answers: string[]
  correctIndexes: number[]
  explanation: string
  explanationWrong: string[]
  topic?: string
  subtopic?: string
  level?: string
}

export default function AdminFragenPage() {
  const [fragen, setFragen] = useState<Frage[]>([])
  const [selected, setSelected] = useState<Frage | null>(null)
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Such- und Filteroptionen
  const [searchQuery, setSearchQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState<string | null>(null)
  const [subtopicFilter, setSubtopicFilter] = useState<string | null>(null)
  
  // Extrahiere unique topics
  const topics = useMemo(() => 
    Array.from(new Set(fragen.map(f => f.topic).filter(Boolean))).sort() as string[], 
    [fragen]
  )
  
  // Extrahiere subtopics, gruppiert nach Topics
  const subtopicsGrouped = useMemo(() => {
    const grouped: Record<string, string[]> = {}
    
    // Gruppiere alle Subtopics nach ihrem jeweiligen Topic
    fragen.forEach(frage => {
      if (frage.topic && frage.subtopic) {
        if (!grouped[frage.topic]) {
          grouped[frage.topic] = []
        }
        if (!grouped[frage.topic].includes(frage.subtopic)) {
          grouped[frage.topic].push(frage.subtopic)
        }
      }
    })
    
    // Sortiere jede Subtopic-Liste
    Object.keys(grouped).forEach(topic => {
      grouped[topic].sort()
    })
    
    return grouped
  }, [fragen])
  
  // Subtopics für die Filter-Auswahl
  const subtopics = useMemo(() => 
    Array.from(new Set(fragen
      .filter(f => !topicFilter || topicFilter === "all" || f.topic === topicFilter)
      .map(f => f.subtopic)
      .filter(Boolean)
    )).sort() as string[],
    [fragen, topicFilter]
  )

  // Gefilterte Fragen
  const filteredFragen = useMemo(() => {
    return fragen.filter(frage => {
      // Suche im Fragentext
      const matchesSearch = searchQuery 
        ? frage.question.toLowerCase().includes(searchQuery.toLowerCase())
        : true
      
      // Topic Filter
      const matchesTopic = topicFilter && topicFilter !== "all"
        ? frage.topic === topicFilter 
        : true
      
      // Subtopic Filter
      const matchesSubtopic = subtopicFilter && subtopicFilter !== "all"
        ? frage.subtopic === subtopicFilter 
        : true
      
      return matchesSearch && matchesTopic && matchesSubtopic
    })
  }, [fragen, searchQuery, topicFilter, subtopicFilter])

  const fetchFragen = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/questions')
      const data = await res.json()
      const parsedData = data.map((frage: Frage) => ({
        ...frage,
        answers: Array.isArray(frage.answers) ? frage.answers : JSON.parse(frage.answers ?? '[]'),
        correctIndexes: Array.isArray(frage.correctIndexes) ? frage.correctIndexes : JSON.parse(frage.correctIndexes ?? '[]'),
        explanationWrong: Array.isArray(frage.explanationWrong) ? frage.explanationWrong : JSON.parse(frage.explanationWrong ?? '[]'),
      }))
      setFragen(parsedData)
    } catch (error) {
      console.error('Fehler beim Laden der Fragen:', error)
      alert('Fehler beim Laden der Fragen')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFragen()
  }, [])

  const handleSave = async (updatedFrage: Frage) => {
    setIsSaving(true)
    
    try {
      // Debug-Ausgabe zur Überprüfung der Daten vor dem Senden
      console.log('Speichere Frage:', {
        id: updatedFrage.id,
        question: updatedFrage.question,
        answers: updatedFrage.answers,
        correctIndexes: updatedFrage.correctIndexes,
        explanation: updatedFrage.explanation,
        explanationWrong: updatedFrage.explanationWrong,
        topic: updatedFrage.topic || '',
        subtopic: updatedFrage.subtopic || '',
        level: updatedFrage.level || 'medium',
      })
      
      // Explizit die Daten formatieren
      const response = await fetch('/api/admin/questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: updatedFrage.id,
          question: updatedFrage.question,
          answers: updatedFrage.answers,
          correctIndexes: updatedFrage.correctIndexes.map(Number), // Stellen Sie sicher, dass es Zahlen sind
          explanation: updatedFrage.explanation,
          explanationWrong: updatedFrage.explanationWrong,
          topic: updatedFrage.topic || '',
          subtopic: updatedFrage.subtopic || '',
          level: updatedFrage.level || 'medium'
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Speichern')
      }
      
      // Aktualisiere die Liste direkt, ohne vollständigen Reload
      setFragen(fragen.map(f => f.id === updatedFrage.id ? updatedFrage : f))
      setOpen(false)
      setSelected(null)
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      alert(`Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const openEditDialog = (frage: Frage) => {
    setSelected(frage)
    setOpen(true)
  }
  
  const clearFilters = () => {
    setSearchQuery('')
    setTopicFilter(null)
    setSubtopicFilter(null)
  }

  // Callback für wenn eine neue Frage hinzugefügt wurde
  const handleQuestionAdded = () => {
    fetchFragen() // Lade die Fragenliste neu
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Fragen bearbeiten</h1>
        <AddQuestionButton 
          onQuestionAdded={handleQuestionAdded} 
          topics={topics}
          subtopics={subtopicsGrouped}
        />
      </div>
      
      {/* Such- und Filterbereich als separate Komponente */}
      <SearchAndFilter
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        topicFilter={topicFilter}
        setTopicFilter={setTopicFilter}
        subtopicFilter={subtopicFilter}
        setSubtopicFilter={setSubtopicFilter}
        topics={topics}
        subtopics={subtopics}
        totalCount={fragen.length}
        filteredCount={filteredFragen.length}
        clearFilters={clearFilters}
      />
      
      {/* Fragen-Tabelle */}
      {isLoading ? (
        <div className="py-8 text-center">Fragen werden geladen...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Frage (Kurz)</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Subtopic</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Antworten</TableHead>
              <TableHead>Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFragen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Keine Fragen gefunden, die den Filterkriterien entsprechen.
                </TableCell>
              </TableRow>
            ) : (
              filteredFragen.map((frage) => (
                <TableRow key={frage.id}>
                  <TableCell className="max-w-xs">
                    {frage.question.length > 50 ? frage.question.slice(0, 50) + "..." : frage.question}
                  </TableCell>
                  <TableCell>{frage.topic ?? "—"}</TableCell>
                  <TableCell>{frage.subtopic ?? "—"}</TableCell>
                  <TableCell>
                    {frage.level === 'easy' ? 'Leicht' : 
                     frage.level === 'medium' ? 'Mittel' : 
                     frage.level === 'hard' ? 'Schwer' : '—'}
                  </TableCell>
                  <TableCell>{frage.answers?.length || 0}</TableCell>
                  <TableCell>
                    <Button onClick={() => openEditDialog(frage)}>Bearbeiten</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Dialog mit EditableFrage-Komponente */}
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isSaving) setOpen(isOpen); // Verhindert das Schließen während des Speicherns
      }}>
        <DialogContent className="w-full max-h-[90vh] overflow-y-auto" style={{ maxWidth: "1000px" }}>
          <DialogHeader>
            <DialogTitle>Frage bearbeiten</DialogTitle>
          </DialogHeader>
          
          {selected && (
            <EditableFrage
              frage={selected}
              onSave={handleSave}
              allTopics={topics}
              allSubtopics={subtopicsGrouped}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}