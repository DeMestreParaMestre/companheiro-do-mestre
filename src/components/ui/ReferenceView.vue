<script setup lang="ts">
import { computed } from 'vue'
import type { Reference } from '../../types'
import { youtubeThumb, youtubeWatchUrl } from '../../utils/youtube'
import { parseTableContent } from '../../utils/refTable'

const props = defineProps<{ reference: Reference }>()
defineEmits<{ openImage: [ref: Reference] }>()

const ytThumb = computed(() => youtubeThumb(props.reference.url))
const ytWatch = computed(() => youtubeWatchUrl(props.reference.url))

const table = computed(() => parseTableContent(props.reference.content ?? ''))
const listItems = computed(() =>
  String(props.reference.content ?? '')
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
)
</script>

<template>
  <div class="refView">
    <img
      v-if="reference.type === 'imagem' && reference.img"
      :src="reference.img"
      :alt="reference.name"
      class="refImg"
      @click="$emit('openImage', reference)"
    />
    <p v-if="reference.type === 'imagem' && reference.content" class="refCaption">{{ reference.content }}</p>

    <table v-else-if="reference.type === 'tabela'" class="refTable">
      <thead v-if="table.cells.length">
        <tr>
          <th
            v-for="(c, ci) in table.cells[0]"
            :key="ci"
            :style="{ textAlign: table.align[0]?.[ci] || 'left' }"
          >
            {{ c }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, ri) in table.cells.slice(1)" :key="ri">
          <td
            v-for="(c, ci) in r"
            :key="ci"
            :style="{ textAlign: table.align[ri + 1]?.[ci] || 'left' }"
          >
            {{ c }}
          </td>
        </tr>
      </tbody>
    </table>

    <ul v-else-if="reference.type === 'lista'" class="refList">
      <li v-for="(it, i) in listItems" :key="i">{{ it }}</li>
    </ul>

    <a v-else-if="reference.type === 'link'" :href="reference.content" target="_blank" rel="noopener" class="refLink">
      {{ reference.content }}
    </a>

    <div v-else-if="reference.type === 'musica'" class="refMusic">
      <a v-if="ytThumb" :href="ytWatch || reference.url || '#'" target="_blank" rel="noopener" class="refMusicThumb">
        <img :src="ytThumb" :alt="reference.name" loading="lazy" />
        <span class="refMusicPlay">▶</span>
      </a>
      <a v-else :href="reference.url || '#'" target="_blank" rel="noopener" class="refLink">{{ reference.url }}</a>
      <p v-if="reference.content" class="refText" style="margin-top: 0.4rem">{{ reference.content }}</p>
    </div>

    <div v-else class="refText">{{ reference.content }}</div>
  </div>
</template>

<style scoped>
.refView {
  font-family: var(--fB);
  font-size: 0.92rem;
  line-height: 1.6;
}
.refText {
  white-space: pre-wrap;
}
.refImg {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
  border: 1px solid var(--border);
  cursor: zoom-in;
  display: block;
}
.refCaption {
  color: var(--muted);
  font-style: italic;
  font-size: 0.82rem;
  margin-top: 0.3rem;
}
.refTable {
  border-collapse: collapse;
  width: 100%;
}
.refTable th,
.refTable td {
  border: 1px solid var(--border);
  padding: 0.35rem 0.55rem;
  text-align: left;
}
.refTable th {
  background: var(--bg3);
  font-family: var(--fH);
  color: var(--red);
}
.refList {
  margin: 0;
  padding-left: 1.2rem;
}
.refLink {
  color: var(--red);
  font-weight: 600;
  word-break: break-all;
}
.refMusicThumb {
  position: relative;
  display: inline-block;
  max-width: 320px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border);
  line-height: 0;
}
.refMusicThumb img {
  width: 100%;
  display: block;
}
.refMusicPlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(139, 0, 0, 0.85);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  padding-left: 3px;
  transition: transform 0.15s ease;
}
.refMusicThumb:hover .refMusicPlay {
  transform: translate(-50%, -50%) scale(1.12);
}
</style>
