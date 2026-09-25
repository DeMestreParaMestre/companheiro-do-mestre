// Suba se mapas de batalha perderem detalhe legível.
const MAX_SIDE = 1600
const QUALITY = 0.85

export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number]
export const IMAGE_FILE_ACCEPT = 'image/jpeg,image/png,image/webp'
export const IMAGE_TYPE_ERROR = 'Use JPEG, PNG ou WebP. SVG, GIF e outros arquivos não são aceitos.'

const MIME_ALIASES: Record<string, AllowedImageMime> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg'
}

export function normalizeImageMime(mime: string): AllowedImageMime | null {
  const m = mime.toLowerCase().split(';')[0].trim()
  if ((ALLOWED_IMAGE_MIMES as readonly string[]).includes(m)) return m as AllowedImageMime
  return MIME_ALIASES[m] ?? null
}

export function sniffImageMime(bytes: Uint8Array): AllowedImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

export function dataUrlMime(src: string): string | null {
  const m = /^data:([^;,]+)/i.exec(src)
  return m ? m[1].toLowerCase() : null
}

function dataUrlHead(src: string, n: number): Uint8Array | null {
  const i = src.indexOf(',')
  if (i < 0) return null
  try {
    const bin = atob(src.slice(i + 1, i + 1 + 64))
    const out = new Uint8Array(Math.min(n, bin.length))
    for (let j = 0; j < out.length; j++) out[j] = bin.charCodeAt(j)
    return out
  } catch {
    return null
  }
}

export function isAllowedImageDataUrl(src: string): boolean {
  const declared = dataUrlMime(src)
  if (!declared || !normalizeImageMime(declared)) return false
  const bytes = dataUrlHead(src, 16)
  return !!bytes && sniffImageMime(bytes) != null
}

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = (e) => resolve(e.target?.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('imagem inválida'))
    img.src = src
  })
}

/** Reduz para no máx. MAX_SIDE px e recodifica (WebP; fallback JPEG/PNG). Devolve o original se não ficar menor. */
export async function compressDataUrl(src: string): Promise<string> {
  if (!src.startsWith('data:image/')) return src
  // GIF/SVG e outros: não recodifica (legado local). Upload novo é recusado em fileToDataUrl.
  if (!normalizeImageMime(dataUrlMime(src) || '')) return src
  try {
    const img = await loadImage(src)
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    let out = canvas.toDataURL('image/webp', QUALITY)
    if (!out.startsWith('data:image/webp')) {
      out = src.startsWith('data:image/png') ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', QUALITY)
    }
    return out.length < src.length ? out : src
  } catch {
    return src
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  if (!normalizeImageMime(file.type)) throw new Error(IMAGE_TYPE_ERROR)
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!sniffImageMime(head)) throw new Error(IMAGE_TYPE_ERROR)
  const url = await readAsDataUrl(file)
  if (!isAllowedImageDataUrl(url)) throw new Error(IMAGE_TYPE_ERROR)
  return compressDataUrl(url)
}
