// Apaga do bucket `images` os caminhos listados em stdin (um por linha),
// pela API do Storage. Uso: psql ... -c "select name from list_orphan_images()" | node scripts/cleanup-orphan-images.mjs

const URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BATCH = 50

if (!URL || !KEY) {
  console.error('Faltam SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const paths = (await new Response(process.stdin).text())
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean)

if (!paths.length) {
  console.log('imagens_apagadas 0')
  process.exit(0)
}

let removed = 0
for (let i = 0; i < paths.length; i += BATCH) {
  const batch = paths.slice(i, i + BATCH)
  const res = await fetch(`${URL.replace(/\/$/, '')}/storage/v1/object/images`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${KEY}`,
      apikey: KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prefixes: batch })
  })
  const body = await res.text()
  if (!res.ok) {
    console.error(`Storage API ${res.status}: ${body.slice(0, 400)}`)
    process.exit(1)
  }
  removed += batch.length
}

console.log(`imagens_apagadas ${removed}`)
