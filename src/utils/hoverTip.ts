export function placeHoverTip(
  anchor: { top: number; left: number; bottom: number },
  tip: { width: number; height: number },
  viewport: { w: number; h: number },
  gap = 6,
  pad = 8
): { top: number; left: number } {
  const width = tip.width || 280
  const height = tip.height || 80
  let left = Math.min(anchor.left, viewport.w - width - pad)
  left = Math.max(pad, left)

  const below = anchor.bottom + gap
  const above = anchor.top - height - gap
  const fitsBelow = below + height <= viewport.h - pad
  let top = fitsBelow ? below : above
  top = Math.min(top, viewport.h - height - pad)
  top = Math.max(pad, top)
  return { top, left }
}
