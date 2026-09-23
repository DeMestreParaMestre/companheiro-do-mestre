<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useAuthStore, authErrorMessage, type AuthSession } from '../../stores/auth'
import { parseUserAgent } from '../../utils/userAgent'
import { useToast } from '../../composables/useToast'
import { appConfirm } from '../../composables/useAppDialog'
import BaseModal from './BaseModal.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const auth = useAuthStore()
const toast = useToast()

type Section = 'name' | 'email' | 'password' | 'sessions'
const busy = ref<Section | null>(null)
const errors = reactive<Record<Section, string>>({ name: '', email: '', password: '', sessions: '' })

const name = ref('')
const newEmail = ref('')
const emailSentTo = ref('')
const pw = reactive({ value: '', confirm: '', code: '', needsCode: false, show: false })
const sessions = ref<AuthSession[]>([])
const sessionsLoaded = ref(false)

watch(
  () => props.open,
  (o) => {
    if (!o || !auth.user) return
    name.value = auth.displayName
    newEmail.value = ''
    emailSentTo.value = ''
    Object.assign(pw, { value: '', confirm: '', code: '', needsCode: false, show: false })
    ;(Object.keys(errors) as Section[]).forEach((k) => (errors[k] = ''))
    void loadSessions()
  },
  { immediate: true }
)

async function loadSessions() {
  sessionsLoaded.value = false
  await act('sessions', async () => {
    sessions.value = await auth.listSessions()
  })
  sessionsLoaded.value = true
}

const ICONS = { mobile: '📱', tablet: '📱', desktop: '💻' }
function deviceLabel(s: AuthSession) {
  const d = parseUserAgent(s.user_agent)
  return { icon: ICONS[d.kind], title: `${d.browser} no ${d.os}` }
}

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
function when(iso: string | null) {
  if (!iso) return 'data desconhecida'
  const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60000)
  if (diffMin > -2) return 'agora'
  if (diffMin > -60) return rtf.format(diffMin, 'minute')
  if (diffMin > -60 * 24) return rtf.format(Math.round(diffMin / 60), 'hour')
  if (diffMin > -60 * 24 * 30) return rtf.format(Math.round(diffMin / 1440), 'day')
  return new Date(iso).toLocaleDateString('pt-BR')
}

async function revoke(s: AuthSession) {
  const { title } = deviceLabel(s)
  if (!(await appConfirm(`Encerrar a sessão em "${title}"?`, { title: 'Encerrar sessão', confirmLabel: 'Encerrar', danger: true }))) return
  await act('sessions', async () => {
    await auth.revokeSession(s.id)
    sessions.value = sessions.value.filter((x) => x.id !== s.id)
    toast.show('Sessão encerrada.')
  })
}

async function act(section: Section, fn: () => Promise<void>) {
  errors[section] = ''
  busy.value = section
  try {
    await fn()
  } catch (e) {
    errors[section] = authErrorMessage(e)
  } finally {
    busy.value = null
  }
}

function saveName() {
  const n = name.value.trim()
  if (n.length > 60) {
    errors.name = 'Use no máximo 60 caracteres.'
    return
  }
  return act('name', async () => {
    await auth.updateName(n)
    toast.show('Nome atualizado.')
  })
}

function saveEmail() {
  const e = newEmail.value.trim()
  if (!/^\S+@\S+\.\S+$/.test(e)) {
    errors.email = 'Digite um e-mail válido.'
    return
  }
  if (e.toLowerCase() === auth.user?.email?.toLowerCase()) {
    errors.email = 'Este já é o seu e-mail atual.'
    return
  }
  return act('email', async () => {
    await auth.updateEmail(e)
    emailSentTo.value = e
    newEmail.value = ''
  })
}

function isReauthNeeded(e: unknown) {
  const err = e as { code?: string; message?: string }
  return err?.code === 'reauthentication_needed' || /reauthentication.*(need|requir)/i.test(err?.message || '')
}

function savePassword() {
  if (pw.value.length < 8 || !/[a-z]/i.test(pw.value) || !/\d/.test(pw.value)) {
    errors.password = 'A senha precisa ter pelo menos 8 caracteres, com letras e números.'
    return
  }
  if (pw.value !== pw.confirm) {
    errors.password = 'As senhas não conferem.'
    return
  }
  if (pw.needsCode && !pw.code.trim()) {
    errors.password = 'Digite o código enviado para o seu e-mail.'
    return
  }
  return act('password', async () => {
    try {
      await auth.updatePassword(pw.value, pw.needsCode ? pw.code.trim() : undefined)
    } catch (e) {
      // Login antigo (>24h): o Supabase exige um código enviado por e-mail.
      if (!pw.needsCode && isReauthNeeded(e)) {
        await auth.reauthenticate()
        pw.needsCode = true
        return
      }
      throw e
    }
    Object.assign(pw, { value: '', confirm: '', code: '', needsCode: false })
    toast.show('Senha alterada.')
  })
}

function resendCode() {
  return act('password', async () => {
    await auth.reauthenticate()
    toast.show('Novo código enviado.', 'info')
  })
}

async function signOutEverywhere() {
  if (
    !(await appConfirm('Encerrar a sessão em todos os computadores e navegadores, incluindo este?', {
      title: 'Sair de todos os dispositivos',
      confirmLabel: 'Sair de todos',
      danger: true
    }))
  )
    return
  await act('sessions', async () => {
    await auth.signOut(true)
    emit('close')
    toast.show('Sessão encerrada em todos os dispositivos.')
  })
}
</script>

<template>
  <BaseModal :open="open && !!auth.user" @close="emit('close')">
    <div class="modal accModal">
      <button class="mClose" aria-label="Fechar" @click="emit('close')">✕</button>
      <h3>⚙ Minha conta</h3>

      <!-- Perfil -->
      <section class="accSec">
        <h4>Perfil</h4>
        <form class="accRow" @submit.prevent="saveName">
          <div class="fGrp">
            <label for="accName">Nome de exibição</label>
            <input id="accName" v-model="name" type="text" maxlength="60" placeholder="Ex: Mestre Guilherme" autocomplete="nickname" />
          </div>
          <button type="submit" class="btn btnRed" :disabled="busy === 'name' || name.trim() === auth.displayName">
            {{ busy === 'name' ? 'Salvando…' : 'Salvar' }}
          </button>
        </form>
        <p v-if="errors.name" class="accErr" role="alert">{{ errors.name }}</p>
      </section>

      <!-- E-mail -->
      <section class="accSec">
        <h4>E-mail</h4>
        <p class="accCurrent">
          Atual: <strong>{{ auth.user?.email }}</strong>
        </p>
        <div v-if="emailSentTo" class="accOk" role="status">
          ✉ Enviamos links de confirmação para <strong>{{ auth.user?.email }}</strong> e <strong>{{ emailSentTo }}</strong>. O e-mail só muda
          depois que você confirmar nos dois.
        </div>
        <form v-else class="accRow" @submit.prevent="saveEmail">
          <div class="fGrp">
            <label for="accEmail">Novo e-mail</label>
            <input id="accEmail" v-model="newEmail" type="email" autocomplete="email" placeholder="novo@exemplo.com" />
          </div>
          <button type="submit" class="btn btnRed" :disabled="busy === 'email' || !newEmail.trim()">
            {{ busy === 'email' ? 'Enviando…' : 'Alterar' }}
          </button>
        </form>
        <p v-if="errors.email" class="accErr" role="alert">{{ errors.email }}</p>
      </section>

      <!-- Senha -->
      <section class="accSec">
        <h4>Senha</h4>
        <p class="accHint">Entrou por link mágico e não tem senha? Defina uma aqui para também poder entrar com e-mail e senha.</p>
        <form class="accStack" @submit.prevent="savePassword">
          <div class="accPair">
            <div class="fGrp">
              <label for="accPw">Nova senha</label>
              <input id="accPw" v-model="pw.value" :type="pw.show ? 'text' : 'password'" autocomplete="new-password" placeholder="••••••••" />
            </div>
            <div class="fGrp">
              <label for="accPw2">Confirmar</label>
              <input id="accPw2" v-model="pw.confirm" :type="pw.show ? 'text' : 'password'" autocomplete="new-password" placeholder="••••••••" />
            </div>
          </div>
          <label class="accCheck"><input v-model="pw.show" type="checkbox" /> Mostrar senhas</label>

          <div v-if="pw.needsCode" class="accCode">
            <p>
              Por segurança, enviamos um código para <strong>{{ auth.user?.email }}</strong>. Digite-o para confirmar a troca.
            </p>
            <div class="accRow">
              <div class="fGrp">
                <label for="accCode">Código</label>
                <input id="accCode" v-model="pw.code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="12345678" />
              </div>
              <button type="button" class="btn btnOut" :disabled="busy === 'password'" @click="resendCode">Reenviar</button>
            </div>
          </div>

          <p v-if="errors.password" class="accErr" role="alert">{{ errors.password }}</p>
          <button type="submit" class="btn btnRed accSubmit" :disabled="busy === 'password' || !pw.value">
            {{ busy === 'password' ? 'Aguarde…' : pw.needsCode ? 'Confirmar nova senha' : 'Alterar senha' }}
          </button>
        </form>
      </section>

      <!-- Sessões -->
      <section class="accSec accDanger">
        <h4>Dispositivos conectados</h4>
        <p class="accHint">Onde sua conta está logada agora. Não reconhece algum? Encerre a sessão e troque a senha.</p>

        <div v-if="!sessionsLoaded" class="accHint">Carregando…</div>
        <ul v-else-if="sessions.length" class="accDevices">
          <li v-for="s in sessions" :key="s.id" class="accDevice" :class="{ current: s.is_current }">
            <span class="accDevIcon" aria-hidden="true">{{ deviceLabel(s).icon }}</span>
            <div class="accDevInfo">
              <strong>
                {{ deviceLabel(s).title }}
                <span v-if="s.is_current" class="accBadge">Este dispositivo</span>
              </strong>
              <small>
                <template v-if="s.ip">IP {{ s.ip }} · </template>ativo {{ when(s.last_active_at) }} · entrou em
                {{ new Date(s.created_at).toLocaleDateString('pt-BR') }}
              </small>
            </div>
            <button v-if="!s.is_current" class="btn btnOut sm" :disabled="busy === 'sessions'" @click="revoke(s)">Encerrar</button>
          </li>
        </ul>

        <p v-if="errors.sessions" class="accErr" role="alert">{{ errors.sessions }}</p>
        <p class="accHint accNote">O aparelho encerrado perde o acesso em até 1 hora.</p>
        <button class="btn btnDng" :disabled="busy === 'sessions'" @click="signOutEverywhere">⎋ Sair de todos os dispositivos</button>
      </section>
    </div>
  </BaseModal>
</template>

<style scoped>
.accModal {
  width: 520px;
  max-width: 94vw;
  padding: 1.5rem 1.6rem;
}
.accModal::before {
  margin: -1.5rem -1.6rem 1rem;
}
.accModal h3 {
  font-size: 1.35rem;
  margin-bottom: 0.4rem;
}
.accSec {
  padding: 1rem 0;
  border-top: 1px solid var(--border);
}
.accSec:first-of-type {
  border-top: none;
  padding-top: 0.4rem;
}
.accSec h4 {
  font-family: var(--fH);
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--ink);
  margin-bottom: 0.55rem;
}
.accRow {
  display: flex;
  gap: 0.6rem;
  align-items: flex-end;
}
.accRow .fGrp {
  flex: 1;
}
.accStack {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.accPair {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.accPair .fGrp {
  flex: 1 1 180px;
}
.accModal input[type='text'],
.accModal input[type='email'],
.accModal input[type='password'] {
  padding: 0.52rem 0.7rem;
}
.accRow .btn {
  padding: 0.52rem 1rem;
}
.accCheck {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.78rem;
  font-weight: 400;
  cursor: pointer;
}
.accCheck input {
  accent-color: var(--red);
}
.accCurrent,
.accHint,
.accCode p {
  font-family: var(--fN);
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--muted);
  margin-bottom: 0.55rem;
}
.accCurrent strong,
.accCode strong {
  color: var(--ink);
}
.accCode {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-left: 4px solid var(--gold);
  border-radius: 3px;
  padding: 0.65rem 0.75rem;
}
.accSubmit {
  align-self: flex-start;
  padding: 0.52rem 1.1rem;
}
.accOk,
.accErr {
  font-family: var(--fN);
  font-size: 0.8rem;
  line-height: 1.5;
  border: 1px solid;
  border-left-width: 4px;
  border-radius: 3px;
  padding: 0.5rem 0.7rem;
  margin-top: 0.5rem;
}
.accOk {
  background: #e8f5e8;
  border-color: #1a6b2a;
  color: #1a4d1a;
}
[data-theme='dark'] .accOk {
  background: rgba(60, 160, 90, 0.15);
  color: #bfe8c8;
}
.accErr {
  background: var(--danger-bg);
  border-color: var(--danger);
  color: var(--danger);
}
.accDevices {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-bottom: 0.6rem;
}
.accDevice {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.7rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-left: 3px solid var(--border);
  border-radius: 3px;
}
.accDevice.current {
  border-left-color: var(--gold);
  background: var(--light);
}
.accDevIcon {
  font-size: 1.4rem;
  flex-shrink: 0;
}
.accDevInfo {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.accDevInfo strong {
  font-family: var(--fH);
  font-size: 0.98rem;
  color: var(--ink);
}
.accDevInfo small {
  font-family: var(--fN);
  font-size: 0.74rem;
  color: var(--muted);
  line-height: 1.4;
}
.accBadge {
  display: inline-block;
  margin-left: 0.35rem;
  padding: 0.05rem 0.4rem;
  font-family: var(--fN);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: var(--gold);
  border: 1px solid var(--gold);
  border-radius: 10px;
  vertical-align: middle;
}
.accNote {
  font-size: 0.72rem;
  font-style: italic;
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
@media (max-width: 480px) {
  .accRow {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
