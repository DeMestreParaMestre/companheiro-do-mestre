<script setup lang="ts">
const emit = defineEmits<{ enter: [] }>()

const CONTENTS = [
  { t: 'Iniciativa', d: 'Turnos, vida, condições e encontros' },
  { t: 'Fichas e SRD', d: 'Monstros, itens e magias pelo nome' },
  { t: 'Personagens', d: 'Os heróis, ligados ao combate' },
  { t: 'Músicas e notas', d: 'Trilha, referências e diário' },
  { t: 'Nuvem', d: 'A mesma mesa em outro computador' }
]
</script>

<template>
  <div class="landing">
    <article class="cover">
      <p class="coverPub">De Mestre Para Mestre</p>
      <div class="d20" aria-hidden="true">⬡ ⬡ ⬡</div>
      <h1 class="title">COMPANHEIRO DO MESTRE</h1>
      <p class="subtitle">Ferramentas para a sua Mesa de RPG</p>
      <div class="hRule"></div>
      <p class="coverLead">
        Combate, fichas, tesouro e anotações — o escudo do mestre, neste navegador.
        A conta é opcional: serve só para levar a campanha com você.
      </p>
      <button type="button" class="btn btnRed coverCta" @click="emit('enter')">Abrir a mesa</button>
      <p class="coverHint">Não precisa de conta para começar</p>

      <ol class="coverToc">
        <li v-for="c in CONTENTS" :key="c.t">
          <span>{{ c.t }}</span>
          <i></i>
          <em>{{ c.d }}</em>
        </li>
      </ol>

      <p class="coverColophon">Grátis · Sem anúncios · 5e 2014 e 2024</p>
    </article>
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  justify-content: center;
  padding: 4.5rem 1rem;
}
.cover {
  position: relative;
  width: min(560px, 100%);
  padding: 2.1rem 2rem 1.5rem;
  text-align: center;
  background: var(--bg2);
  border: 4px double var(--border2);
  box-shadow: 0 12px 40px rgba(26, 16, 8, 0.12);
}
.cover::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: repeating-linear-gradient(90deg, var(--red) 0, var(--red) 8px, transparent 8px, transparent 12px);
  opacity: 0.7;
}
.cover::after {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 10px;
  border: 1px solid var(--border);
  opacity: 0.35;
}
.coverPub {
  font-family: var(--fN);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--gold);
  margin: 0.35rem 0 0.7rem;
}
.cover .title {
  font-size: clamp(2.1rem, 7vw, 3.15rem);
  letter-spacing: 3px;
}
.coverLead {
  max-width: 26rem;
  margin: 0 auto 1.15rem;
  font-family: var(--fB);
  font-size: 1.05rem;
  line-height: 1.55;
  color: var(--muted);
}
.coverCta {
  position: relative;
  z-index: 1;
  font-size: 1.02rem;
  padding: 0.5rem 1.5rem;
}
.coverHint {
  margin-top: 0.45rem;
  font-family: var(--fN);
  font-size: 0.72rem;
  color: var(--muted);
}
.coverToc {
  list-style: none;
  margin: 1.4rem 0 0;
  padding: 0.9rem 0.2rem 0;
  border-top: 1px solid var(--border);
  text-align: left;
}
.coverToc li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: baseline;
  gap: 0.45rem;
  padding: 0.32rem 0;
  font-size: 0.92rem;
}
.coverToc span {
  font-family: var(--fH);
  font-weight: 700;
  color: var(--red);
  white-space: nowrap;
}
.coverToc i {
  border-bottom: 1px dotted var(--border);
  opacity: 0.45;
  min-width: 1rem;
}
.coverToc em {
  font-family: var(--fB);
  font-style: italic;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.coverColophon {
  margin-top: 1rem;
  font-family: var(--fN);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
@media (max-width: 520px) {
  .cover {
    padding: 1.7rem 1.1rem 1.2rem;
  }
  .coverToc li {
    grid-template-columns: 1fr;
    gap: 0.05rem;
    padding: 0.45rem 0;
  }
  .coverToc i {
    display: none;
  }
  .coverToc em {
    white-space: normal;
  }
}

[data-theme='dark'] .cover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}
</style>
