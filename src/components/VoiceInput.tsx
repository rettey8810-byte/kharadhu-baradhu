import { useState, useCallback } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'

interface VoiceInputProps {
  onResult: (text: string) => void
}

export default function VoiceInput({ onResult }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [recognition, setRecognition] = useState<any | null>(null)

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser. Try Chrome or Safari.')
      return
    }

    const SpeechRecognitionCtor: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognizer = new SpeechRecognitionCtor()
    
    recognizer.continuous = false
    recognizer.interimResults = true
    recognizer.lang = 'en-US'

    recognizer.onstart = () => {
      setIsListening(true)
      setError(null)
      setTranscript('')
    }

    recognizer.onresult = (event: any) => {
      const current = event.resultIndex
      const transcript = event.results[current][0].transcript
      setTranscript(transcript)
      
      if (event.results[current].isFinal) {
        handleVoiceResult(transcript)
        setIsListening(false)
      }
    }

    recognizer.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        setError('No speech detected. Try again.')
      } else if (event.error === 'audio-capture') {
        setError('No microphone found.')
      } else if (event.error === 'not-allowed') {
        setError('Microphone permission denied.')
      } else {
        setError('Speech recognition error. Try again.')
      }
      setIsListening(false)
    }

    recognizer.onend = () => {
      setIsListening(false)
    }

    setRecognition(recognizer)
    recognizer.start()
  }, [onResult])

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop()
    }
    setIsListening(false)
  }, [recognition])

  // Parse voice command for expense
  const parseVoiceCommand = (text: string) => {
    // Patterns like:
    // "Add 50 MVR for lunch"
    // "Coffee 35"
    // "Spent 200 on groceries"
    // "Transport 15"
    
    const amountMatch = text.match(/(\d+)/)
    const amount = amountMatch ? parseInt(amountMatch[1]) : null
    
    // Extract description (everything after common keywords)
    let description = text
      .replace(/^(add|spent|paid|bought)\s+/i, '')
      .replace(/\s+(for|on)\s+/i, ' ')
      .replace(/\d+\s*(mvr|rf|rupees?)?/i, '')
      .trim()
    
    // If no explicit description, try to infer from context
    if (!description && amount) {
      const commonPatterns: Record<string, string[]> = {
        'coffee': ['coffee', 'cafe', 'starbucks', 'java'],
        'lunch': ['lunch', 'food', 'meal', 'restaurant'],
        'transport': ['transport', 'bus', 'taxi', 'fuel', 'petrol'],
        'groceries': ['grocery', 'groceries', 'supermarket', 'shop'],
        'electricity': ['electricity', 'stelco', 'power', 'bill'],
        'water': ['water', 'mwsc', 'utility'],
        'phone': ['phone', 'credit', 'dhiraagu', 'ooredoo']
      }
      
      const lowerText = text.toLowerCase()
      for (const [category, keywords] of Object.entries(commonPatterns)) {
        if (keywords.some(k => lowerText.includes(k))) {
          description = category
          break
        }
      }
    }
    
    return { amount, description: description || 'Expense' }
  }

  const handleVoiceResult = (text: string) => {
    const parsed = parseVoiceCommand(text)
    onResult(JSON.stringify(parsed))
  }

  return (
    <div className="relative">
      <button
        onClick={isListening ? stopListening : () => startListening()}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
          isListening 
            ? 'bg-red-100 text-red-600 animate-pulse' 
            : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
        }`}
        type="button"
      >
        {isListening ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Listening...</span>
          </>
        ) : (
          <>
            <Mic size={18} />
            <span>Voice</span>
          </>
        )}
      </button>

      {isListening && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-10">
          <p className="text-sm text-gray-600">
            {transcript || 'Say something like "Add 50 MVR for lunch"'}
          </p>
          <div className="mt-2 flex justify-center gap-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-red-50 rounded-xl shadow-lg border border-red-200 p-3 z-10">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <MicOff size={14} />
            {error}
          </p>
        </div>
      )}
    </div>
  )
}

