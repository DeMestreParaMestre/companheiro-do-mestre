export type CellAlign = 'left' | 'center' | 'right'

export interface RefTableData {
  v: 1
  cells: string[][]
  align: CellAlign[][]
}

function splitRow(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((s) => s.trim())
  const semi = (line.match(/;/g) || []).length
  const comma = (line.match(/,/g) || []).length
  if (semi > comma) return line.split(';').map((s) => s.trim())
  return line.split(',').map((s) => s.trim())
}

export function emptyTable(rows = 3, cols = 3): RefTableData {
  return normalizeTable({
    v: 1,
    cells: Array.from({ length: rows }, () => Array.from({ length: cols }, () => '')),
    align: []
  })
}

export function normalizeTable(raw: Partial<RefTableData>): RefTableData {
  const cells = (raw.cells || []).map((row) => [...row])
  if (!cells.length) cells.push([''])
  const maxCols = Math.max(...cells.map((r) => r.length), 1)
  for (const row of cells) {
    while (row.length < maxCols) row.push('')
  }
  const align: CellAlign[][] = []
  for (let ri = 0; ri < cells.length; ri++) {
    const src = raw.align?.[ri] || []
    align.push(
      cells[ri].map((_, ci) => {
        const a = src[ci]
        return a === 'center' || a === 'right' ? a : 'left'
      })
    )
  }
  return { v: 1, cells, align }
}

export function parseTableContent(content: string): RefTableData {
  const trimmed = (content || '').trim()
  if (trimmed.startsWith('{')) {
    try {
      const j = JSON.parse(trimmed) as Partial<RefTableData>
      if (j.v === 1 && Array.isArray(j.cells)) return normalizeTable(j)
    } catch {
      /* formato legado abaixo */
    }
  }
  if (!trimmed) return emptyTable()
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return emptyTable()
  const cells = lines.map(splitRow)
  return normalizeTable({
    v: 1,
    cells,
    align: cells.map((row) => row.map(() => 'left' as CellAlign))
  })
}

export function serializeTableContent(data: RefTableData): string {
  return JSON.stringify(normalizeTable(data))
}

export function colLabel(index: number): string {
  let n = index
  let label = ''
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}
