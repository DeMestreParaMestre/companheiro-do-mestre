import type { Condition } from './types'

export const CONDS: Condition[] = [
  // `k` é a chave salva nas campanhas (em inglês, como no SRD) e não pode mudar; `l` é o nome exibido.
  { k: 'Concentrating', l: 'Concentrando', c: true, d: '(Concentrating) Mantendo uma magia de concentração. Termina ao conjurar outra magia de concentração, ficar incapacitado ou falhar no teste de Constituição ao sofrer dano (CD 10 ou metade do dano).' },
  { k: 'Grappled', l: 'Agarrado', untimed: true, d: '(Grappled) Deslocamento 0, sem bônus de deslocamento.' },
  { k: 'Frightened', l: 'Amedrontado', d: '(Frightened) Desvantagem em testes e ataques enquanto vê a fonte do medo. Não pode se aproximar dela.' },
  { k: 'Stunned', l: 'Atordoado', d: '(Stunned) Incapacitado, não se move e fala com dificuldade. Falha automática em resistências de Força e Destreza. Ataques contra ele têm vantagem.' },
  { k: 'Prone', l: 'Caído', untimed: true, d: '(Prone) Só pode rastejar. Desvantagem nos ataques. Ataques a até 1,5 m têm vantagem contra ele; de mais longe, desvantagem.' },
  { k: 'Blinded', l: 'Cego', d: '(Blinded) Não enxerga: falha em testes que dependem de visão. Desvantagem nos ataques; ataques contra ele têm vantagem.' },
  { k: 'Charmed', l: 'Enfeitiçado', d: '(Charmed) Não pode atacar quem o enfeitiçou. O enfeitiçador tem vantagem em testes sociais contra ele.' },
  { k: 'Poisoned', l: 'Envenenado', d: '(Poisoned) Desvantagem em jogadas de ataque e testes de atributo.' },
  { k: 'Exhaustion', l: 'Exaustão', untimed: true, d: '(Exhaustion) Níveis 1 a 6. Cada nível: −2 por nível nos testes de d20 e −1,5 m de deslocamento por nível. Descanso longo remove 1 nível. Nível 6 = morte.' },
  { k: 'Restrained', l: 'Impedido', d: '(Restrained) Deslocamento 0. Ataques contra ele têm vantagem; os dele, desvantagem. Desvantagem em resistências de Destreza.' },
  { k: 'Incapacitated', l: 'Incapacitado', d: '(Incapacitated) Não pode realizar ações, ações bônus nem reações.' },
  { k: 'Unconscious', l: 'Inconsciente', untimed: true, d: '(Unconscious) Incapacitado e alheio ao redor, larga o que segura e cai. Falha automática em resistências de Força e Destreza. Acertos a até 1,5 m são críticos.' },
  { k: 'Invisible', l: 'Invisível', d: '(Invisible) Não pode ser visto sem magia. Vantagem nos ataques; ataques contra ele têm desvantagem.' },
  { k: 'Paralyzed', l: 'Paralisado', d: '(Paralyzed) Incapacitado, não se move nem fala. Falha automática em resistências de Força e Destreza. Acertos a até 1,5 m são críticos.' },
  { k: 'Petrified', l: 'Petrificado', untimed: true, d: '(Petrified) Transformado em pedra. Incapacitado, deslocamento 0, resistência a todo dano, imune a veneno e doença.' },
  { k: 'Deafened', l: 'Surdo', d: '(Deafened) Não ouve: falha em testes que dependem de audição.' },
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
