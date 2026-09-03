import type { DiaryEntry } from '../types'
import { appAlert } from '../composables/useAppDialog'

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Escapa o texto e converte as quebras de linha digitadas pelo usuário em <br>,
// garantindo que o Word preserve os parágrafos (pre-wrap não é respeitado de forma confiável).
function escMultiline(s: string): string {
  return esc(s).replace(/\r\n?|\n/g, '<br>')
}

export async function exportDiaryToWord(diary: DiaryEntry[], campName: string) {
  const entries = diary.slice().sort((a, b) => a.id - b.id)
  if (!entries.length) {
    await appAlert('O diário está vazio.')
    return
  }
  const name = campName || 'Campanha'
  const bodyParts: string[] = []
  for (const e of entries) {
    bodyParts.push(
      '<div style="margin-bottom:36pt;">' +
        '<h2 style="font-family:Georgia,serif;font-size:18pt;color:#8b0000;margin-bottom:2pt;">' +
        esc(e.day) +
        '</h2>' +
        '<h3 style="font-family:Georgia,serif;font-size:14pt;color:#1a1008;margin-top:0;margin-bottom:10pt;font-style:italic;">' +
        esc(e.title) +
        ' <span style="font-size:10pt;color:#777;font-style:normal;">(' +
        esc(e.date) +
        ')</span></h3>' +
        '<p style="font-family:Georgia,serif;font-size:12pt;line-height:1.6;color:#1a1008;">' +
        escMultiline(e.body) +
        '</p>' +
        '</div><hr style="border:none;border-top:1pt solid #ccc;margin:24pt 0;">'
    )
  }
  const body = bodyParts.join('')
  const html =
    '<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><title>' +
    esc(name) +
    '</title>' +
    '<style>body{font-family:Georgia,serif;margin:1in;} h1{font-family:Georgia,serif;font-size:24pt;color:#8b0000;text-align:center;margin-bottom:4pt;} .subtitle{text-align:center;font-style:italic;color:#555;margin-bottom:30pt;}</style>' +
    '</head><body>' +
    '<h1>' +
    esc(name) +
    '</h1>' +
    '<p class="subtitle">Diário de Campanha</p>' +
    body +
    '</body></html>'
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name.replace(/[^a-zA-Z0-9]/g, '_') + '_diario.doc'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
