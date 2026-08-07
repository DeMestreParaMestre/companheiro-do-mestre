import { parseTableContent } from './refTable'
import { youtubeId } from './youtube'

export type RefFormField = 'name' | 'content' | 'url' | 'img'

export type RefFormErrors = Partial<Record<RefFormField, string>>

export interface RefFormInput {
  name: string
  type: string
  content: string
  url: string
  hasImage?: boolean
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s.includes('://') ? s : 'https://' + s)
    return u.hostname.length > 0
  } catch {
    return false
  }
}

export function validateReferenceForm(fields: RefFormInput): { ok: boolean; errors: RefFormErrors; summary: string } {
  const errors: RefFormErrors = {}

  if (!fields.name.trim()) {
    errors.name = 'Informe o nome da referência.'
  }

  switch (fields.type) {
    case 'imagem':
      if (!fields.hasImage) {
        errors.img = 'Selecione uma imagem — é obrigatória para referências do tipo Imagem.'
      }
      break
    case 'musica':
      if (!fields.url.trim()) {
        errors.url = 'Cole o link do YouTube — é obrigatório para referências do tipo Música.'
      } else if (!youtubeId(fields.url.trim())) {
        errors.url = 'O link do YouTube não parece válido. Use um endereço como https://www.youtube.com/watch?v=...'
      }
      break
    case 'link':
      if (!fields.content.trim()) {
        errors.content = 'Informe a URL do link.'
      } else if (!isValidUrl(fields.content.trim())) {
        errors.content = 'A URL não parece válida. Inclua o endereço completo (https://...).'
      }
      break
    case 'texto':
      if (!fields.content.trim()) {
        errors.content = 'Informe o texto da referência.'
      }
      break
    case 'lista': {
      const lines = fields.content
        .split(/\r?\n/)
        .map((l) => l.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean)
      if (!lines.length) {
        errors.content = 'Adicione pelo menos um item na lista (um por linha).'
      }
      break
    }
    case 'tabela': {
      const table = parseTableContent(fields.content)
      const filled = table.cells.some((row) => row.some((cell) => cell.trim()))
      if (!filled) {
        errors.content = 'Preencha ao menos uma célula da tabela.'
      }
      break
    }
  }

  const messages = Object.values(errors)
  let summary = ''
  if (messages.length === 1) summary = messages[0]
  else if (messages.length > 1) summary = `Não foi possível salvar: corrija os ${messages.length} campos marcados abaixo.`

  return { ok: messages.length === 0, errors, summary }
}
