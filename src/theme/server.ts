import { createElement } from 'react'
import { themeScript } from './shared.js'

export { themeFromCookie } from './cookie.js'

/** Inline the boot script from the server tree so hydration leaves the root theme intact. */
export function ThemeScript() {
  return createElement('script', { dangerouslySetInnerHTML: { __html: themeScript } })
}
