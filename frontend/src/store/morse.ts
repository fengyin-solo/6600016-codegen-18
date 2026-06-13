import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { MORSE_TABLE, REVERSE_TABLE, textToMorse, morseToText } from '../utils/morse-code'
import type { TrainMode, HistoryEntry, ReminderSchedule, ReminderRecord } from '../types'

export const useMorseStore = defineStore('morse', () => {
  const inputText = ref('')
  const morseOutput = ref('')
  const decodedText = ref('')
  const wpm = ref(15)
  const frequency = ref(700)
  const volume = ref(0.6)
  const trainMode = ref<TrainMode>('charToCode')
  const history = ref<HistoryEntry[]>([])
  const quizChar = ref('')
  const userAnswer = ref('')
  const score = ref({ correct: 0, total: 0 })
  const isPlaying = ref(false)
  const reminderSchedule = ref<ReminderSchedule>({
    hour: 20,
    minute: 0,
    enabled: false
  })
  const reminderRecords = ref<ReminderRecord[]>([])
  const showReminderModal = ref(false)
  let audioCtx: AudioContext | null = null
  let currentOscillator: OscillatorNode | null = null
  let reminderCheckInterval: number | null = null

  const dotDuration = computed(() => 1200 / wpm.value)

  function getAudioCtx(): AudioContext {
    if (!audioCtx) audioCtx = new AudioContext()
    return audioCtx
  }

  function playTone(duration: number): Promise<void> {
    return new Promise(resolve => {
      const ctx = getAudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency.value
      gain.gain.value = volume.value
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      currentOscillator = osc
      setTimeout(() => { osc.stop(); currentOscillator = null; resolve() }, duration)
    })
  }

  async function playMorse(morse: string) {
    isPlaying.value = true
    const dd = dotDuration.value
    for (const token of morse.split(' ')) {
      if (token === '/') { await sleep(dd * 7); continue }
      for (const sym of token) {
        await playTone(sym === '.' ? dd : dd * 3)
        await sleep(dd)
      }
      await sleep(dd * 2)
    }
    isPlaying.value = false
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }

  function encode() {
    morseOutput.value = textToMorse(inputText.value)
  }

  function decode() {
    decodedText.value = morseToText(inputText.value)
  }

  function generateQuiz() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    quizChar.value = chars[Math.floor(Math.random() * chars.length)]
    userAnswer.value = ''
  }

  function checkAnswer() {
    const correct = userAnswer.value.trim() === MORSE_TABLE[quizChar.value]
    score.value.total++
    if (correct) score.value.correct++
    history.value.unshift({
      id: Date.now(), input: quizChar.value, output: userAnswer.value,
      correct, timestamp: Date.now()
    })
    generateQuiz()
  }

  function resetScore() {
    score.value = { correct: 0, total: 0 }
    history.value = []
  }

  function getTodayStr(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  function loadReminderData() {
    const savedSchedule = localStorage.getItem('morse_reminder_schedule')
    const savedRecords = localStorage.getItem('morse_reminder_records')
    if (savedSchedule) {
      reminderSchedule.value = JSON.parse(savedSchedule)
    }
    if (savedRecords) {
      reminderRecords.value = JSON.parse(savedRecords)
    }
  }

  function saveReminderSchedule() {
    localStorage.setItem('morse_reminder_schedule', JSON.stringify(reminderSchedule.value))
  }

  function saveReminderRecords() {
    localStorage.setItem('morse_reminder_records', JSON.stringify(reminderRecords.value))
  }

  function setReminderSchedule(hour: number, minute: number, enabled: boolean) {
    reminderSchedule.value = { hour, minute, enabled }
    saveReminderSchedule()
    if (enabled) {
      startReminderCheck()
    } else {
      stopReminderCheck()
    }
  }

  function checkReminderTime() {
    if (!reminderSchedule.value.enabled) return
    
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    if (currentHour === reminderSchedule.value.hour && currentMinute === reminderSchedule.value.minute) {
      const todayStr = getTodayStr()
      const todayRecord = reminderRecords.value.find(r => r.date === todayStr)
      
      if (!todayRecord || !todayRecord.completed) {
        showReminderModal.value = true
      }
    }
  }

  function startReminderCheck() {
    if (reminderCheckInterval) return
    reminderCheckInterval = window.setInterval(checkReminderTime, 60000)
    checkReminderTime()
  }

  function stopReminderCheck() {
    if (reminderCheckInterval) {
      clearInterval(reminderCheckInterval)
      reminderCheckInterval = null
    }
  }

  function markTodayCompleted() {
    const todayStr = getTodayStr()
    const existingIndex = reminderRecords.value.findIndex(r => r.date === todayStr)
    
    if (existingIndex >= 0) {
      reminderRecords.value[existingIndex] = {
        ...reminderRecords.value[existingIndex],
        completed: true,
        completedAt: Date.now()
      }
    } else {
      reminderRecords.value.unshift({
        date: todayStr,
        completed: true,
        completedAt: Date.now()
      })
    }
    
    if (reminderRecords.value.length > 30) {
      reminderRecords.value = reminderRecords.value.slice(0, 30)
    }
    
    saveReminderRecords()
    showReminderModal.value = false
  }

  function dismissReminder() {
    showReminderModal.value = false
  }

  function getTodayRecord(): ReminderRecord | undefined {
    return reminderRecords.value.find(r => r.date === getTodayStr())
  }

  function getStreakDays(): number {
    let streak = 0
    const today = new Date()
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() - i)
      const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
      
      const record = reminderRecords.value.find(r => r.date === dateStr)
      if (record?.completed) {
        streak++
      } else if (i > 0) {
        break
      }
    }
    
    return streak
  }

  watch(reminderSchedule, () => {
    saveReminderSchedule()
  }, { deep: true })

  loadReminderData()

  return {
    inputText, morseOutput, decodedText, wpm, frequency, volume,
    trainMode, history, quizChar, userAnswer, score, isPlaying,
    reminderSchedule, reminderRecords, showReminderModal,
    dotDuration, encode, decode, playMorse, playTone,
    generateQuiz, checkAnswer, resetScore,
    setReminderSchedule, markTodayCompleted, dismissReminder,
    getTodayRecord, getStreakDays, startReminderCheck
  }
})
