import type { Theme } from './shared.js'

/** Resolve the server-readable theme cookie without accepting arbitrary values. */
export function themeFromCookie(value: string | null | undefined): Theme | null {
  return value === 'light' || value === 'dark' ? value : null
}
