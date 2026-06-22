import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import { Navbar } from '../components/Navbar'
import type { Jogo, Time, ClassificacaoTime } from '../types'
import type { GrupoRef } from '../lib/bracketUsuario'
import { calcularClinchGrupo, type ClinchTime } from '../lib/clinchGrupo'
import { calcularClassificacoesReais } from '../lib/resultadosOficiais'
import { montarResolvedorProvisorio } from '../lib/resolverProvisorio'
import { PorFaseView } from '../components/resultados/PorFaseView'
import { BracketView } from '../components/resultados/BracketView'

type Modo = 'chaveamento' | 'fase'

export function Resultados() {
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Map<string, Time>>(new Map())
  const [grupos, setGrupos] = useState<GrupoRef[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [modo, setModo] = useState<Modo>('chaveamento')

  useEffect(() => {
    async function load() {
      try {
        const [jogosSnap, timesSnap, gruposSnap] = await Promise.all([
          getDocs(collection(db, 'jogos')),
          getDocs(collection(db, 'times')),
          getDocs(collection(db, 'grupos')),
        ])
        setJogos(jogosSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Jogo))
        const tmap = new Map<string, Time>()
        timesSnap.docs.forEach(d => tmap.set(d.id, { id: d.id, ...d.data() } as Time))
        setTimes(tmap)
        setGrupos(gruposSnap.docs.map(d => {
          const data = d.data() as { nome?: string; times?: string[] }
          return { nome: data.nome ?? `Grupo ${d.id}`, times: data.times ?? [] }
        }))
      } catch (e) {
        console.error('Falha ao carregar resultados', e)
        setErro(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const classificacoes = useMemo<Record<string, ClassificacaoTime[]>>(
    () => calcularClassificacoesReais(jogos, grupos),
    [jogos, grupos],
  )

  const clinchPorGrupo = useMemo<Record<string, Record<string, ClinchTime>>>(() => {
    const out: Record<string, Record<string, ClinchTime>> = {}
    const jogosGrupos = jogos.filter(j => j.fase === 'grupos')
    for (const g of grupos) {
      const letra = g.nome.replace('Grupo ', '')
      out[letra] = calcularClinchGrupo(jogosGrupos.filter(j => j.grupo === letra), g.times)
    }
    return out
  }, [jogos, grupos])

  const resolver = useMemo(
    () => montarResolvedorProvisorio(jogos, grupos),
    [jogos, grupos],
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className="text-xl font-bold text-gray-800">Resultados e Projeções</h1>
          {!erro && (
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setModo('chaveamento')}
                className={'px-3 py-1.5 text-sm ' + (modo === 'chaveamento' ? 'bg-blue-700 text-white' : 'bg-white text-gray-600')}
              >
                Chaveamento
              </button>
              <button
                onClick={() => setModo('fase')}
                className={'px-3 py-1.5 text-sm ' + (modo === 'fase' ? 'bg-blue-700 text-white' : 'bg-white text-gray-600')}
              >
                Por fase
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500">Carregando…</p>
        ) : erro ? (
          <p className="text-red-600">Não foi possível carregar os resultados. Tente recarregar a página.</p>
        ) : modo === 'fase' ? (
          <PorFaseView
            jogos={jogos}
            times={times}
            resolver={resolver}
            grupos={grupos}
            classificacoes={classificacoes}
            clinchPorGrupo={clinchPorGrupo}
          />
        ) : (
          <BracketView
            jogos={jogos}
            times={times}
            grupos={grupos}
            classificacoes={classificacoes}
            clinchPorGrupo={clinchPorGrupo}
            resolver={resolver}
          />
        )}
      </div>
    </div>
  )
}
