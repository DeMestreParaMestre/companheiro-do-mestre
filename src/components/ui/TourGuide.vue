<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { tourOpen } from '../../composables/useTour'
import { placeHoverTip } from '../../utils/hoverTip'

interface Step {
  group: string
  sel?: string
  /** Aba a abrir antes de mostrar o passo (id do botão da navegação). */
  tab?: string
  /** Se o alvo não existir (ex.: sem dados ainda), o passo é pulado. */
  optional?: boolean
  title: string
  text: string
  items?: string[]
}

const nav = (id: string) => `[data-tour="${id}"]`
const at = (id: string) => `.section.active [data-tour="${id}"]`

const STEPS: Step[] = [
  {
    group: 'Início',
    title: 'Bem-vindo à mesa, Mestre!',
    text: 'Vamos passar por cada aba e mostrar para que serve cada parte. O tour troca de página sozinho. Use os botões ou as setas ← → do teclado; Esc sai a qualquer momento.'
  },

  // Iniciativa
  {
    group: 'Iniciativa', tab: 'sInit', sel: nav('sInit'),
    title: 'Iniciativa',
    text: 'O painel do combate: a ordem de turnos, a vida e as condições de todos que estão na luta. É a tela que fica aberta durante a sessão.'
  },
  {
    group: 'Iniciativa', sel: at('init-add'),
    title: 'Adicionar à luta',
    text: 'O formulário fica recolhido durante o combate. Clique em Adicionar à iniciativa para colocar monstros, NPCs ou jogadores:',
    items: [
      'Vincular Ficha: escolha uma ficha e nome, HP e CA são preenchidos sozinhos.',
      'Init: digite o valor ou clique em 🎲 para rolar d20 + bônus de iniciativa da ficha.',
      'Qtd: adiciona vários iguais de uma vez (ótimo para bandos de goblins).'
    ]
  },
  {
    group: 'Iniciativa', sel: at('init-toolbar'),
    title: 'Controles do combate',
    text: 'Na barra: próximo turno, rodada e referências. O restante fica em Mais ▾:',
    items: [
      '▶ Próximo Turno: passa a vez e conta as rodadas (as condições com duração expiram sozinhas).',
      '📌 Referências: abre suas anotações por cima do combate.',
      '↺ Reiniciar: volta para o primeiro da ordem, na rodada 1.',
      'Configurar Party: define os jogadores fixos, que entram em todo combate novo.',
      'Novo Combate: limpa os inimigos e pede a iniciativa da party.',
      '⚔ Encontros: coloca um encontro pronto (montado em Fichas) na luta.',
      '☽ Long Rest: recupera a vida da party e zera os testes contra a morte.',
      '📜 Log: histórico de dano, cura e turnos, que pode ir para o Diário.'
    ]
  },
  {
    group: 'Iniciativa', sel: at('init-music'),
    title: 'Trilha sonora',
    text: 'O ícone 🎵 na barra do combate toca as músicas e playlists da aba Músicas sem sair da luta.'
  },
  {
    group: 'Iniciativa', sel: '.section.active .cRow', optional: true,
    title: 'Cada criatura',
    text: 'Uma linha por participante, na ordem da iniciativa. A linha de quem está agindo fica destacada.',
    items: [
      'O número é a iniciativa: verde para jogadores, vermelho para inimigos.',
      'Clique no nome para ver a imagem da ficha.',
      '📋 abre o statblock, ✏ edita, ↑↓ ajustam a ordem, ✕ remove.',
      'Monstros lendários mostram ⚡ e 🛡 com os usos restantes: clique para gastar.',
      'Condições ativas aparecem como etiquetas ao lado do nome.'
    ]
  },
  {
    group: 'Iniciativa', sel: '.section.active .cRow .hpArea', optional: true,
    title: 'Vida',
    text: 'O ✚ roxo abre dano, cura e HP temporário. O número e a barra ganham destaque; abaixo de 25% ficam vermelhos. Um jogador com 0 de HP mostra os testes contra a morte.'
  },
  {
    group: 'Iniciativa', sel: '.section.active .cRow .sdWrap', optional: true,
    title: 'Condições',
    text: 'Em Status ▾, marque condições como Cego ou Envenenado. Nas que têm tempo, o ⏱ define quantas rodadas duram; vazio vale até você remover. Passe o mouse na etiqueta para ler a regra e clique nela para remover.'
  },

  // Fichas
  {
    group: 'Fichas & Status', tab: 'sFichas', sel: nav('sFichas'),
    title: 'Fichas & Status',
    text: 'A biblioteca de monstros e NPCs da campanha. Toda ficha daqui pode entrar na Iniciativa.'
  },
  {
    group: 'Fichas & Status', sel: at('fichas-add'), optional: true,
    title: 'Nova ficha',
    text: '+ Adicionar Ficha abre duas formas de criar:',
    items: [
      'Importar do SRD: digite o nome em inglês (ex.: Goblin, Adult Red Dragon) e a ficha vem com atributos, traços e ações.',
      'Manual: nome, tipo, HP, CA e iniciativa, com campos avançados para montar o statblock completo e uma imagem.'
    ]
  },
  {
    group: 'Fichas & Status', sel: at('fichas-filter'),
    title: 'Busca e filtro',
    text: 'Encontre fichas pelo nome ou filtre por tipo de criatura.'
  },
  {
    group: 'Fichas & Status', sel: '.section.active #fichasGrid',
    title: 'Suas fichas',
    text: 'Em cada card: 📖 abre o statblock, clicar na imagem amplia, ✏ edita e ✕ remove. Arraste os cards para mudar a ordem.'
  },
  {
    group: 'Fichas & Status', sel: at('fichas-enc'),
    title: 'Encontros',
    text: 'Monte encontros prontos (ex.: 3 Goblins + 1 Hobgoblin) com anotações de tática. Na Iniciativa, o botão ⚔ Encontros coloca todos na luta de uma vez.'
  },

  // Personagens
  {
    group: 'Personagens', tab: 'sPJs', sel: nav('sPJs'),
    title: 'Personagens',
    text: 'Os heróis dos seus jogadores, sempre à mão.'
  },
  {
    group: 'Personagens', sel: at('pjs-add'), optional: true,
    title: 'Novo personagem',
    text: 'Cadastre nome, HP, CA, classe, Percepção Passiva, cristais, até 3 itens sintonizados (da aba Itens ou texto livre), imagem e background.'
  },
  {
    group: 'Personagens', sel: at('pjs-dash'), optional: true,
    title: 'Painel rápido',
    text: 'A Percepção Passiva de todos, em ordem, para testes secretos, além dos cristais e dos itens sintonizados. Clique num item para ver os detalhes.'
  },
  {
    group: 'Personagens', sel: '.section.active #pjGrid',
    title: 'Cards dos personagens',
    text: '✏ edita e ☽ Long Rest restaura a vida. O personagem fica ligado à party da Iniciativa: a vida que muda no combate aparece aqui.'
  },

  // Itens
  {
    group: 'Itens Mágicos', tab: 'sItens', sel: nav('sItens'),
    title: 'Itens Mágicos',
    text: 'O tesouro da campanha: tudo o que os jogadores podem encontrar ou já carregam.'
  },
  {
    group: 'Itens Mágicos', sel: at('itens-add'), optional: true,
    title: 'Novo item',
    text: '+ Adicionar Item abre duas formas de criar:',
    items: [
      'Importar do SRD: digite o nome em inglês (ex.: Bag of Holding) para trazer a descrição oficial.',
      'Manual: tipo, raridade, sintonização, imagem e descrição.'
    ]
  },
  {
    group: 'Itens Mágicos', sel: at('itens-filter'),
    title: 'Busca, filtros e ordem',
    text: 'Filtre por raridade e tipo e ordene a lista. Na grade, clique no item para ver tudo sobre ele.'
  },

  // Magias
  {
    group: 'Magias', tab: 'sSpells', sel: nav('sSpells'),
    title: 'Magias',
    text: 'Consulta às magias do SRD para tirar dúvidas no meio da sessão.'
  },
  {
    group: 'Magias', sel: at('spells-search'),
    title: 'Buscar magia',
    text: 'Escolha o sistema (5e 2014 ou 2024) e a fonte, digite o nome em inglês (ex.: Fireball) e clique em Buscar. Com a busca vazia, aparece a lista geral.'
  },
  {
    group: 'Magias', sel: at('spells-results'), optional: true,
    title: 'Resultados',
    text: 'Clique numa magia para abrir o nível, o tempo de conjuração, o alcance, os componentes, a duração, as classes e a descrição completa.'
  },

  // Músicas
  {
    group: 'Músicas', tab: 'sMusic', sel: nav('sMusic'),
    title: 'Músicas',
    text: 'A trilha sonora da mesa, tocada direto do YouTube.'
  },
  {
    group: 'Músicas', sel: at('music-player'),
    title: 'Reprodutor',
    text: 'Mostra o que está tocando. Tem anterior e próxima (em playlists), repetir, abrir no YouTube e parar.'
  },
  {
    group: 'Músicas', sel: at('music-add'), optional: true,
    title: 'Adicionar músicas',
    text: 'Cole o link do YouTube, dê um nome e escolha uma categoria (Ambiência, Combate…). Aqui também se criam playlists juntando várias músicas.'
  },
  {
    group: 'Músicas', sel: at('music-cats'),
    title: 'Biblioteca',
    text: 'Filtre por categoria. Em cada música ou playlist, ▶ Tocar começa na hora, e as playlists tocam em sequência.'
  },

  // Referências
  {
    group: 'Referências', tab: 'sRefs', sel: nav('sRefs'),
    title: 'Referências',
    text: 'O escudo do mestre digital: regras da casa, tabelas, NPCs, locais, mapas e links.'
  },
  {
    group: 'Referências', sel: at('refs-add'),
    title: 'Nova referência',
    text: 'Escolha o tipo (texto, tabela, lista, imagem ou link) e organize tudo em categorias e subcategorias, como pastas.'
  },
  {
    group: 'Referências', sel: at('refs-filter'),
    title: 'Busca e filtro',
    text: 'Procure pelo nome ou filtre por tipo.'
  },
  {
    group: 'Referências', sel: at('refs-list'),
    title: 'Pastas',
    text: 'As pastas abrem e fecham com um clique. Na Iniciativa, 📌 Referências mostra este conteúdo sem sair do combate.'
  },

  // Diário
  {
    group: 'Diário', tab: 'sDiary', sel: nav('sDiary'),
    title: 'Diário de Campanha',
    text: 'A memória da campanha: o que aconteceu em cada sessão.'
  },
  {
    group: 'Diário', sel: at('diary-add'), optional: true,
    title: 'Nova entrada',
    text: 'Informe o dia, o título, o texto e as tags. Escreva @Nome para mencionar um personagem ou uma ficha: a menção vira um link para a imagem dele.'
  },
  {
    group: 'Diário', sel: at('diary-search'),
    title: 'Busca',
    text: 'Pesquise em todas as entradas. As tags também servem de filtro.'
  },
  {
    group: 'Diário', sel: at('diary-tools'),
    title: 'Ordem e exportação',
    text: 'Veja como linha do tempo ou por data e exporte o diário inteiro para Word, para compartilhar com os jogadores.'
  },

  // Geral
  {
    group: 'Geral', sel: nav('camp'),
    title: 'Campanhas',
    text: 'Troque, crie, renomeie ou apague campanhas. Cada uma guarda as próprias fichas, personagens, itens, músicas, referências e diário.'
  },
  {
    group: 'Geral', sel: nav('actions'),
    title: 'Backup, tema e guia',
    text: 'Exporte um backup em arquivo, importe um backup salvo, alterne entre tema claro e escuro e reabra este tour em "? Guia".'
  },
  {
    group: 'Geral', sel: '.acct', optional: true,
    title: 'Sua conta',
    text: 'Entre com e-mail ou Google para salvar as campanhas na nuvem e usá-las em qualquer computador ou celular.'
  },
  {
    group: 'Geral', sel: '.diceFab',
    title: 'Rolador de dados',
    text: 'Sempre à mão, em qualquer aba.'
  },
  {
    group: 'Fim',
    title: 'Tudo pronto!',
    text: 'Boa sessão! Se precisar, o tour fica no botão "? Guia", no topo da página.'
  }
]

const i = ref(0)
const rect = ref<DOMRect | null>(null)
const tipEl = ref<HTMLElement | null>(null)
const tipSize = ref({ width: 360, height: 280 })
const step = computed(() => STEPS[i.value])
const TIP_W = 360
const PAD = 6
let seq = 0
let startTab: string | null = null

function target(s: Step | undefined): HTMLElement | null {
  const el = s?.sel ? document.querySelector<HTMLElement>(s.sel) : null
  return el && el.getClientRects().length ? el : null
}

function openTab(id: string) {
  document.querySelector<HTMLElement>(nav(id))?.click()
}

/** Espera a aba recém-aberta montar (as seções carregam sob demanda). */
async function waitSection() {
  await nextTick()
  for (let t = 0; t < 60 && !document.querySelector('.section.active'); t++) {
    await new Promise((r) => setTimeout(r, 50))
  }
  await nextTick()
}

function measure() {
  rect.value = target(step.value)?.getBoundingClientRect() ?? null
}

async function measureTip() {
  await nextTick()
  const el = tipEl.value
  if (!el) return
  tipSize.value = { width: el.offsetWidth, height: el.offsetHeight }
}

async function go(n: number, dir = 1) {
  const token = ++seq
  for (; n >= 0 && n < STEPS.length; n += dir) {
    const s = STEPS[n]
    if (s.tab) {
      openTab(s.tab)
      await waitSection()
      if (token !== seq) return
    }
    const el = target(s)
    if (el || !s.optional) {
      i.value = n
      el?.scrollIntoView({ block: 'center' })
      measure()
      void measureTip()
      return
    }
  }
  if (n >= STEPS.length) close()
}

function close() {
  tourOpen.value = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowRight') go(i.value + 1)
  else if (e.key === 'ArrowLeft') go(i.value - 1, -1)
}

function listen(on: boolean) {
  if (on) {
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    window.addEventListener('keydown', onKey)
  } else {
    window.removeEventListener('resize', measure)
    window.removeEventListener('scroll', measure, true)
    window.removeEventListener('keydown', onKey)
  }
}

watch(tourOpen, (open) => {
  listen(open)
  if (open) {
    startTab = document.querySelector('.nav-btn.active')?.getAttribute('data-tour') ?? null
    void go(0)
  } else {
    seq++
    if (startTab) openTab(startTab)
  }
})
onBeforeUnmount(() => listen(false))

const isLast = computed(() => i.value === STEPS.length - 1)

const spotStyle = computed(() => {
  const r = rect.value
  if (!r) return null
  return { top: r.top - PAD + 'px', left: r.left - PAD + 'px', width: r.width + PAD * 2 + 'px', height: r.height + PAD * 2 + 'px' }
})

const tipStyle = computed(() => {
  const r = rect.value
  const w = Math.min(TIP_W, window.innerWidth - 24)
  if (!r) return { width: w + 'px', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  const p = placeHoverTip(
    { top: r.top, bottom: r.bottom, left: r.left + r.width / 2 - w / 2 },
    { width: w, height: tipSize.value.height },
    { w: window.innerWidth, h: window.innerHeight },
    PAD + 10
  )
  return { width: w + 'px', left: p.left + 'px', top: p.top + 'px' }
})
</script>

<template>
  <div v-if="tourOpen && step" class="tour" role="dialog" aria-modal="true" :aria-label="step.title">
    <div class="tourBlock" :class="{ dim: !spotStyle }" />
    <div v-if="spotStyle" class="tourSpot" :style="spotStyle" />
    <div ref="tipEl" class="tourTip" :style="tipStyle" aria-live="polite">
      <small class="tourCount">{{ step.group }} · {{ i + 1 }}/{{ STEPS.length }}</small>
      <h4>{{ step.title }}</h4>
      <p>{{ step.text }}</p>
      <ul v-if="step.items">
        <li v-for="it in step.items" :key="it">{{ it }}</li>
      </ul>
      <div class="tourBtns">
        <button class="tourSkip" @click="close">{{ isLast ? 'Fechar' : 'Pular tour' }}</button>
        <button v-if="i > 0" class="btn btnOut sm" @click="go(i - 1, -1)">← Voltar</button>
        <button class="btn btnRed sm" @click="go(i + 1)">{{ isLast ? 'Concluir' : 'Próximo →' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tour {
  position: fixed;
  inset: 0;
  z-index: 500;
}
.tourBlock {
  position: absolute;
  inset: 0;
}
.tourBlock.dim {
  background: rgba(0, 0, 0, 0.6);
}
/* O "escurecer" vem da sombra gigante do recorte: só o alvo fica claro. */
.tourSpot {
  position: fixed;
  border-radius: 6px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 0 3px var(--gold);
  pointer-events: none;
  transition: all 0.2s ease;
}
.tourTip {
  position: fixed;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  background: var(--bg2);
  border: 2px solid var(--border2);
  border-top: 4px solid var(--red);
  border-radius: 4px;
  padding: 0.85rem 1rem 0.8rem;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4);
}
.tourCount {
  font-family: var(--fN);
  font-size: 0.7rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.tourTip h4 {
  font-family: var(--fH);
  font-size: 1.15rem;
  color: var(--red);
  margin: 0.1rem 0 0.3rem;
}
.tourTip p,
.tourTip li {
  font-family: var(--fB);
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--ink);
}
.tourTip ul {
  margin: 0.35rem 0 0;
  padding-left: 1.1rem;
}
.tourTip li + li {
  margin-top: 0.2rem;
}
.tourBtns {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.8rem;
}
.tourSkip {
  margin-right: auto;
  background: none;
  border: none;
  padding: 0;
  font-family: var(--fN);
  font-size: 0.75rem;
  color: var(--muted);
  cursor: pointer;
  text-decoration: underline;
}
</style>
