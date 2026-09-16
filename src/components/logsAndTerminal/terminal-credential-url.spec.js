import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const logsAndTerminal = process.env.UI_SRC
  ? join(process.env.UI_SRC, 'components', 'logsAndTerminal')
  : here
const componentsRoot = process.env.UI_SRC
  ? join(process.env.UI_SRC, 'components')
  : join(here, '..')
const src = name => readFileSync(join(logsAndTerminal, name), 'utf8')

// Regression gate for ReCasaOS#8: reusable credentials must never appear in
// URLs, history, or logs. Two documented residuals are allowlisted below
// with their blockers; anything else fails the suite.
describe('no reusable credential in URLs', () => {
  test('sys SSH terminal uses the cookie ticket, never URL credentials', () => {
    const card = src('TerminalCard.vue')
    expect(card).not.toMatch(/qs\.stringify/)
    expect(card).not.toMatch(/wsssh\?/)
    expect(card).not.toMatch(/postData\.token/)
    expect(card).toMatch(/\/v1\/sys\/wsssh`/)
    expect(card).toMatch(/this\.sshPassword = ""/)
  })

  test('file-drop WebSocket carries no token and logs no URL', () => {
    const page = join(componentsRoot, 'filebrowser', 'drop', 'DropPage.vue')
    const drop = readFileSync(page, 'utf8')
    expect(drop).not.toMatch(/token=\$/)
    expect(drop).not.toMatch(/console\.log\(url\)/)
    expect(drop).toMatch(/\/v1\/file\/ws\?peer=/)
  })

  test('documented residuals stay fenced', () => {
    // 1. Container terminal: its backend is not the ReCasaOS root
    //    service, so the token protocol cannot be changed here alone.
    const appTerminal = readFileSync(
      join(componentsRoot, 'Apps', 'AppTerminalPanel.vue'),
      'utf8',
    )
    const residualTokens = (appTerminal.match(/\?token=\$/g) || []).length
    expect(residualTokens).toBeLessThanOrEqual(1)
    // 2. Avatar/wallpaper URLs target the legacy path-based image APIs
    //    the hardened backend answers with 410 Gone; they await the
    //    object-bound media replacement (UserService#4).
    const account = readFileSync(
      join(componentsRoot, 'account', 'AccountPanel.vue'),
      'utf8',
    )
    expect(account).toMatch(/avatar\?token=/)
  })
})
