export interface Creature {
  id: number
  name: string
  init: number
  initReal: number
  hp: number
  hpMax: number
  ac: number | null
  fichaId: string | number
  dead: boolean
  conditions: string[]
  customConditionLabel?: Record<string, string>
  // Extensões (opcionais para compatibilidade com dados antigos)
  tempHp?: number
  initBonus?: number | null
  resist?: string[]
  vuln?: string[]
  immune?: string[]
  isLegendary?: boolean
  legActionsMax?: number
  legActions?: number
  /** Resistência lendária (usos / dia). Não recarrega no turno. */
  legResistMax?: number
  legResist?: number
  conditionDurations?: Record<string, number>
  /** PJ vinculado (sync de HP com Personagens). */
  personagemId?: number
  /** Salvamentos contra morte (PJ a 0 HP). */
  deathSaveSuccesses?: number
  deathSaveFailures?: number
  /** 3 sucessos — estável a 0 HP até cura ou novo dano. */
  stable?: boolean
}

export interface CombatLogEntry {
  id: number
  round: number
  text: string
}

export interface StatEntry {
  name: string
  desc: string
}

export interface Ficha {
  id: number
  name: string
  hpMax: number | null
  ac: number | null
  initBonus: number | null
  type: string | null
  img: string | null
  // Statblock (opcionais)
  size?: string | null
  alignment?: string | null
  cr?: string | null
  speed?: string | null
  str?: number | null
  dex?: number | null
  con?: number | null
  int?: number | null
  wis?: number | null
  cha?: number | null
  // Traços e ações: lista estruturada (nome + descrição).
  // Dados antigos podem estar como string; use toEntries() para normalizar.
  traits?: StatEntry[] | string | null
  actions?: StatEntry[] | string | null
  isLegendary?: boolean
  legActionsMax?: number
  legResistMax?: number
}

export interface PartyMember {
  name: string
  hpMax: number
  ac: number | null
  /** Personagem da campanha vinculado a este slot da party. */
  personagemId?: number
}

export interface Personagem {
  id: number
  name: string
  /** HP atual (fora do combate e sincronizado com a iniciativa). */
  hp?: number | null
  hpMax: number | null
  ac: number | null
  type: string | null
  pp: number | null
  cristais: number
  attunados: string[]
  bg: string | null
  img: string | null
}

export interface Item {
  id: number
  name: string
  tipo: string | null
  raridade: string | null
  attune: 'yes' | 'no'
  desc: string | null
  img: string | null
}

export interface DiaryEntry {
  id: number
  day: string
  title: string
  body: string
  date: string
  tags?: string[]
}

export interface EncounterSlot {
  name: string
  fichaId?: string | number | ''
  hpMax: number
  ac: number | null
  qty: number
  initBonus?: number | null
  resist?: string[]
  vuln?: string[]
  immune?: string[]
  isLegendary?: boolean
  legActionsMax?: number
  legResistMax?: number
}

export interface EncounterTemplate {
  id: number
  name: string
  notes?: string
  slots: EncounterSlot[]
}

export interface Campaign {
  id: string
  name: string
  diary: DiaryEntry[]
  fichas: Ficha[]
  party: PartyMember[]
  creatures: Creature[]
  personagens: Personagem[]
  itens: Item[]
  currentTurn: number
  // Extensões (opcionais)
  round?: number
  combatLog?: CombatLogEntry[]
  references?: Reference[]
  // Ordem manual das pastas e subcategorias de referências.
  refCatOrder?: string[]
  refSubOrder?: Record<string, string[]>
  songs?: Song[]
  playlists?: Playlist[]
  encounters?: EncounterTemplate[]
}

// Música individual (link do YouTube) da ferramenta Músicas.
export interface Song {
  id: number
  name: string
  url: string
  desc?: string
  category?: string
}

// Playlist: sequência ordenada de músicas próprias (embutidas).
// Uma música que está numa playlist NÃO aparece no acervo.
export interface Playlist {
  id: number
  name: string
  category?: string
  songs: Song[]
  // Legado: modelo antigo por referência, migrado em ensureDefaults.
  songIds?: number[]
}

export interface Settings {
  theme: 'light' | 'dark'
}

export interface Reference {
  id: number
  name: string
  type: string
  content: string
  img?: string | null
  url?: string | null
  catParent?: string
  catChild?: string
}

export interface PersistedData {
  campaigns: Campaign[]
  activeId: string | null
}

export interface Condition {
  k: string
  l: string
  c?: boolean
  d: string
  custom?: boolean
  /** Termina por evento (levantar, escapar, curar, descanso), não por rodadas: sem campo de duração. */
  untimed?: boolean
}
