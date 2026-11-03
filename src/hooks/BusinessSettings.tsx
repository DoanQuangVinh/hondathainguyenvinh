import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react'
import { business } from '../data/business'

type BusinessInfo = typeof business
const BusinessContext = createContext<BusinessInfo>(business)

function normalizeBusiness(value: unknown): BusinessInfo {
  if (!value || typeof value !== 'object') return business
  const settings = value as Record<string, unknown>
  const digits = typeof settings.phone === 'string' ? settings.phone.replace(/\D/g, '').slice(0, 15) : ''
  const phone = digits.length >= 9 ? digits : business.phone
  const phoneDisplay = phone.length === 10 ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone
  let zalo = business.zalo
  if (typeof settings.zalo === 'string') {
    try {
      const candidate = new URL(settings.zalo)
      if (candidate.protocol === 'https:' && candidate.hostname === 'zalo.me' && !candidate.username && !candidate.password) zalo = candidate.href
    } catch { /* Keep the built-in contact link if the configured URL is invalid. */ }
  }
  return {
    ...business,
    phone,
    phoneDisplay,
    phoneHref: `tel:${phone}`,
    zalo,
    address: typeof settings.address === 'string' ? settings.address.trim().slice(0, 300) : business.address
  }
}

export function BusinessSettingsProvider({ children }: PropsWithChildren) {
  const [value, setValue] = useState<BusinessInfo>(business)
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/catalog', { cache: 'no-store' })
      if (!response.ok) return
      const data = await response.json() as { settings?: { business?: unknown } }
      if (data.settings?.business) setValue(normalizeBusiness(data.settings.business))
    } catch { /* Static contact details remain available when the catalog is offline. */ }
  }, [])

  useEffect(() => {
    void refresh()
    window.addEventListener('cms-settings-updated', refresh)
    return () => window.removeEventListener('cms-settings-updated', refresh)
  }, [refresh])

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusinessSettings() {
  return useContext(BusinessContext)
}
