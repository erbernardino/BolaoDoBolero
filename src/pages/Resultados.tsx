import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'
import { Navbar } from '../components/Navbar'
import type { Jogo, Time, ClassificacaoTime } from '../types'
import type { GrupoRef } from '../lib/bracketUsuario'
import { calcularClinchGrupo, type ClinchTime } from '../lib/clinchGrupo'
import { calcularClassificacoesReais } from '../lib/resultadosOficiais'
import { montarResolvedorProvisorio, type ResolverProvisorio } from '../lib/resolverProvisorio'
import type { SnapshotResultados } from '../lib/snapshotResultados'
import { PorFaseView } from '../components/resultados/PorFaseView'
import { BracketView } from '../components/resultados/BracketView'

type Modo = 'chaveamento' | 'fase'

const SLOT_VAZIO = { timeId: null, classificado: false, provisorio: false }
const SLOTS_VAZIOS = { casa: SLOT_VAZIO, visitante: SLOT_VAZIO }

export function Resultados() {
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Map<string, Time>>(new Map())
  const [grupos, setGrupos] = useState<GrupoRef[]>([])
  const [snapshot, setSnapshot] = useState<SnapshotResultados | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [modo, setModo] = useState<Modo>('chaveamento')

  // times e grupos não mudam durante a Copa: leitura pontual.
  useEffect(() => {
    async function loadEstaticos() {
      try {
        const [timesSnap, gruposSnap] = await Promise.all([
          getDocs(collection(db, 'times')),
          getDocs(collection(db, 'grupos')),
        ])
        const tmap = new Map<string, Time>()
        timesSnap.docs.forEach(d => tmap.set(d.id, { id: d.id, ...d.data() } as Time))
        setTimes(tmap)
        setGrupos(gruposSnap.docs
          .map(d => {
            const data = d.data() as { nome?: string; times?: string[] }
            return { nome: data.nome ?? `Grupo ${d.id}`, times: data.times ?? [] }
          })
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
      } catch (e) {
        console.error('Falha ao carregar times/grupos', e)
        setErro(true)
      }
    }
    loadEstaticos()
  }, [])

  // jogos e snapshot: tempo real.
  useEffect(() => {
    const unsubJogos = onSnapshot(
      collection(db, 'jogos'),
      snap => {
        setJogos(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Jogo))
        setLoading(false)
      },
      e => { console.error('Falha ao escutar jogos', e); setErro(true); setLoading(false) },
    )
    const unsubSnap = onSnapshot(
      doc(db, '_system', 'resultados'),
      snap => setSnapshot(snap.exists() ? (snap.data() as SnapshotResultados) : null),
      e => { console.error('Falha ao escutar snapshot', e); setSnapshot(null) },
    )
    return () => { unsubJogos(); unsubSnap() }
  }, [])

  // Snapshot é usável quando existe e bate com a contagem atual de jogos encerrados.
  const snapshotFresco = useMemo(() => {
    if (!snapshot) return false
    const encerrados = jogos.filter(j => j.encerrado && j.resultado).length
    return snapshot.baseadoEm?.jogosEncerrados === encerrados
  }, [snapshot, jogos])

  const classificacoes = useMemo<Record<string, ClassificacaoTime[]>>(
    () => (snapshotFresco && snapshot ? snapshot.classificacoes : calcularClassificacoesReais(jogos, grupos)),
    [snapshotFresco, snapshot, jogos, grupos],
  )

  const clinchPorGrupo = useMemo<Record<string, Record<string, ClinchTime>>>(() => {
    if (snapshotFresco && snapshot) return snapshot.clinch
    const out: Record<string, Record<string, ClinchTime>> = {}
    const jogosGrupos = jogos.filter(j => j.fase === 'grupos')
    for (const g of grupos) {
      const letra = g.nome.replace('Grupo ', '')
      out[letra] = calcularClinchGrupo(jogosGrupos.filter(j => j.grupo === letra), g.times)
    }
    return out
  }, [snapshotFresco, snapshot, jogos, grupos])

  const resolver = useMemo<ResolverProvisorio>(() => {
    if (snapshotFresco && snapshot) {
      return jogo => snapshot.bracket[jogo.id] ?? SLOTS_VAZIOS
    }
    return montarResolvedorProvisorio(jogos, grupos)
  }, [snapshotFresco, snapshot, jogos, grupos])

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
