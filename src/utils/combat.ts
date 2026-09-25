export interface Resistible {
  resist?: string[]
  vuln?: string[]
  immune?: string[]
}

// Ajusta o dano conforme resistência/vulnerabilidade/imunidade ao tipo informado.
export type DamageAdjustment = 'immune' | 'resist' | 'vuln' | null

export function damageAdjustment(c: Resistible, type: string): DamageAdjustment {
  if (!type) return null
  if ((c.immune || []).includes(type)) return 'immune'
  if ((c.resist || []).includes(type)) return 'resist'
  if ((c.vuln || []).includes(type)) return 'vuln'
  return null
}

/** Aviso para o mestre quando o tipo bate em imunidade, resistência ou vulnerabilidade. */
export function damageAdjustmentWarning(
  name: string,
  type: string,
  raw: number,
  adj: DamageAdjustment
): string | null {
  if (!adj || !type || raw <= 0) return null
  if (adj === 'immune') return `${name} é imune a ${type}: não tomará dano (0 de ${raw}).`
  if (adj === 'resist') {
    const half = Math.floor(raw / 2)
    return `${name} é resistente a ${type}: tomará metade do dano (${half} de ${raw}).`
  }
  if (adj === 'vuln') return `${name} é vulnerável a ${type}: tomará o dobro do dano (${raw * 2} de ${raw}).`
  return null
}

export function effectiveDamage(c: Resistible, dmg: number, type: string): number {
  if (!type) return dmg
  if ((c.immune || []).includes(type)) return 0
  if ((c.resist || []).includes(type)) return Math.floor(dmg / 2)
  if ((c.vuln || []).includes(type)) return dmg * 2
  return dmg
}

export function hpPercent(hp: number, hpMax: number): number {
  if (hpMax <= 0) return 0
  if (hp > hpMax) return 100
  return Math.max(0, Math.round((hp / hpMax) * 100))
}

// Rótulo aproximado de saúde (para a tela de jogador, sem números exatos).
export function hpStatus(hp: number, hpMax: number, dead: boolean): string {
  if (dead || hp <= 0) return 'Fora de combate'
  const pct = hpPercent(hp, hpMax)
  if (pct > 75) return 'Saudável'
  if (pct > 50) return 'Ferido'
  if (pct > 25) return 'Machucado'
  return 'Estado grave'
}

export function hpBarColor(hp: number, hpMax: number): string {
  if (hp > hpMax) return '#1a6b8a'
  const pct = hpPercent(hp, hpMax)
  return pct > 50 ? '#2d6e2d' : pct > 25 ? '#c48900' : '#c41e1e'
}
