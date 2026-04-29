import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface HistoryEntry {
  content: string
  timestamp: number
}

interface HistoryState {
  entries: Record<string, HistoryEntry>
  set: (key: string, content: string) => void
  get: (key: string) => string | null
  getAll: () => { key: string; content: string; timestamp: number }[]
  remove: (key: string) => void
  clear: () => void
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: {},

      set: (key, content) =>
        set((state) => ({
          entries: {
            ...state.entries,
            [key]: { content, timestamp: Date.now() },
          },
        })),

      get: (key) => {
        const entry = get().entries[key]
        return entry?.content || null
      },

      getAll: () => {
        const entries = get().entries
        return Object.entries(entries)
          .map(([key, val]) => ({ key, content: val.content, timestamp: val.timestamp }))
          .sort((a, b) => b.timestamp - a.timestamp)
      },

      remove: (key) =>
        set((state) => {
          const newEntries = { ...state.entries }
          delete newEntries[key]
          return { entries: newEntries }
        }),

      clear: () => set({ entries: {} }),
    }),
    {
      name: 'reponexus-history',
    }
  )
)
