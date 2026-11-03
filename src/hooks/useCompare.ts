import { useEffect, useState } from 'react'
const KEY = 'honda-thai-nguyen-compare-v1'
export function useCompare() {
  const [ids, setIds] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') as string[] } catch { return [] } })
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(ids)), [ids])
  const toggle = (id: string) => setIds(current => current.includes(id) ? current.filter(x => x !== id) : current.length < 3 ? [...current, id] : current)
  const remove = (id: string) => setIds(current => current.filter(x => x !== id))
  return { ids, toggle, remove, clear: () => setIds([]) }
}
