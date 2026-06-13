export interface MorseSymbol {
  char: string
  code: string
}

export type TrainMode = 'charToCode' | 'codeToChar' | 'audioToChar' | 'typingToCode'

export interface HistoryEntry {
  id: number
  input: string
  output: string
  correct: boolean
  timestamp: number
}

export interface ReminderSchedule {
  hour: number
  minute: number
  enabled: boolean
}

export interface ReminderRecord {
  date: string
  completed: boolean
  completedAt?: number
}
