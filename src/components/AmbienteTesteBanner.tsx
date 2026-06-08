import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

export function AmbienteTesteBanner() {
  const [ativo, setAtivo] = useState(false)

  useEffect(() => {
    getDoc(doc(db, '_system', 'teste'))
      .then(snap => {
        if (snap.exists() && snap.data().isteste === true) setAtivo(true)
      })
      .catch(() => {})
  }, [])

  if (!ativo) return null

  return (
    <div className="sticky top-0 z-50 bg-red-600 text-white text-center text-sm font-bold px-4 py-2 shadow-lg tracking-wide">
      ⚠️ AMBIENTE DE TESTES
    </div>
  )
}
