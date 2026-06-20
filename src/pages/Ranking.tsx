import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDocs, onSnapshot, query, where, type Timestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Ranking, Usuario, Jogo, Time, Palpite, Config } from '../types'
import { Navbar } from '../components/Navbar'
import { RankingTable, type JogoAoVivoRanking } from '../components/RankingTable'
import { RankingDestaques } from '../components/RankingDestaques'
import { AoVivo } from '../components/AoVivo'
import { useAuth } from '../hooks/useAuth'

type RankingComUsuario = Ranking & { usuario: Usuario }

function rankingZerado(uid: string): Ranking {
  return {
    uid,
    pontosTotal: 0,
    pontosJogos: 0,
    pontosEspeciais: 0,
    placaresExatos: 0,
    colunasCertas: 0,
    totalGolsAcertados: 0,
    pontosFaseGrupos: 0,
    pontosJogosBrasil: 0,
  }
}

export function Ranking() {
  const { firebaseUser } = useAuth()
  const [ranking, setRanking] = useState<RankingComUsuario[]>([])
  const [loading, setLoading] = useState(true)

  // Estado para as colunas de palpite ao vivo na tabela.
  const [config, setConfig] = useState<Config | null>(null)
  const [times, setTimes] = useState<Map<string, Time>>(new Map())
  const [jogosLive, setJogosLive] = useState<Jogo[]>([])
  const [palpitesLive, setPalpitesLive] = useState<Map<string, Palpite>>(new Map())
  const [rankingAtualizadoEm, setRankingAtualizadoEm] = useState<Timestamp | null>(null)

  // Última atualização do ranking — gravada pela Cloud Function em _system/ranking_meta
  // a cada recálculo. onSnapshot para refletir em tempo real quando um jogo encerra.
  useEffect(() => {
    const unsub = onSnapshot(doc(db, '_system', 'ranking_meta'), (snap) => {
      const ts = snap.data()?.atualizadoEm
      // serverTimestamp pode chegar null momentaneamente (latency compensation).
      setRankingAtualizadoEm(ts ?? null)
    }, () => { /* offline / sem doc — ignora */ })
    return () => unsub()
  }, [])

  // Times — carregados uma vez (não mudam com frequência).
  useEffect(() => {
    getDocs(collection(db, 'times')).then((snap) => {
      const m = new Map<string, Time>()
      snap.docs.forEach((d) => m.set(d.id, { id: d.id, ...d.data() } as Time))
      setTimes(m)
    }).catch(() => { /* offline — ignora */ })
  }, [])

  // Config (pontos, visibilidade, prazo) em tempo real: se o admin mudar a
  // visibilidade durante um jogo ao vivo, recomputamos podeVerAlheios sem reload.
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'geral'), (snap) => {
      if (snap.exists()) setConfig(snap.data() as Config)
    }, () => { /* offline — ignora */ })
    return () => unsub()
  }, [])

  // Jogos ao vivo (tempo real — o placar muda durante o jogo).
  useEffect(() => {
    const q = query(collection(db, 'jogos'), where('aoVivo', '==', true))
    const unsub = onSnapshot(q, (snap) => {
      setJogosLive(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Jogo)))
    }, () => { /* sem jogos ao vivo ou sem permissão — ignora */ })
    return () => unsub()
  }, [])

  // Instante de montagem — lido uma vez (Date.now é impuro no render reativo).
  const [agoraMs] = useState(() => Date.now())

  // Só dá para mostrar palpites de TODOS os participantes quando as regras de
  // visibilidade permitem (mesmas condições de canReadPalpite no firestore.rules
  // para um jogo ao vivo, que nunca está encerrado).
  const podeVerAlheios = useMemo(() => {
    if (!config) return false
    if (config.visibilidadePalpites === 'sempre') return true
    if (config.visibilidadePalpites === 'apos_prazo') {
      return agoraMs >= config.prazoLimitePalpites.toMillis()
    }
    return false // 'apos_jogo' (jogo ao vivo não encerrado) ou 'nunca'
  }, [config, agoraMs])

  // Jogos ao vivo ordenados e limitados a 30 (limite do operador 'in' do
  // Firestore) — fonte única para as colunas E para a query de palpites, para
  // que cabeçalho e dados nunca divirjam.
  const jogosAoVivo = useMemo<JogoAoVivoRanking[]>(() => {
    if (!podeVerAlheios) return []
    return [...jogosLive]
      .sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis())
      .slice(0, 30)
      .map((jogo) => ({
        jogo,
        timeCasa: times.get(jogo.timeCasa) ?? null,
        timeVisitante: times.get(jogo.timeVisitante) ?? null,
      }))
  }, [podeVerAlheios, jogosLive, times])

  // Chave estável: só muda quando o CONJUNTO de jogos ao vivo muda (entra/sai
  // jogo), não a cada gol. Evita refazer o getDocs de palpites a cada placar.
  const liveKey = useMemo(() => jogosAoVivo.map((j) => j.jogo.id).join(','), [jogosAoVivo])

  // Palpites de todos os participantes para os jogos ao vivo. Palpites não mudam
  // durante o jogo (prazo fechado), então uma leitura pontual basta.
  useEffect(() => {
    const ids = liveKey ? liveKey.split(',') : []
    // Sem jogos ao vivo / sem permissão: jogosAoVivo é [], então as colunas não
    // renderizam e um palpitesLive obsoleto nunca é consultado — não precisa limpar.
    if (!podeVerAlheios || ids.length === 0) return
    let cancelado = false
    const q = query(collection(db, 'palpites'), where('jogoId', 'in', ids))
    getDocs(q).then((snap) => {
      if (cancelado) return
      const m = new Map<string, Palpite>()
      snap.docs.forEach((d) => {
        const p = { id: d.id, ...d.data() } as Palpite
        m.set(`${p.uid}_${p.jogoId}`, p)
      })
      setPalpitesLive(m)
    }).catch(() => { /* sem permissão ou offline — sem colunas */ })
    return () => { cancelado = true }
  }, [podeVerAlheios, liveKey])

  useEffect(() => {
    async function load() {
      const [rankingSnap, usuariosSnap] = await Promise.all([
        getDocs(collection(db, 'ranking')),
        getDocs(collection(db, 'usuarios')),
      ])

      const usuariosMap = new Map<string, Usuario>()
      usuariosSnap.forEach((doc) => {
        usuariosMap.set(doc.id, { uid: doc.id, ...doc.data() } as Usuario)
      })

      const rankingMap = new Map<string, Ranking>()
      rankingSnap.forEach((doc) => {
        const r = { uid: doc.id, ...doc.data() } as Ranking
        rankingMap.set(r.uid, r)
      })

      const lista: RankingComUsuario[] = []
      usuariosMap.forEach((usuario, uid) => {
        const r = rankingMap.get(uid) ?? rankingZerado(uid)
        lista.push({ ...r, usuario })
      })

      // Desempate conforme regras originais:
      // 1. Maior nº de placares exatos (5 pts)
      // 2. Maior nº de pontos em jogos (sem especiais)
      // 3. Mais pontos na fase de grupos
      // 4. Mais pontos nos jogos do Brasil
      // 5. Divisão do prêmio
      lista.sort((a, b) => {
        if (b.pontosTotal !== a.pontosTotal) return b.pontosTotal - a.pontosTotal
        if ((b.placaresExatos ?? 0) !== (a.placaresExatos ?? 0)) return (b.placaresExatos ?? 0) - (a.placaresExatos ?? 0)
        if ((b.pontosJogos ?? 0) !== (a.pontosJogos ?? 0)) return (b.pontosJogos ?? 0) - (a.pontosJogos ?? 0)
        if ((b.pontosFaseGrupos ?? 0) !== (a.pontosFaseGrupos ?? 0)) return (b.pontosFaseGrupos ?? 0) - (a.pontosFaseGrupos ?? 0)
        if ((b.pontosJogosBrasil ?? 0) !== (a.pontosJogosBrasil ?? 0)) return (b.pontosJogosBrasil ?? 0) - (a.pontosJogosBrasil ?? 0)
        return (a.usuario.apelido || a.usuario.nome || '').localeCompare(b.usuario.apelido || b.usuario.nome || '')
      })

      setRanking(lista)
      setLoading(false)
    }

    load()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-2 sm:px-6 py-6 sm:py-10">
        {firebaseUser && <AoVivo uid={firebaseUser.uid} />}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Ranking</h1>
          {rankingAtualizadoEm && (
            <p className="text-xs text-gray-500 mt-1">
              Atualizado em{' '}
              {rankingAtualizadoEm.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })}
              {' às '}
              {rankingAtualizadoEm.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
            </p>
          )}
        </div>
        {loading ? (
          <p className="text-gray-500">Carregando...</p>
        ) : ranking.length === 0 ? (
          <p className="text-gray-500">Ranking ainda não disponível.</p>
        ) : (
          <>
            <RankingDestaques ranking={ranking} />
            <RankingTable
              ranking={ranking}
              jogosAoVivo={jogosAoVivo}
              palpitesLive={palpitesLive}
            />
          </>
        )}
      </main>
    </div>
  )
}
