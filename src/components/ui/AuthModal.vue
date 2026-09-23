<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore, authErrorMessage } from '../../stores/auth'
import { useToast } from '../../composables/useToast'
import BaseModal from './BaseModal.vue'

const toast = useToast()
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const auth = useAuthStore()
type Mode = 'signin' | 'magic' | 'signup' | 'forgot'
const mode = ref<Mode>('signin')
const email = ref('')
const password = ref('')
const password2 = ref('')
const showPass = ref(false)
const busy = ref(false)
const error = ref('')
/** Depois de enviar um e-mail: mostra a tela "verifique sua caixa de entrada". */
const sentTo = ref('')

const TABS: { k: Mode; l: string }[] = [
  { k: 'signin', l: 'Entrar' },
  { k: 'signup', l: 'Criar conta' }
]

const recovery = computed(() => auth.recovering)
const visible = computed(() => props.open || recovery.value)
const needsPassword = computed(() => recovery.value || mode.value === 'signin' || mode.value === 'signup')
const needsConfirm = computed(() => recovery.value || mode.value === 'signup')

watch([mode, visible], () => {
  error.value = ''
  sentTo.value = ''
  password.value = ''
  password2.value = ''
  showPass.value = false
})

const heading = computed(() => {
  if (recovery.value) return { title: 'Nova senha', sub: 'Escolha uma nova senha para sua conta.' }
  if (mode.value === 'forgot') return { title: 'Recuperar senha', sub: 'Enviaremos um link para você criar uma nova senha.' }
  if (mode.value === 'magic') return { title: 'Conta do Mestre', sub: 'Entre sem senha: enviamos um link de acesso para o seu e-mail.' }
  if (mode.value === 'signup') return { title: 'Conta do Mestre', sub: 'Suas campanhas salvas na nuvem, em qualquer computador.' }
  return { title: 'Conta do Mestre', sub: 'Entre para acessar suas campanhas de qualquer lugar.' }
})

const submitLabel = computed(() => {
  if (recovery.value) return 'Salvar nova senha'
  return { signin: 'Entrar', magic: 'Enviar link de acesso', signup: 'Criar conta', forgot: 'Enviar link de recuperação' }[mode.value]
})

const sentText = computed(() => {
  if (mode.value === 'signup') return 'Confirme sua conta pelo link que enviamos para'
  if (mode.value === 'forgot') return 'Se houver uma conta, enviamos um link de recuperação para'
  return 'Enviamos um link de acesso para'
})

function validate(): boolean {
  if (!recovery.value && !/^\S+@\S+\.\S+$/.test(email.value.trim())) {
    error.value = 'Digite um e-mail válido.'
    return false
  }
  if (needsConfirm.value) {
    if (password.value.length < 8 || !/[a-z]/i.test(password.value) || !/\d/.test(password.value)) {
      error.value = 'A senha precisa ter pelo menos 8 caracteres, com letras e números.'
      return false
    }
    if (password.value !== password2.value) {
      error.value = 'As senhas não conferem.'
      return false
    }
  }
  return true
}

async function submit() {
  error.value = ''
  if (!validate()) return
  const e = email.value.trim()
  busy.value = true
  try {
    if (recovery.value) {
      await auth.updatePassword(password.value)
      toast.show('Senha alterada. Você já está conectado.')
      close()
    } else if (mode.value === 'signin') {
      await auth.signIn(e, password.value)
      toast.show('Bem-vindo de volta, Mestre!')
      close()
    } else if (mode.value === 'magic') {
      await auth.sendMagicLink(e)
      sentTo.value = e
    } else if (mode.value === 'signup') {
      if (await auth.signUp(e, password.value)) sentTo.value = e
      else close()
    } else {
      await auth.sendPasswordReset(e)
      sentTo.value = e
    }
  } catch (err) {
    error.value = authErrorMessage(err)
  } finally {
    busy.value = false
  }
}

async function google() {
  error.value = ''
  busy.value = true
  try {
    await auth.signInWithGoogle()
  } catch (err) {
    error.value = authErrorMessage(err)
    busy.value = false
  }
}

function close() {
  auth.recovering = false
  emit('close')
}
</script>

<template>
  <BaseModal :open="visible" @close="close">
    <div class="modal authModal">
      <button class="mClose" aria-label="Fechar" @click="close">✕</button>

      <header class="authHead">
        <div class="authSeal" aria-hidden="true">⬡</div>
        <h3>{{ heading.title }}</h3>
        <p>{{ heading.sub }}</p>
      </header>

      <nav v-if="!recovery && mode !== 'forgot' && mode !== 'magic' && !sentTo" class="authTabs" role="tablist">
        <button
          v-for="t in TABS"
          :key="t.k"
          type="button"
          role="tab"
          :aria-selected="mode === t.k"
          :class="{ on: mode === t.k }"
          @click="mode = t.k"
        >
          {{ t.l }}
        </button>
      </nav>

      <div v-if="sentTo" class="authSent" role="status">
        <div class="authSentIcon" aria-hidden="true">✉</div>
        <p>{{ sentText }}</p>
        <strong>{{ sentTo }}</strong>
        <small>Abra o link neste mesmo navegador. Não chegou? Confira o spam ou aguarde um minuto e tente de novo.</small>
        <button type="button" class="btn btnOut authWide" @click="sentTo = ''">← Voltar</button>
      </div>

      <form v-else class="authForm" novalidate @submit.prevent="submit">
        <div v-if="!recovery" class="fGrp">
          <label for="authEmail">E-mail</label>
          <input id="authEmail" v-model="email" type="email" autocomplete="email" placeholder="mestre@exemplo.com" />
        </div>

        <div v-if="needsPassword" class="fGrp">
          <div class="authLabelRow">
            <label for="authPass">{{ recovery ? 'Nova senha' : 'Senha' }}</label>
            <a v-if="mode === 'signin' && !recovery" href="#" @click.prevent="mode = 'forgot'">Esqueci a senha</a>
          </div>
          <div class="authPassWrap">
            <input
              id="authPass"
              v-model="password"
              :type="showPass ? 'text' : 'password'"
              :autocomplete="mode === 'signin' && !recovery ? 'current-password' : 'new-password'"
              placeholder="••••••••"
            />
            <button
              type="button"
              class="authEye"
              :aria-label="showPass ? 'Ocultar senha' : 'Mostrar senha'"
              :title="showPass ? 'Ocultar senha' : 'Mostrar senha'"
              @click="showPass = !showPass"
            >
              {{ showPass ? '🙈' : '👁' }}
            </button>
          </div>
          <small v-if="needsConfirm" class="authHelp">Mínimo de 8 caracteres, com letras e números.</small>
        </div>

        <div v-if="needsConfirm" class="fGrp">
          <label for="authPass2">Confirmar senha</label>
          <input id="authPass2" v-model="password2" :type="showPass ? 'text' : 'password'" autocomplete="new-password" placeholder="••••••••" />
        </div>

        <p v-if="error" class="authError" role="alert">{{ error }}</p>

        <button type="submit" class="btn btnRed authWide authSubmit" :disabled="busy">
          {{ busy ? 'Aguarde…' : submitLabel }}
        </button>

        <template v-if="mode === 'signin' && !recovery">
          <div class="authOr"><span>ou</span></div>
          <button type="button" class="btn btnOut authWide" :disabled="busy" @click="google">G&nbsp; Entrar com Google</button>
          <button type="button" class="btn btnOut authWide" @click="mode = 'magic'">✉ Entrar sem senha (link por e-mail)</button>
        </template>

        <a v-if="(mode === 'forgot' || mode === 'magic') && !recovery" href="#" class="authBack" @click.prevent="mode = 'signin'">← Voltar para entrar</a>
      </form>
    </div>
  </BaseModal>
</template>

<style scoped>
.authModal {
  width: 420px;
  max-width: 94vw;
  padding: 1.6rem 1.7rem 1.5rem;
}
.authModal::before {
  margin: -1.6rem -1.7rem 1.1rem;
}

.authHead {
  text-align: center;
  margin-bottom: 1.1rem;
}
.authSeal {
  width: 46px;
  height: 46px;
  margin: 0 auto 0.45rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--red);
  background: var(--light);
  border: 2px solid var(--border);
  border-radius: 50%;
  box-shadow: inset 0 0 0 3px var(--bg2), 0 1px 3px rgba(0, 0, 0, 0.12);
}
.authHead h3 {
  font-size: 1.45rem;
  margin-bottom: 0.2rem;
  letter-spacing: 0.3px;
}
.authHead p {
  font-family: var(--fH);
  font-style: italic;
  font-size: 0.98rem;
  line-height: 1.4;
  color: var(--muted);
}

.authTabs {
  display: flex;
  border-bottom: 1.5px solid var(--border);
  margin-bottom: 1.1rem;
}
.authTabs button {
  flex: 1;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -1.5px;
  padding: 0.5rem 0.3rem;
  font-family: var(--fH);
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.authTabs button:hover {
  color: var(--red);
}
.authTabs button.on {
  color: var(--red);
  border-bottom-color: var(--red);
}

.authForm {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.authForm input {
  padding: 0.6rem 0.75rem;
  font-size: 1rem;
}
.authLabelRow {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.authLabelRow a,
.authBack {
  font-family: var(--fN);
  font-size: 0.75rem;
  color: var(--red);
  text-decoration: none;
}
.authLabelRow a:hover,
.authBack:hover {
  text-decoration: underline;
}
.authBack {
  text-align: center;
  font-size: 0.8rem;
}
.authPassWrap {
  position: relative;
}
.authPassWrap input {
  padding-right: 2.6rem;
}
.authEye {
  position: absolute;
  top: 50%;
  right: 0.35rem;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem 0.4rem;
  opacity: 0.65;
}
.authEye:hover {
  opacity: 1;
}
.authHelp {
  font-family: var(--fN);
  font-size: 0.72rem;
  color: var(--muted);
}

.authError {
  font-family: var(--fN);
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--danger);
  background: var(--danger-bg);
  border: 1px solid var(--danger);
  border-left-width: 4px;
  border-radius: 3px;
  padding: 0.5rem 0.7rem;
}

.authWide {
  width: 100%;
}
.authOr {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0.1rem 0;
  color: var(--muted);
  font-family: var(--fN);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.authOr::before,
.authOr::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}
.authSubmit {
  padding: 0.65rem 1rem;
  font-size: 1rem;
  letter-spacing: 0.4px;
  margin-top: 0.15rem;
}
.authSubmit:disabled {
  opacity: 0.65;
  cursor: wait;
}

.authSent {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.35rem;
  padding: 0.4rem 0 0;
}
.authSentIcon {
  font-size: 2.4rem;
  line-height: 1;
  color: var(--red);
  margin-bottom: 0.3rem;
}
.authSent p {
  font-family: var(--fB);
  font-size: 1rem;
}
.authSent strong {
  font-family: var(--fN);
  font-size: 0.98rem;
  color: var(--red);
  word-break: break-all;
}
.authSent small {
  font-family: var(--fN);
  font-size: 0.76rem;
  line-height: 1.5;
  color: var(--muted);
  margin: 0.4rem 0 0.8rem;
}
</style>
