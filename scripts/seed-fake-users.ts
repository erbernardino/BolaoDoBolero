// scripts/seed-fake-users.ts
// Cria 5 usuários fake com palpites para todos os 104 jogos + palpites especiais

import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

initializeApp({ projectId: 'bolao-do-bolero' })
const db = getFirestore()

const FAKE_USERS = [
  { uid: 'fake_carlos', nome: 'Carlos Silva', apelido: 'Carlão', email: 'carlos@fake.com', telefone: '11999990001' },
  { uid: 'fake_ana', nome: 'Ana Oliveira', apelido: 'Aninha', email: 'ana@fake.com', telefone: '11999990002' },
  { uid: 'fake_pedro', nome: 'Pedro Santos', apelido: 'Pedrão', email: 'pedro@fake.com', telefone: '11999990003' },
  { uid: 'fake_julia', nome: 'Julia Costa', apelido: 'Ju', email: 'julia@fake.com', telefone: '11999990004' },
  { uid: 'fake_marcos', nome: 'Marcos Ferreira', apelido: 'Marquinhos', email: 'marcos@fake.com', telefone: '11999990005' },
]

// Times fortes para palpites especiais (variados por usuário)
const FAVORITOS = [
  { campeao: 'adQ3u11wHpa1ppEHA6U4', vice: 'IhorDrd2lRnPahBYaCUt', terceiro: 'pBCoo9LsQXEJHttc9uh6', quarto: 'FhtaC3QKhaQoCpJMa8zC', paisArtilheiro: 'adQ3u11wHpa1ppEHA6U4' }, // BRA, ARG, FRA, GER, BRA
  { campeao: 'IhorDrd2lRnPahBYaCUt', vice: 'pBCoo9LsQXEJHttc9uh6', terceiro: 'adQ3u11wHpa1ppEHA6U4', quarto: 'MORwi3txhmtvl65q53o0', paisArtilheiro: 'IhorDrd2lRnPahBYaCUt' }, // ARG, FRA, BRA, ESP, ARG
  { campeao: 'pBCoo9LsQXEJHttc9uh6', vice: 'adQ3u11wHpa1ppEHA6U4', terceiro: '7Wslu5fFh6BaKnLjUlIJ', quarto: 'J9NdprbyufvPDJ00PYFt', paisArtilheiro: 'pBCoo9LsQXEJHttc9uh6' }, // FRA, BRA, ENG, POR, FRA
  { campeao: 'MORwi3txhmtvl65q53o0', vice: 'adQ3u11wHpa1ppEHA6U4', terceiro: 'IhorDrd2lRnPahBYaCUt', quarto: '7Wslu5fFh6BaKnLjUlIJ', paisArtilheiro: 'MORwi3txhmtvl65q53o0' }, // ESP, BRA, ARG, ENG, ESP
  { campeao: 'adQ3u11wHpa1ppEHA6U4', vice: 'MORwi3txhmtvl65q53o0', terceiro: 'J9NdprbyufvPDJ00PYFt', quarto: 'qDyOwNgZGQmTkic6PyYF', paisArtilheiro: 'pBCoo9LsQXEJHttc9uh6' }, // BRA, ESP, POR, NED, FRA
]

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Gera placar aleatório com tendência realista (mais gols baixos)
function gerarPlacar(): [number, number] {
  const pesos = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5]
  const golsCasa = pesos[randInt(0, pesos.length - 1)]
  const golsVisitante = pesos[randInt(0, pesos.length - 1)]
  return [golsCasa, golsVisitante]
}

async function main() {
  console.log('Criando 5 usuários fake...\n')

  // 1. Criar usuários
  for (const user of FAKE_USERS) {
    await db.doc(`usuarios/${user.uid}`).set({
      uid: user.uid,
      nome: user.nome,
      apelido: user.apelido,
      email: user.email,
      telefone: user.telefone,
      role: 'participante',
      conviteId: 'fake_convite',
      criadoEm: Timestamp.now(),
    })
    console.log(`  Usuario criado: ${user.apelido} (${user.uid})`)
  }

  // 2. Carregar todos os jogos
  const jogosSnap = await db.collection('jogos').get()
  const jogos = jogosSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  console.log(`\n${jogos.length} jogos encontrados. Gerando palpites...\n`)

  // 3. Criar palpites para cada usuário
  for (let u = 0; u < FAKE_USERS.length; u++) {
    const user = FAKE_USERS[u]
    let count = 0

    // Palpites em batches de 500 (limite do Firestore)
    const batches: FirebaseFirestore.WriteBatch[] = [db.batch()]
    let batchIdx = 0
    let batchCount = 0

    for (const jogo of jogos) {
      const j = jogo as any
      const [golsCasa, golsVisitante] = gerarPlacar()
      const isMataMata = j.fase !== 'grupos'
      const empate = golsCasa === golsVisitante

      // Em mata-mata com empate, escolher aleatoriamente quem avança
      let classificado: string | null = null
      if (isMataMata && empate) {
        // Para jogos de mata-mata, timeCasa/timeVisitante podem estar vazios
        // Usamos um placeholder - o sistema resolve dinamicamente
        classificado = Math.random() > 0.5 ? (j.timeCasa || 'casa') : (j.timeVisitante || 'visitante')
      }

      const palpiteId = `${user.uid}_${jogo.id}`
      const palpiteRef = db.doc(`palpites/${palpiteId}`)

      batches[batchIdx].set(palpiteRef, {
        id: palpiteId,
        uid: user.uid,
        jogoId: jogo.id,
        timeCasa: j.timeCasa || '',
        timeVisitante: j.timeVisitante || '',
        golsCasa,
        golsVisitante,
        classificado,
        criadoEm: Timestamp.now(),
      })

      batchCount++
      count++

      if (batchCount >= 490) {
        batchIdx++
        batches.push(db.batch())
        batchCount = 0
      }
    }

    for (const batch of batches) {
      await batch.commit()
    }
    console.log(`  ${user.apelido}: ${count} palpites criados`)

    // 4. Palpites especiais
    const fav = FAVORITOS[u]
    await db.doc(`palpites_especiais/${user.uid}`).set({
      uid: user.uid,
      campeao: fav.campeao,
      vice: fav.vice,
      terceiro: fav.terceiro,
      quarto: fav.quarto,
      paisArtilheiro: fav.paisArtilheiro,
      criadoEm: Timestamp.now(),
    })
    console.log(`  ${user.apelido}: palpites especiais criados`)
  }

  console.log('\nSeed de usuários fake concluído!')
  console.log(`  5 usuários × ${jogos.length} jogos = ${5 * jogos.length} palpites`)
}

main().catch(console.error)
