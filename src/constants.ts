import type { Condition } from './types'

export const CONDS: Condition[] = [
  { k: 'Concentrating', l: 'Concentrating', c: true, d: 'Requires mental focus. Ends if you cast another concentration spell, take damage, or become incapacitated.' },
  { k: 'Blinded', l: 'Blinded', d: "Can't see; fail sight checks; disadvantage on attacks; attacks against you have advantage." },
  { k: 'Charmed', l: 'Charmed', d: "Can't attack charmer; charmer has advantage on social checks against you." },
  { k: 'Deafened', l: 'Deafened', d: "Can't hear; auto-fail hearing checks." },
  { k: 'Exhaustion', l: 'Exhaustion', untimed: true, d: '1–6 scale. Each level: d20 −2×level, speed −5ft×level. Long Rest −1. Level 6 = death.' },
  { k: 'Frightened', l: 'Frightened', d: "Disadvantage on checks/attacks while source visible. Can't move closer." },
  { k: 'Grappled', l: 'Grappled', untimed: true, d: 'Speed 0; no speed bonuses.' },
  { k: 'Incapacitated', l: 'Incapacitated', d: 'No actions, bonus actions, or reactions.' },
  { k: 'Invisible', l: 'Invisible', d: "Can't be seen without magic. Advantage on attacks; attackers disadvantaged." },
  { k: 'Paralyzed', l: 'Paralyzed', d: "Incapacitated, can't move/speak. Auto-fail Str/Dex. Adjacent hits crit." },
  { k: 'Petrified', l: 'Petrified', untimed: true, d: 'Turned to stone. Incapacitated, speed 0, resist all damage, immune poison/disease.' },
  { k: 'Poisoned', l: 'Poisoned', d: 'Disadvantage on attack rolls and ability checks.' },
  { k: 'Prone', l: 'Prone', untimed: true, d: 'Can only crawl. Disadvantage on attacks. Attacks adv if attacker within 5ft.' },
  { k: 'Restrained', l: 'Restrained', d: "Speed 0. Attacks against you adv. Your attacks disadv. Dex saves disadv." },
  { k: 'Stunned', l: 'Stunned', d: "Incapacitated, can't move, speak falteringly. Auto-fail Str/Dex. Attacks adv." },
  { k: 'Unconscious', l: 'Unconscious', untimed: true, d: "Incapacitated, unaware, drops items, falls prone. Auto-fail Str/Dex. Adjacent hits crit." },
  { k: 'Outros', l: 'Outros', custom: true, d: '' }
]

export const REF_TYPES = [
  { k: 'texto', l: 'Texto' },
  { k: 'tabela', l: 'Tabela' },
  { k: 'imagem', l: 'Imagem' },
  { k: 'lista', l: 'Lista' },
  { k: 'link', l: 'Link' }
]

// Categorias da ferramenta Músicas (aplicadas a músicas e playlists).
export const MUSIC_CATS = ['Ambiências', 'Combate', 'Outros']

export const DAMAGE_TYPES = [
  'Acid',
  'Bludgeoning',
  'Cold',
  'Fire',
  'Force',
  'Lightning',
  'Necrotic',
  'Piercing',
  'Poison',
  'Psychic',
  'Radiant',
  'Slashing',
  'Thunder'
]

export const RAR_ORDER = ['Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact']

export const RAR_COLORS: Record<string, string> = {
  Uncommon: '#1a6b2a',
  Rare: '#1a3a6b',
  'Very Rare': '#5b2d8e',
  Legendary: '#b8860b',
  Artifact: '#8b0000'
}

export const RAR_BG: Record<string, string> = {
  Uncommon: '#e8f5e8',
  Rare: '#ddeeff',
  'Very Rare': '#ede0ff',
  Legendary: '#fff3cd',
  Artifact: '#fde8e8'
}
