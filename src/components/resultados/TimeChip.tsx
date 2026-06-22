import type { Time } from '../../types'
import type { SlotResolvido } from '../../lib/resolverProvisorio'

export interface TimeChipProps {
  slot: SlotResolvido
  /** Label de origem (ex.: "2A", "3ABCDF") exibido quando o time ainda não foi resolvido. */
  label?: string
  times: Map<string, Time>
  /** Inverte a ordem (bandeira à direita) — usado no lado visitante de cards espelhados. */
  reverse?: boolean
}

/** Cria um slot "definido" para um time concreto (jogos de grupo, sem provisoriedade). */
export function slotDireto(timeId: string | null): SlotResolvido {
  return { timeId, classificado: false, provisorio: false }
}

/**
 * Exibe um lado de confronto: bandeira + sigla do time, com selo ✓ quando
 * classificado e aparência esmaecida quando a vaga ainda é provisória. Quando o
 * time não foi resolvido, mostra o label de origem ("2A", "W74"…).
 */
export function TimeChip({ slot, label, times, reverse = false }: TimeChipProps) {
  if (!slot.timeId) {
    return <span className="text-xs text-gray-400 italic">{label ?? '—'}</span>
  }
  const t = times.get(slot.timeId)
  const nome = t?.sigla ?? t?.nome ?? slot.timeId
  const fraco = slot.provisorio && !slot.classificado

  return (
    <span className={'flex items-center gap-1 min-w-0 ' + (reverse ? 'flex-row-reverse' : '')}>
      {t?.bandeira && (
        <img src={t.bandeira} alt={t?.nome ?? nome} className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
      )}
      <span className={'font-medium truncate ' + (fraco ? 'text-gray-400 italic' : 'text-gray-800')}>
        {nome}
      </span>
      {slot.classificado && (
        <span className="text-green-600 text-[10px] font-bold shrink-0" title="Já classificado">✓</span>
      )}
    </span>
  )
}
