import type { Campaign } from '../types'

/** ID fixo — permite recriar a campanha demo sem duplicar entradas. */
export const DEV_CAMPAIGN_ID = 'dev-sandbox'

/**
 * Campanha pré-populada para testes locais (`npm run dev`).
 * IDs numéricos fixos para reprodutibilidade entre recargas.
 */
export function createDevSeedCampaign(): Campaign {
  return {
    id: DEV_CAMPAIGN_ID,
    name: '🧪 Dev Sandbox',
    diary: [
      {
        id: 6001,
        day: 'Dia 1',
        title: 'Emboscada na Estrada',
        body: 'A party foi atacada por goblins perto da ponte quebrada. Lyra flanqueou pela direita enquanto Aldric segurava a linha.',
        date: '01/09/2026',
        tags: ['combate', 'goblins']
      },
      {
        id: 6002,
        day: 'Dia 2',
        title: 'Descanso curto',
        body: 'Curaram ferimentos e repuseram suprimentos antes de seguir para o acampamento hobgoblin.',
        date: '02/09/2026'
      }
    ],
    fichas: [
      {
        id: 1001,
        name: 'Goblin',
        hpMax: 7,
        ac: 15,
        initBonus: 2,
        type: 'Humanoide',
        size: 'Pequeno',
        alignment: 'Neutro Mau',
        cr: '1/4',
        speed: '9m',
        str: 8,
        dex: 14,
        con: 10,
        int: 10,
        wis: 8,
        cha: 8,
        img: null,
        traits: [{ name: 'Fuga Ágil', desc: 'Ação bônus para Disengage ou Hide.' }],
        actions: [{ name: 'Cimitarra', desc: 'Ataque corpo a corpo +4, 1d6+2 cortante.' }]
      },
      {
        id: 1002,
        name: 'Hobgoblin',
        hpMax: 11,
        ac: 18,
        initBonus: 1,
        type: 'Humanoide',
        size: 'Médio',
        alignment: 'Leal Mau',
        cr: '1/2',
        speed: '9m',
        str: 13,
        dex: 12,
        con: 12,
        int: 10,
        wis: 10,
        cha: 9,
        img: null,
        traits: [{ name: 'Vantagem Militar', desc: 'Vantagem em ataques se um aliado estiver a 1,5m do alvo.' }],
        actions: [{ name: 'Espada Longa', desc: 'Ataque corpo a corpo +3, 1d8+1 cortante.' }]
      },
      {
        id: 1003,
        name: 'Bugbear',
        hpMax: 27,
        ac: 16,
        initBonus: 2,
        type: 'Humanoide',
        size: 'Médio',
        alignment: 'Caótico Mau',
        cr: '1',
        speed: '9m',
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 11,
        cha: 9,
        img: null,
        traits: [{ name: 'Ataque Surpresa', desc: '+2d6 de dano se surpreender o alvo.' }],
        actions: [{ name: 'Maça', desc: 'Ataque corpo a corpo +4, 2d8+2 contundente.' }]
      },
      {
        id: 1004,
        name: 'Dragão Branco Jovem',
        hpMax: 133,
        ac: 17,
        initBonus: 0,
        type: 'Dragão',
        size: 'Grande',
        alignment: 'Caótico Mau',
        cr: '6',
        speed: '12m, voo 24m',
        str: 18,
        dex: 10,
        con: 18,
        int: 6,
        wis: 11,
        cha: 12,
        img: null,
        traits: [
          { name: 'Resistência Lendária (3/Dia)', desc: 'Se falhar num salvamento, pode escolher passar.' },
          { name: 'Imunidade a Frio', desc: 'Imune a dano de frio.' }
        ],
        actions: [
          { name: 'Multiataque', desc: 'Uma mordida e dois garras.' },
          { name: 'Sopro de Gelo (Recarga 5–6)', desc: 'Cone 9m, CD 14 Constituição, 10d8 de frio.' }
        ],
        isLegendary: true,
        legActionsMax: 3,
        legResistMax: 3
      }
    ],
    personagens: [
      {
        id: 2001,
        name: 'Aldric',
        hp: 28,
        hpMax: 32,
        ac: 18,
        type: 'Paladino 3',
        pp: 12,
        cristais: 2,
        attunados: ['Espada Longa +1'],
        bg: 'Cavaleiro juramentado da ordem da aurora.',
        img: null
      },
      {
        id: 2002,
        name: 'Lyra',
        hp: 24,
        hpMax: 24,
        ac: 14,
        type: 'Ladina 3',
        pp: 8,
        cristais: 1,
        attunados: [],
        bg: 'Ex-ladrão de guilda buscando redenção.',
        img: null
      },
      {
        id: 2003,
        name: 'Theron',
        hp: 15,
        hpMax: 18,
        ac: 12,
        type: 'Mago 3',
        pp: 6,
        cristais: 3,
        attunados: ['Varinha de Raios'],
        bg: 'Erudito obcecado por ruínas arcanas.',
        img: null
      }
    ],
    party: [
      { name: 'Aldric', hpMax: 32, ac: 18, personagemId: 2001 },
      { name: 'Lyra', hpMax: 24, ac: 14, personagemId: 2002 },
      { name: 'Theron', hpMax: 18, ac: 12, personagemId: 2003 }
    ],
    creatures: [
      {
        id: 4001,
        name: 'Hobgoblin',
        init: 17,
        initReal: 17,
        hp: 11,
        hpMax: 11,
        ac: 18,
        fichaId: 1002,
        dead: false,
        conditions: [],
        initBonus: 1
      },
      {
        id: 4002,
        name: 'Aldric',
        init: 14,
        initReal: 14,
        hp: 28,
        hpMax: 32,
        ac: 18,
        fichaId: '',
        dead: false,
        conditions: ['Concentrating'],
        initBonus: null,
        personagemId: 2001
      },
      {
        id: 4003,
        name: 'Goblin 1',
        init: 13,
        initReal: 13,
        hp: 4,
        hpMax: 7,
        ac: 15,
        fichaId: 1001,
        dead: false,
        conditions: [],
        initBonus: 2
      },
      {
        id: 4004,
        name: 'Lyra',
        init: 12,
        initReal: 12,
        hp: 24,
        hpMax: 24,
        ac: 14,
        fichaId: '',
        dead: false,
        conditions: [],
        initBonus: null,
        personagemId: 2002
      },
      {
        id: 4005,
        name: 'Goblin 2',
        init: 9,
        initReal: 9,
        hp: 7,
        hpMax: 7,
        ac: 15,
        fichaId: 1001,
        dead: false,
        conditions: ['Prone'],
        initBonus: 2
      },
      {
        id: 4006,
        name: 'Theron',
        init: 8,
        initReal: 8,
        hp: 15,
        hpMax: 18,
        ac: 12,
        fichaId: '',
        dead: false,
        conditions: [],
        initBonus: null,
        personagemId: 2003
      },
      {
        id: 4007,
        name: 'Dragão Branco Jovem',
        init: 5,
        initReal: 5,
        hp: 133,
        hpMax: 133,
        ac: 17,
        fichaId: 1004,
        dead: false,
        conditions: [],
        initBonus: 0,
        isLegendary: true,
        legActionsMax: 3,
        legActions: 3,
        legResistMax: 3,
        legResist: 3,
        resist: ['Cold']
      }
    ],
    itens: [
      {
        id: 3001,
        name: 'Espada Longa +1',
        tipo: 'Arma',
        raridade: 'Uncommon',
        attune: 'yes',
        desc: 'Espada longa mágica. +1 em ataques e dano.',
        img: null
      },
      {
        id: 3002,
        name: 'Poção de Cura',
        tipo: 'Poção',
        raridade: 'Uncommon',
        attune: 'no',
        desc: 'Restaura 2d4+2 pontos de vida.',
        img: null
      },
      {
        id: 3003,
        name: 'Manto de Proteção',
        tipo: 'Vestuário',
        raridade: 'Uncommon',
        attune: 'yes',
        desc: '+1 na CA e testes de resistência.',
        img: null
      },
      {
        id: 3004,
        name: 'Varinha de Raios',
        tipo: 'Varinha',
        raridade: 'Rare',
        attune: 'yes',
        desc: 'Conjura Raio (7 cargas/dia).',
        img: null
      }
    ],
    currentTurn: 2,
    round: 2,
    combatLog: [
      { id: 9001, round: 1, text: '— Rodada 1 —' },
      { id: 9002, round: 1, text: 'Goblin 1 sofreu 3 de dano' },
      { id: 9003, round: 2, text: '— Rodada 2 —' },
      { id: 9004, round: 2, text: 'Aldric: condição "Concentrando" ativa' }
    ],
    references: [
      {
        id: 5001,
        name: 'Capitão Grash',
        type: 'texto',
        content: 'Hobgoblin veterano. Comanda o acampamento na floresta. Respeita força e táticas.',
        catParent: 'NPCs',
        catChild: 'Inimigos'
      },
      {
        id: 5002,
        name: 'Tabela de Encontros',
        type: 'tabela',
        content: '1-3 Goblins\n4-5 Hobgoblin\n6 Bugbear\n7-8 Patrulha mista',
        catParent: 'Encontros',
        catChild: 'Floresta'
      },
      {
        id: 5003,
        name: 'Ponte Quebrada',
        type: 'texto',
        content: 'Travessia instável sobre o rio. Teste de Atletismo CD 12 para atravessar em segurança.',
        catParent: 'Locais'
      }
    ],
    refCatOrder: ['NPCs', 'Encontros', 'Locais'],
    refSubOrder: {
      NPCs: ['Inimigos'],
      Encontros: ['Floresta']
    },
    songs: [
      {
        id: 7001,
        name: 'Floresta Sombria',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        desc: 'Ambiência para exploração.',
        category: 'Ambiências'
      },
      {
        id: 7002,
        name: 'Combate Intenso',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        desc: 'Música de combate genérica.',
        category: 'Combate'
      }
    ],
    playlists: [
      {
        id: 8001,
        name: 'Sessão Demo',
        category: 'Ambiências',
        songs: [
          {
            id: 8002,
            name: 'Taverna Calma',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            category: 'Ambiências'
          }
        ]
      }
    ],
    encounters: [
      {
        id: 8501,
        name: 'Emboscada Goblin',
        notes: 'Dois goblins emboscam na estrada. Hobgoblin reforça no turno 2 se quiser escalar.',
        slots: [
          { name: 'Goblin', fichaId: 1001, hpMax: 7, ac: 15, qty: 2, initBonus: 2 },
          { name: 'Hobgoblin', fichaId: 1002, hpMax: 11, ac: 18, qty: 1, initBonus: 1 }
        ]
      }
    ]
  }
}

/** Completa a sandbox já persistida com o chefe lendário (sem apagar o resto). */
export function ensureDevLegendaryBoss(camp: Campaign): void {
  const fresh = createDevSeedCampaign()
  const ficha = fresh.fichas.find((f) => f.id === 1004)
  const boss = fresh.creatures.find((c) => c.id === 4007)
  if (ficha && !camp.fichas.some((f) => f.id === 1004)) camp.fichas.push(ficha)
  else if (ficha) {
    const existing = camp.fichas.find((f) => f.id === 1004)
    if (existing && !existing.isLegendary) {
      existing.isLegendary = true
      existing.legActionsMax = 3
      existing.legResistMax = 3
    }
  }
  if (boss && !camp.creatures.some((c) => c.id === 4007)) camp.creatures.push(boss)
}
