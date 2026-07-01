import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Dev-only CSP relaxation: Vite injects CSS via inline <style> during HMR, so
// style-src needs 'unsafe-inline' in dev or the app renders unstyled.
// `apply: 'serve'` guarantees this plugin never runs during `vite build`, so the
// production bundle keeps the strict `style-src 'self'` from index.html verbatim.
function cspPerEnv() {
  return {
    name: 'csp-per-env',
    apply: 'serve' as const,
    transformIndexHtml(html: string) {
      return html.replace(
        /style-src 'self'(?=[';])/,
        "style-src 'self' 'unsafe-inline'",
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Relative base so the static build works at any deploy path
  // (GitHub Pages project site at <user>.github.io/<repo>/, custom domain, or local preview).
  base: './',
  plugins: [svelte(), command === 'serve' && cspPerEnv()],
}))
