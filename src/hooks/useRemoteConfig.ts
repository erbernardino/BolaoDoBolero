import { useEffect, useState } from 'react'
import { getValue } from 'firebase/remote-config'
import { remoteConfig, ensureRemoteConfig, REMOTE_CONFIG_DEFAULTS } from '../config/firebase'

// Hook para ler uma flag do Remote Config. Retorna o valor atual (default
// enquanto o fetchAndActivate nao termina, valor remoto depois).
//
// Uso:
//   const homeEnriched = useRemoteFlag('feature_home_enriched', true)
export function useRemoteFlag<T extends boolean | string | number>(
  key: string,
  fallback: T,
): T {
  const [value, setValue] = useState<T>(() => readValue(key, fallback))

  useEffect(() => {
    let cancelled = false
    ensureRemoteConfig().then(() => {
      if (cancelled) return
      setValue(readValue(key, fallback))
    })
    return () => { cancelled = true }
  }, [key, fallback])

  return value
}

function readValue<T extends boolean | string | number>(key: string, fallback: T): T {
  try {
    const v = getValue(remoteConfig, key)
    if (typeof fallback === 'boolean') return v.asBoolean() as T
    if (typeof fallback === 'number') return v.asNumber() as T
    return v.asString() as T
  } catch {
    return (REMOTE_CONFIG_DEFAULTS[key] as T) ?? fallback
  }
}
