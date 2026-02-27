import { useEffect, useState, useCallback } from 'react'

interface QueuedAction {
  id: string
  type: 'insert' | 'update' | 'delete'
  table: string
  data: any
  timestamp: number
}

const QUEUE_KEY = 'offline_queue'
const LAST_SYNC_KEY = 'last_sync'

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    updatePendingCount()
  }, [])

  const updatePendingCount = () => {
    const queue = getQueue()
    setPendingCount(queue.length)
  }

  const getQueue = (): QueuedAction[] => {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    } catch {
      return []
    }
  }

  const saveQueue = (queue: QueuedAction[]) => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    setPendingCount(queue.length)
  }

  const queueAction = useCallback((type: QueuedAction['type'], table: string, data: any) => {
    const queue = getQueue()
    queue.push({
      id: crypto.randomUUID(),
      type,
      table,
      data,
      timestamp: Date.now()
    })
    saveQueue(queue)
  }, [])

  const sync = useCallback(async (supabaseClient: any) => {
    if (!navigator.onLine) return
    
    setIsSyncing(true)
    const queue = getQueue()
    const failed: QueuedAction[] = []

    for (const action of queue) {
      try {
        if (action.type === 'insert') {
          await supabaseClient.from(action.table).insert(action.data)
        } else if (action.type === 'update') {
          await supabaseClient.from(action.table).update(action.data).eq('id', action.data.id)
        } else if (action.type === 'delete') {
          await supabaseClient.from(action.table).delete().eq('id', action.data.id)
        }
      } catch (err) {
        failed.push(action)
      }
    }

    saveQueue(failed)
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString())
    setIsSyncing(false)
  }, [])

  const getLastSync = () => {
    return localStorage.getItem(LAST_SYNC_KEY)
  }

  const saveDataLocally = (key: string, data: any) => {
    localStorage.setItem(`offline_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  }

  const getLocalData = (key: string) => {
    try {
      const item = localStorage.getItem(`offline_${key}`)
      if (!item) return null
      return JSON.parse(item).data
    } catch {
      return null
    }
  }

  return {
    isOnline,
    isSyncing,
    pendingCount,
    queueAction,
    sync,
    getLastSync,
    saveDataLocally,
    getLocalData
  }
}
