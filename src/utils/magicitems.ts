import type { Item } from '../types'

// API v2 do Open5e. Docs: https://open5e.com/api-docs
const API = 'https://api.open5e.com/v2/magicitems/'

interface Open5eNamed {
  name?: string
  key?: string
}

interface Open5eMagicItem {
  key?: string
  name: string
  desc?: string | null
  category?: Open5eNamed | null
  rarity?: Open5eNamed | null
  weapon?: { name?: string; damage_dice?: string; damage_type?: Open5eNamed | null } | null
  armor?: { name?: string; ac_display?: string | null } | null
  requires_attunement?: boolean
  attunement_detail?: string | null
  document?: {
    key?: string
    display_name?: string
    name?: string
    gamesystem?: { key?: string; name?: string } | null
  } | null
}

function shortGamesystem(key?: string, name?: string): string {
  if (key === '5e-2014') return '2014'
  if (key === '5e-2024') return '2024'
  if (key === 'a5e') return 'A5E'
  return name || key || ''
}

function formatTipo(m: Open5eMagicItem): string | null {
  const parts: string[] = []
  if (m.category?.name) parts.push(m.category.name)
  if (m.weapon?.name) parts.push(m.weapon.name)
  if (m.armor?.name) parts.push(m.armor.name)
  return parts.length ? parts.join(' · ') : null
}

function formatDesc(m: Open5eMagicItem): string | null {
  const base = (m.desc || '').trim()
  const detail = (m.attunement_detail || '').trim()
  if (base && detail) return base + '\n\nAttunement: ' + detail
  if (detail) return 'Attunement: ' + detail
  return base || null
}

function mapItem(m: Open5eMagicItem): ImportedItem {
  return {
    name: m.name,
    tipo: formatTipo(m),
    raridade: m.rarity?.name || null,
    attune: m.requires_attunement ? 'yes' : 'no',
    desc: formatDesc(m)
  }
}

export type ImportedItem = Omit<Item, 'id' | 'img'>

export interface MagicItemCandidate {
  key: string
  name: string
  sourceName: string
  edition: string
  editionKey: string
  tipo: string | null
  raridade: string | null
  attune: 'yes' | 'no'
  desc: string | null
  weaponDetail: string | null
  armorDetail: string | null
  item: ImportedItem
}

function relevanceRank(name: string, q: string): number {
  const n = name.toLowerCase()
  if (n === q) return 0
  if (n.startsWith(q)) return 1
  if (n.includes(q)) return 2
  return 3
}

function weaponDetail(m: Open5eMagicItem): string | null {
  if (!m.weapon) return null
  const parts: string[] = []
  if (m.weapon.damage_dice) parts.push(m.weapon.damage_dice)
  if (m.weapon.damage_type?.name) parts.push(m.weapon.damage_type.name)
  return parts.length ? parts.join(' ') : m.weapon.name || null
}

function armorDetail(m: Open5eMagicItem): string | null {
  if (!m.armor) return null
  if (m.armor.ac_display) return m.armor.ac_display
  return m.armor.name || null
}

export async function searchMagicItems(name: string): Promise<MagicItemCandidate[]> {
  const q = name.trim()
  const url = `${API}?name__icontains=${encodeURIComponent(q)}&limit=50`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Falha ao consultar o Open5e (HTTP ' + res.status + ')')
  const data = (await res.json()) as { results?: Open5eMagicItem[] }
  const results = data.results || []
  const ql = q.toLowerCase()
  return results
    .map((m) => ({
      key: m.key || m.name,
      name: m.name,
      sourceName: m.document?.display_name || m.document?.name || 'Fonte desconhecida',
      edition: shortGamesystem(m.document?.gamesystem?.key, m.document?.gamesystem?.name),
      editionKey: m.document?.gamesystem?.key || '',
      tipo: formatTipo(m),
      raridade: m.rarity?.name || null,
      attune: m.requires_attunement ? ('yes' as const) : ('no' as const),
      desc: formatDesc(m),
      weaponDetail: weaponDetail(m),
      armorDetail: armorDetail(m),
      item: mapItem(m)
    }))
    .sort((a, b) => relevanceRank(a.name, ql) - relevanceRank(b.name, ql) || a.name.localeCompare(b.name))
}
