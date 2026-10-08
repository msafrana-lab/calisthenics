// Renders exercise animation keyframes to a PNG for visual review.
// Usage: node scripts/review.mjs <out.png> [ID ...] [--dark] [--compact]
import { createServer } from 'vite'
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs'

const args = process.argv.slice(2)
const out = args.shift()
const dark = args.includes('--dark')
const compact = args.includes('--compact')
const ids = args.filter((a) => !a.startsWith('--'))
if (!out) throw new Error('usage: node scripts/review.mjs <out.png> [ID ...] [--dark] [--compact]')

const server = await createServer({ server: { port: 0 }, logLevel: 'error' })
await server.listen()
const { port } = server.httpServer.address()
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ colorScheme: dark ? 'dark' : 'light', deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const query = new URLSearchParams()
  if (ids.length) query.set('ids', ids.join(','))
  if (compact) query.set('compact', '1')
  await page.goto(`http://localhost:${port}/calisthenics/review.html?${query}`)
  await page.waitForSelector('#sheet', { timeout: 30000 })
  await page.locator('#sheet').screenshot({ path: out })
  if (errors.length) console.error(errors.join('\n'))
  console.log(`wrote ${out}`)
} finally {
  await browser.close()
  await server.close()
}
