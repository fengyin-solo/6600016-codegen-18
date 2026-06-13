<template>
  <div class="bg-gray-900 rounded-xl p-4">
    <h3 class="text-amber-300 font-bold mb-4 flex items-center gap-2">
      <span class="text-2xl">⏰</span>
      训练提醒
    </h3>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <label class="text-gray-300 font-medium">启用每日提醒</label>
          <button @click="toggleReminder"
            class="relative w-14 h-7 rounded-full transition-colors"
            :class="store.reminderSchedule.enabled ? 'bg-amber-500' : 'bg-gray-700'">
            <div class="absolute top-1 w-5 h-5 rounded-full bg-white transition-transform"
              :class="store.reminderSchedule.enabled ? 'translate-x-8' : 'translate-x-1'">
            </div>
          </button>
        </div>

        <div class="flex items-center gap-4">
          <label class="text-gray-400 text-sm w-20">提醒时间</label>
          <div class="flex items-center gap-2">
            <select v-model.number="selectedHour" :disabled="!store.reminderSchedule.enabled"
              class="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-amber-500 focus:outline-none disabled:opacity-50">
              <option v-for="h in 24" :key="h" :value="h - 1">
                {{ String(h - 1).padStart(2, '0') }}
              </option>
            </select>
            <span class="text-gray-400 text-xl">:</span>
            <select v-model.number="selectedMinute" :disabled="!store.reminderSchedule.enabled"
              class="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-amber-500 focus:outline-none disabled:opacity-50">
              <option v-for="m in 60" :key="m" :value="m - 1">
                {{ String(m - 1).padStart(2, '0') }}
              </option>
            </select>
          </div>
        </div>

        <button @click="saveSchedule" :disabled="!hasChanges"
          class="w-full bg-amber-500 text-black font-medium py-2 rounded hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          保存设置
        </button>
      </div>

      <div class="space-y-4">
        <div class="bg-gray-800 rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-gray-400">今日状态</span>
            <span class="text-lg font-bold" :class="todayCompleted ? 'text-green-400' : 'text-gray-500'">
              {{ todayCompleted ? '✓ 已完成' : '○ 待完成' }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-400">连续打卡</span>
            <span class="text-2xl font-bold text-amber-400">
              🔥 {{ streak }} 天
            </span>
          </div>
        </div>

        <div class="bg-gray-800 rounded-lg p-4">
          <h4 class="text-gray-300 font-medium mb-3">最近记录</h4>
          <div class="space-y-2 max-h-40 overflow-y-auto">
            <div v-if="store.reminderRecords.length === 0" class="text-gray-500 text-sm text-center py-4">
              暂无训练记录
            </div>
            <div v-for="record in recentRecords" :key="record.date"
              class="flex items-center justify-between text-sm">
              <span class="text-gray-400">{{ formatDate(record.date) }}</span>
              <span :class="record.completed ? 'text-green-400' : 'text-red-400'">
                {{ record.completed ? '✓ 完成' : '✗ 未完成' }}
              </span>
            </div>
          </div>
        </div>

        <button v-if="!todayCompleted" @click="markCompleted"
          class="w-full bg-green-600 text-white font-medium py-2 rounded hover:bg-green-500 transition-colors">
          手动标记今日已完成
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useMorseStore } from '../store/morse'

const store = useMorseStore()

const selectedHour = ref(store.reminderSchedule.hour)
const selectedMinute = ref(store.reminderSchedule.minute)

const hasChanges = computed(() => {
  return selectedHour.value !== store.reminderSchedule.hour ||
    selectedMinute.value !== store.reminderSchedule.minute
})

const todayCompleted = computed(() => {
  const record = store.getTodayRecord()
  return record?.completed ?? false
})

const streak = computed(() => store.getStreakDays())

const recentRecords = computed(() => store.reminderRecords.slice(0, 7))

function toggleReminder() {
  store.setReminderSchedule(
    store.reminderSchedule.hour,
    store.reminderSchedule.minute,
    !store.reminderSchedule.enabled
  )
}

function saveSchedule() {
  store.setReminderSchedule(
    selectedHour.value,
    selectedMinute.value,
    store.reminderSchedule.enabled
  )
}

function markCompleted() {
  store.markTodayCompleted()
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-')
  return `${parts[1]}/${parts[2]}`
}

watch(() => store.reminderSchedule, (newSchedule) => {
  selectedHour.value = newSchedule.hour
  selectedMinute.value = newSchedule.minute
}, { deep: true })

onMounted(() => {
  if (store.reminderSchedule.enabled) {
    store.startReminderCheck()
  }
})
</script>
