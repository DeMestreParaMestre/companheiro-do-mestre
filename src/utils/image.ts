// Suba se mapas de batalha perderem detalhe legível.
const MAX_SIDE = 1600
const QUALITY = 0.85

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
  // GIF perderia a animação; SVG já é vetorial.
  if (!src.startsWith('data:image/') || /^data:image\/(gif|svg)/.test(src)) return src
  try {
    const img = await loadImage(src)
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    let out = canvas.toDataURL('image/webp', QUALITY)
    // Navegador sem encoder WebP devolve PNG: JPEG para fotos, PNG para manter transparência.
    if (!out.startsWith('data:image/webp')) {
      out = src.startsWith('data:image/png') ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', QUALITY)
    }
    return out.length < src.length ? out : src
  } catch {
    return src
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return compressDataUrl(await readAsDataUrl(file))
}
