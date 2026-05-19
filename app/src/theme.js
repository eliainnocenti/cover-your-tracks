import originalUrl from './styles/theme-original.css?url'
import coldLabUrl from './styles/theme-cold-lab.css?url'
import tapeLabelUrl from './styles/theme-tape-label.css?url'
import signalsUrl from './styles/theme-signals.css?url'

const THEMES = {
  original: {
    id: 'original',
    label: 'Original CRT',
    description: 'Green terminal CRT scanlines',
    url: originalUrl,
  },
  tape: {
    id: 'tape',
    label: 'Tape-Label Desk',
    description: 'Copper labels and archive desk',
    url: tapeLabelUrl,
  },
  cold: {
    id: 'cold',
    label: 'Cold Lab',
    description: 'Blue lab instrumentation',
    url: coldLabUrl,
  },
  signals: {
    id: 'signals',
    label: 'Signals Trace',
    description: 'Teal and magenta packet traces',
    url: signalsUrl,
  },
}

const DEFAULT_THEME = 'original'

export function getThemes() {
  return Object.values(THEMES)
}

export function getStoredTheme() {
  const stored = localStorage.getItem('cyt_theme')
  return THEMES[stored] ? stored : DEFAULT_THEME
}

export function applyTheme(themeId) {
  const theme = THEMES[themeId] ?? THEMES[DEFAULT_THEME]
  let link = document.getElementById('theme-stylesheet')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'stylesheet'
    link.id = 'theme-stylesheet'
    document.head.appendChild(link)
  }
  link.href = theme.url
  localStorage.setItem('cyt_theme', theme.id)
  return theme.id
}
