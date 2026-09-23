import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SupabaseClient, User } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

let clientPromise: Promise<SupabaseClient> | null = null

export interface AuthSession {
  id: string
  created_at: string
  last_active_at: string | null
  user_agent: string | null
  ip: string | null
  is_current: boolean
}

/** Cliente carregado sob demanda (a lib não entra no bundle inicial). */
export function getSupabase(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      // PKCE: o retorno do login vem em ?code=, sem colidir com o #player.
      createClient(URL!, KEY!, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } })
    )
  }
  return clientPromise
}

const ERRORS: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu e-mail antes de entrar (veja a caixa de entrada e o spam).'],
  [/already registered|already exists/i, 'Já existe uma conta com este e-mail. Use "Entrar" ou "Esqueci a senha".'],
  [/rate limit|too many|for security purposes/i, 'Muitas tentativas. Aguarde um minuto e tente de novo.'],
  [/password.*(at least|characters|weak)/i, 'Senha fraca: use pelo menos 8 caracteres, com letras e números.'],
  [/same.*password|different from the old/i, 'A nova senha precisa ser diferente da atual.'],
  [/code verifier|auth code|pkce/i, 'Abra o link no mesmo navegador em que você pediu o e-mail.'],
  [/reauthenticat|nonce/i, 'Código de confirmação inválido ou expirado. Peça um novo código.'],
  [/new email.*same|email.*same as/i, 'Este já é o seu e-mail atual.'],
  [/could not find the function|PGRST202/i, 'Recurso ainda não configurado no banco (rode o SQL 0002_sessions no Supabase).'],
  [/failed to fetch|network/i, 'Sem conexão com o servidor. Verifique sua internet.']
]

export function authErrorMessage(e: unknown): string {
  // Erros do PostgREST (rpc) são objetos simples { message, code, details }, não Error.
  const obj = e as { message?: unknown; code?: unknown } | null
  const msg = typeof obj?.message === 'string' ? `${obj.message} ${obj.code ?? ''}` : String(e)
  return ERRORS.find(([re]) => re.test(msg))?.[1] || msg
}

export const useAuthStore = defineStore('auth', () => {
  const configured = !!(URL && KEY)
  const user = ref<User | null>(null)
  const ready = ref(!configured)
  /** Chegou pelo link de "esqueci a senha": o app pede a nova senha. */
  const recovering = ref(false)

  const redirectTo = () => location.origin + import.meta.env.BASE_URL

  let subscribed = false
  async function client(): Promise<SupabaseClient> {
    const sb = await getSupabase()
    if (!subscribed) {
      subscribed = true
      sb.auth.onAuthStateChange((event, session) => {
        user.value = session?.user ?? null
        if (event === 'PASSWORD_RECOVERY') recovering.value = true
      })
    }
    return sb
  }

  async function init() {
    if (!configured) return
    const returningFromEmail = location.search.includes('code=')
    // Sem sessão salva nem retorno de link: a lib só é baixada quando clicar em "Entrar".
    const hasSession = Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
    if (!returningFromEmail && !hasSession) {
      ready.value = true
      return
    }
    try {
      const sb = await client()
      const { data } = await sb.auth.getSession()
      user.value = data.session?.user ?? null
    } finally {
      ready.value = true
      if (returningFromEmail) history.replaceState(null, '', location.pathname + location.hash)
    }
  }

  async function run<T extends { error: unknown }>(p: PromiseLike<T>): Promise<T> {
    const r = await p
    if (r.error) throw r.error
    return r
  }

  async function signIn(email: string, password: string) {
    const sb = await client()
    await run(sb.auth.signInWithPassword({ email, password }))
  }

  /** Retorna true se precisa confirmar o e-mail antes de entrar. */
  async function signUp(email: string, password: string): Promise<boolean> {
    const sb = await client()
    const { data } = await run(sb.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } }))
    return !data.session
  }

  async function sendMagicLink(email: string) {
    const sb = await client()
    await run(sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo(), shouldCreateUser: true } }))
  }

  /** Sai da página para o Google; volta com ?code=, tratado em init(). */
  async function signInWithGoogle() {
    const sb = await client()
    await run(sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } }))
  }

  async function sendPasswordReset(email: string) {
    const sb = await client()
    await run(sb.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() }))
  }

  /** nonce = código enviado por reauthenticate() quando o login não é recente ("Secure password change"). */
  async function updatePassword(password: string, nonce?: string) {
    const sb = await client()
    await run(sb.auth.updateUser({ password, ...(nonce ? { nonce } : {}) }))
    recovering.value = false
  }

  /** Envia por e-mail o código exigido para trocar a senha com login antigo. */
  async function reauthenticate() {
    const sb = await client()
    await run(sb.auth.reauthenticate())
  }

  async function updateName(name: string) {
    const sb = await client()
    const { data } = await run(sb.auth.updateUser({ data: { display_name: name } }))
    user.value = data.user
  }

  /** O Supabase envia confirmação para o e-mail atual e para o novo; só troca depois das duas. */
  async function updateEmail(email: string) {
    const sb = await client()
    await run(sb.auth.updateUser({ email }, { emailRedirectTo: redirectTo() }))
  }

  async function listSessions(): Promise<AuthSession[]> {
    const sb = await client()
    const { data } = await run(sb.rpc('list_my_sessions'))
    return (data as AuthSession[]) || []
  }

  async function revokeSession(id: string) {
    const sb = await client()
    await run(sb.rpc('revoke_my_session', { p_session_id: id }))
  }

  async function signOut(everywhere = false) {
    const sb = await client()
    await sb.auth.signOut({ scope: everywhere ? 'global' : 'local' })
    user.value = null
  }

  const displayName = computed(() => (user.value?.user_metadata?.display_name as string | undefined)?.trim() || '')

  return {
    configured,
    user,
    displayName,
    ready,
    recovering,
    init,
    signIn,
    signUp,
    sendMagicLink,
    signInWithGoogle,
    sendPasswordReset,
    updatePassword,
    reauthenticate,
    updateName,
    updateEmail,
    listSessions,
    revokeSession,
    signOut
  }
})
