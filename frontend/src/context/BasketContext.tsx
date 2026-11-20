import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'tiku-basket-v2'

interface BasketContextValue {
  ids: number[]
  count: number
  has: (id: number) => boolean
  add: (id: number) => boolean
  remove: (id: number) => void
  toggle: (id: number) => boolean
  addMany: (ids: number[]) => number
  clear: () => void
  move: (id: number, direction: -1 | 1) => void
  moveTo: (id: number, index: number) => void
  replace: (ids: number[]) => void
}

const BasketContext = createContext<BasketContextValue | null>(null)

function readStorage(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is number => Number.isInteger(value) && value > 0)
  } catch {
    return []
  }
}

export function BasketProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>(readStorage)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  }, [ids])

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setIds(readStorage())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const add = useCallback((id: number) => {
    let added = false
    setIds((current) => {
      if (current.includes(id)) return current
      added = true
      return [...current, id]
    })
    return added
  }, [])

  const remove = useCallback((id: number) => {
    setIds((current) => current.filter((value) => value !== id))
  }, [])

  const toggle = useCallback((id: number) => {
    let nowAdded = false
    setIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id)
      nowAdded = true
      return [...current, id]
    })
    return nowAdded
  }, [])

  const addMany = useCallback((incoming: number[]) => {
    let addedCount = 0
    setIds((current) => {
      const next = [...current]
      incoming.forEach((id) => {
        if (!next.includes(id)) {
          next.push(id)
          addedCount += 1
        }
      })
      return addedCount > 0 ? next : current
    })
    return addedCount
  }, [])

  const clear = useCallback(() => setIds([]), [])

  const move = useCallback((id: number, direction: -1 | 1) => {
    setIds((current) => {
      const index = current.indexOf(id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }, [])

  const moveTo = useCallback((id: number, targetIndex: number) => {
    setIds((current) => {
      const from = current.indexOf(id)
      if (from < 0) return current
      const target = Math.max(0, Math.min(current.length - 1, targetIndex))
      if (from === target) return current
      const next = [...current]
      next.splice(from, 1)
      next.splice(target, 0, id)
      return next
    })
  }, [])

  const replace = useCallback((next: number[]) => {
    const unique = Array.from(new Set(next.filter((id) => Number.isInteger(id) && id > 0)))
    setIds(unique)
  }, [])

  const value = useMemo<BasketContextValue>(
    () => ({
      ids,
      count: ids.length,
      has: (id) => ids.includes(id),
      add,
      remove,
      toggle,
      addMany,
      clear,
      move,
      moveTo,
      replace,
    }),
    [ids, add, remove, toggle, addMany, clear, move, moveTo, replace],
  )

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>
}

export function useBasket(): BasketContextValue {
  const context = useContext(BasketContext)
  if (!context) throw new Error('useBasket 必须在 BasketProvider 内使用')
  return context
}
