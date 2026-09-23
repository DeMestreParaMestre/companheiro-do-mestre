<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useSyncStore, type SyncStatus } from '../../stores/sync'
import { appConfirm } from '../../composables/useAppDialog'
import AuthModal from './AuthModal.vue'
import AccountModal from './AccountModal.vue'

const auth = useAuthStore()
const sync = useSyncStore()
const menuOpen = ref(false)
const showAuth = ref(false)
const showAccount = ref(false)
const root = ref<HTMLElement | null>(null)

const label = computed(() => auth.displayName || auth.user?.email || '')
const initial = computed(() => (label.value.trim()[0] || '?').toUpperCase())

function openAccount() {
  menuOpen.value = false
  showAccount.value = true
}
const STATUS: Record<SyncStatus, { icon: string; text: string } | null> = {
  off: null,
  syncing: { icon: '⟳', text: 'Sincronizando…' },
  saved: { icon: '☁✓', text: 'Salvo na nuvem' },
  pending: { icon: '●', text: 'Alterações não enviadas' },
  offline: { icon: '⚠', text: 'Offline — será enviado ao reconectar' },
  conflict: { icon: '⚠', text: 'Conflito: escolha uma versão' },
  error: { icon: '⚠', text: 'Erro ao sincronizar — clique para tentar de novo' }
}
const statusInfo = computed(() => {
  const s = STATUS[sync.status]
  if (!s) return null
  const extra = sync.status === 'offline' && sync.pending ? ` (${sync.pending} pendente${sync.pending > 1 ? 's' : ''})` : ''
  return { ...s, text: s.text + extra, title: sync.status === 'error' && sync.lastError ? sync.lastError : s.text + extra }
})

async function signOut() {
  menuOpen.value = false
  if (!(await appConfirm('Sair da sua conta neste navegador?', { title: 'Sair', confirmLabel: 'Sair' }))) return
  await sync.syncNow()
  const unsent = sync.countPending()
  const clear = await appConfirm(
    (unsent
      ? `⚠ ${unsent} campanha(s) com alterações ainda não enviadas à nuvem (sem conexão?). Se apagar, essas alterações se perdem.\n\n`
      : 'Suas campanhas estão salvas na nuvem.\n\n') +
      'Apagar também as campanhas deste navegador? Recomendado em computador compartilhado.',
    { title: 'Dados deste navegador', confirmLabel: 'Apagar deste navegador', cancelLabel: 'Manter aqui', danger: true }
  )
  // Nessa ordem: logado, a sincronização automática rebaixaria tudo logo após apagar.
  await auth.signOut()
  if (clear) await sync.clearLocal()
}

function onDocClick(e: MouseEvent) {
  if (menuOpen.value && root.value && !root.value.contains(e.target as Node)) menuOpen.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') menuOpen.value = false
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div v-if="auth.configured && auth.ready" ref="root" class="acct">
    <button v-if="!auth.user" class="btn btnRed sm acctSignIn" @click="showAuth = true">👤 Entrar</button>

    <template v-else>
      <button
        v-if="statusInfo"
        class="acctSync"
        :class="'s-' + sync.status"
        :title="statusInfo.title"
        :aria-label="statusInfo.title"
        @click="sync.syncNow()"
      >
        <span aria-hidden="true">{{ statusInfo.icon }}</span>
        <span class="acctSyncText">{{ statusInfo.text }}</span>
      </button>
      <button
        class="acctTrigger"
        :aria-expanded="menuOpen"
        aria-haspopup="menu"
        :title="'Conectado como ' + auth.user.email"
        @click="menuOpen = !menuOpen"
      >
        <span class="acctAvatar" aria-hidden="true">{{ initial }}</span>
        <span class="acctName">{{ label }}</span>
        <span class="acctCaret" aria-hidden="true">▾</span>
      </button>

      <div v-if="menuOpen" class="acctMenu" role="menu">
        <div class="acctMenuHead">
          <span class="acctAvatar lg" aria-hidden="true">{{ initial }}</span>
          <div class="acctMenuWho">
            <strong v-if="auth.displayName">{{ auth.displayName }}</strong>
            <span>{{ auth.user.email }}</span>
          </div>
        </div>
        <button role="menuitem" class="acctItem" @click="openAccount">⚙ Minha conta</button>
        <button role="menuitem" class="acctItem" @click="signOut">⎋ Sair</button>
      </div>
    </template>
  </div>
  <!-- Fora do .acct: o z-index dele prenderia os overlays abaixo do dado/toasts. -->
  <AuthModal :open="showAuth" @close="showAuth = false" />
  <AccountModal :open="showAccount" @close="showAccount = false" />
</template>

<style scoped>
.acct {
  position: absolute;
  top: 0.9rem;
  right: 1rem;
  z-index: 60;
  text-align: left;
}
.acct {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.acctSync {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.55rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  font-family: var(--fN);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted);
}
.acctSync:hover {
  border-color: var(--border);
}
.acctSync.s-saved {
  color: #1a6b2a;
}
[data-theme='dark'] .acctSync.s-saved {
  color: #8fd49f;
}
.acctSync.s-syncing span:first-child {
  display: inline-block;
  animation: acctSpin 1s linear infinite;
}
.acctSync.s-pending {
  color: var(--gold);
}
.acctSync.s-offline,
.acctSync.s-conflict,
.acctSync.s-error {
  color: var(--danger);
  border-color: var(--danger);
  background: var(--danger-bg);
}
@keyframes acctSpin {
  to {
    transform: rotate(360deg);
  }
}
.acctTrigger {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  max-width: 230px;
  padding: 0.22rem 0.6rem 0.22rem 0.22rem;
  background: var(--light);
  border: 1.5px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
  color: var(--ink);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.acctTrigger:hover,
.acctTrigger[aria-expanded='true'] {
  border-color: var(--red);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}
.acctAvatar {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--red);
  color: var(--light);
  font-family: var(--fH);
  font-weight: 700;
  font-size: 0.95rem;
}
.acctAvatar.lg {
  width: 40px;
  height: 40px;
  font-size: 1.25rem;
}
.acctName {
  font-family: var(--fN);
  font-size: 0.8rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.acctCaret {
  font-size: 0.7rem;
  color: var(--muted);
}
.acctMenu {
  position: absolute;
  top: calc(100% + 0.4rem);
  right: 0;
  min-width: 240px;
  background: var(--light);
  border: 1.5px solid var(--border2);
  border-top: 3px solid var(--red);
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  padding: 0.35rem;
}
.acctMenuHead {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.55rem 0.7rem;
  border-bottom: 1px solid var(--bg3);
  margin-bottom: 0.3rem;
}
.acctMenuWho {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.acctMenuWho strong {
  font-family: var(--fH);
  font-size: 1rem;
  color: var(--red);
}
.acctMenuWho span {
  font-family: var(--fN);
  font-size: 0.78rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.acctItem {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-radius: 3px;
  padding: 0.5rem 0.6rem;
  font-family: var(--fH);
  font-weight: 600;
  font-size: 0.92rem;
  color: var(--ink);
  cursor: pointer;
}
.acctItem:hover {
  background: var(--bg3);
  color: var(--red);
}

@media (max-width: 640px) {
  .acct {
    position: static;
    display: flex;
    justify-content: flex-end;
    margin: -0.6rem -0.2rem 0.4rem;
  }
  .acctName {
    max-width: 120px;
  }
  .acctSyncText {
    display: none;
  }
}
</style>
