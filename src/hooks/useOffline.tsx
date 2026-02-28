import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface OfflineContextType {
  isOnline: boolean
  isSyncing: boolean
  pendingChanges: number
  lastSync: Date | null
  queueChange: (operation: string, data: any) => void
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined)

// IndexedDB setup for offline storage
const DB_NAME = 'kharadhu-offline'
const DB_VERSION = 1
const STORE_NAME = 'pending-changes'

async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

async function queueChangeDB(operation: string, data: any): Promise<void> {
  const db = await initDB()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  
  await new Promise<void>((resolve, reject) => {
    const request = store.add({
      operation,
      data,
      timestamp: new Date().toISOString(),
      synced: false
    })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function getPendingChanges(): Promise<any[]> {
  const db = await initDB()
  const transaction = db.transaction(STORE_NAME, 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result.filter((item: any) => !item.synced))
    request.onerror = () => reject(request.error)
  })
}

async function clearSyncedChanges(): Promise<void> {
  const db = await initDB()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  
  const items = await new Promise<any[]>((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  
  for (const item of items) {
    if (item.synced) {
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(item.id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }
  }
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingChanges, setPendingChanges] = useState(0)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    updatePendingCount()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingChanges > 0) {
      syncChanges()
    }
  }, [isOnline])

  const updatePendingCount = async () => {
    const changes = await getPendingChanges()
    setPendingChanges(changes.length)
  }

  const queueChange = async (operation: string, data: any) => {
    await queueChangeDB(operation, data)
    await updatePendingCount()
    
    // Try to sync immediately if online
    if (navigator.onLine) {
      syncChanges()
    }
  }

  const syncChanges = async () => {
    if (isSyncing) return
    
    setIsSyncing(true)
    const changes = await getPendingChanges()
    
    for (const change of changes) {
      try {
        // Dynamically import supabase to avoid circular dependency
        const { supabase } = await import('../lib/supabase')
        
        switch (change.operation) {
          case 'add_transaction':
            await supabase.from('transactions').insert(change.data)
            break
          case 'update_transaction':
            await supabase.from('transactions').update(change.data).eq('id', change.data.id)
            break
          case 'delete_transaction':
            await supabase.from('transactions').delete().eq('id', change.data.id)
            break
          case 'add_expense':
            await supabase.from('recurring_expenses').insert(change.data)
            break
          case 'add_income':
            await supabase.from('recurring_income').insert(change.data)
            break
        }
        
        // Mark as synced
        change.synced = true
      } catch (error) {
        console.error('Sync failed for change:', change, error)
      }
    }
    
    await clearSyncedChanges()
    await updatePendingCount()
    setLastSync(new Date())
    setIsSyncing(false)
  }

  return (
    <OfflineContext.Provider value={{ 
      isOnline, 
      isSyncing, 
      pendingChanges, 
      lastSync, 
      queueChange 
    }}>
      {children}
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-yellow-500 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Offline - Changes will sync when connected
        </div>
      )}
      {/* Syncing indicator */}
      {isSyncing && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Syncing {pendingChanges} changes...
        </div>
      )}
    </OfflineContext.Provider>
  )
}

export function useOffline() {
  const context = useContext(OfflineContext)
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider')
  }
  return context
}

// Helper hook for offline-aware mutations
export function useOfflineMutation() {
  const { isOnline, queueChange } = useOffline()

  const mutate = async (operation: string, data: any, onlineCallback: () => Promise<any>) => {
    if (isOnline) {
      // Online - execute immediately
      return await onlineCallback()
    } else {
      // Offline - queue for later
      await queueChange(operation, data)
      return { queued: true, message: 'Change queued for sync' }
    }
  }

  return { mutate }
}
