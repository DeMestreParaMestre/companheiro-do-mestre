import { reactive } from 'vue'

export type DialogMode = 'alert' | 'confirm' | 'prompt'

export interface DialogOptions {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Estilo destrutivo no botão de confirmar (exclusões). */
  danger?: boolean
  /** Valor inicial do campo (modo prompt). */
  defaultValue?: string
}

const state = reactive({
  open: false,
  mode: 'alert' as DialogMode,
  title: '',
  message: '',
  confirmLabel: 'OK',
  cancelLabel: 'Cancelar',
  danger: false,
  inputValue: ''
})

let resolver: ((value: boolean | string | null) => void) | null = null

function close(result: boolean | string | null) {
  state.open = false
  const r = resolver
  resolver = null
  r?.(result)
}

function openDialog(
  mode: DialogMode,
  message: string,
  options: DialogOptions = {}
): Promise<boolean | string | null> {
  if (resolver) close(mode === 'prompt' ? null : false)

  state.mode = mode
  state.message = message
  state.title =
    options.title ?? (mode === 'confirm' ? 'Confirmar' : mode === 'prompt' ? 'Entrada' : 'Aviso')
  state.confirmLabel =
    options.confirmLabel ?? (mode === 'confirm' || mode === 'prompt' ? 'Confirmar' : 'OK')
  state.cancelLabel = options.cancelLabel ?? 'Cancelar'
  state.danger = !!options.danger
  state.inputValue = options.defaultValue ?? ''
  state.open = true

  return new Promise((resolve) => {
    resolver = resolve
  })
}

/** Alerta estilizado (substitui window.alert). */
export function appAlert(message: string, options: DialogOptions = {}): Promise<void> {
  return openDialog('alert', message, options).then(() => undefined)
}

/** Confirmação estilizada (substitui window.confirm). */
export function appConfirm(message: string, options: DialogOptions = {}): Promise<boolean> {
  return openDialog('confirm', message, {
    confirmLabel: options.confirmLabel ?? 'Confirmar',
    ...options
  }).then((v) => !!v)
}

/** Prompt estilizado (substitui window.prompt). Retorna o texto ou null se cancelar. */
export function appPrompt(message: string, options: DialogOptions = {}): Promise<string | null> {
  return openDialog('prompt', message, {
    confirmLabel: options.confirmLabel ?? 'Salvar',
    ...options
  }).then((v) => (typeof v === 'string' ? v : null))
}

export function useAppDialog() {
  return {
    state,
    accept: () => {
      if (state.mode === 'prompt') close(state.inputValue)
      else close(true)
    },
    dismiss: () => {
      if (state.mode === 'alert') close(true)
      else if (state.mode === 'prompt') close(null)
      else close(false)
    }
  }
}
