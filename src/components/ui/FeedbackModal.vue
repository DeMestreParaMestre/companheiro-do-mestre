<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore, authErrorMessage } from '../../stores/auth'
import { useToast } from '../../composables/useToast'
import BaseModal from './BaseModal.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const auth = useAuthStore()
const toast = useToast()

const KINDS = [
  { k: 'problema', l: '🐞 Problema' },
  { k: 'sugestao', l: '💡 Sugestão' },
  { k: 'outro', l: '💬 Outro' }
] as const

const kind = ref<(typeof KINDS)[number]['k']>('sugestao')
const message = ref('')
const contact = ref('')
const busy = ref(false)
const error = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    error.value = ''
    if (!contact.value) contact.value = auth.user?.email ?? ''
  },
  { immediate: true }
)

async function send() {
  const text = message.value.trim()
  if (text.length < 5) {
    error.value = 'Conte um pouco mais (pelo menos 5 caracteres).'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await auth.sendFeedback({
      kind: kind.value,
      message: text.slice(0, 4000),
      contact: contact.value.trim().slice(0, 200) || null,
      page:
        document
          .querySelector('.nav-btn.active')
          ?.textContent?.replace(/^[^\p{L}]+/u, '')
          .trim()
          .slice(0, 100) || ''
    })
    message.value = ''
    toast.show('Obrigado! Sua mensagem foi enviada.')
    emit('close')
  } catch (e) {
    error.value = authErrorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <form class="modal fbModal" @submit.prevent="send">
      <button type="button" class="mClose" aria-label="Fechar" @click="emit('close')">✕</button>
      <h3>Enviar feedback</h3>
      <p class="fbSub">Encontrou um problema ou tem uma ideia? Toda mensagem é lida.</p>

      <div class="fbKinds" role="radiogroup" aria-label="Tipo">
        <button
          v-for="k in KINDS"
          :key="k.k"
          type="button"
          role="radio"
          :aria-checked="kind === k.k"
          :class="{ on: kind === k.k }"
          @click="kind = k.k"
        >
          {{ k.l }}
        </button>
      </div>

      <div class="fGrp">
        <label for="fbMsg">Mensagem</label>
        <textarea
          id="fbMsg"
          v-model="message"
          maxlength="4000"
          :placeholder="kind === 'problema' ? 'O que aconteceu? O que você estava fazendo quando deu errado?' : 'Conte sua ideia…'"
        ></textarea>
      </div>

      <div class="fGrp">
        <label for="fbContact">E-mail para resposta (opcional)</label>
        <input id="fbContact" v-model="contact" type="email" maxlength="200" placeholder="mestre@exemplo.com" />
      </div>

      <p v-if="error" class="fbError" role="alert">{{ error }}</p>

      <div class="fbBtns">
        <button type="button" class="btn btnOut" @click="emit('close')">Cancelar</button>
        <button type="submit" class="btn btnRed" :disabled="busy">{{ busy ? 'Enviando…' : 'Enviar' }}</button>
      </div>
    </form>
  </BaseModal>
</template>

<style scoped>
.fbModal {
  width: 460px;
  max-width: 94vw;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.fbSub {
  font-family: var(--fB);
  font-style: italic;
  color: var(--muted);
  margin-top: -0.4rem;
}
.fbKinds {
  display: flex;
  gap: 0.4rem;
}
.fbKinds button {
  flex: 1;
  padding: 0.45rem 0.3rem;
  border: 1.5px solid var(--border);
  border-radius: 3px;
  background: none;
  color: var(--ink);
  font-family: var(--fH);
  font-size: 0.9rem;
  cursor: pointer;
}
.fbKinds button.on {
  border-color: var(--red);
  color: var(--red);
  background: var(--light);
}
.fbModal textarea {
  min-height: 120px;
}
.fbError {
  font-family: var(--fN);
  font-size: 0.82rem;
  color: var(--danger);
}
.fbBtns {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
