const HTML_ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => HTML_ESC[ch])

// Retorna HTML seguro para v-html: o texto é escapado antes de marcar o termo.
export function hl(text: string, search: string): string {
  const safe = escapeHtml(text)
  if (!search) return safe
  const escaped = escapeHtml(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return safe.replace(new RegExp('(' + escaped + ')', 'gi'), '<mark class="hl">$1</mark>')
}
