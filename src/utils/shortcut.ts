export function shortcutKeys(shortcut: string | string[] | undefined) {
  if (Array.isArray(shortcut)) return shortcut
  if (!shortcut) return []
  const keys = shortcut.split('+').map(key => key.trim()).filter(Boolean)
  if (shortcut.endsWith('+')) keys.push('+')
  return keys
}

export function keyShortcuts(keys: string[]) {
  const aliases: Record<string, string> = { ctrl: 'Control', cmd: 'Meta', command: 'Meta', option: 'Alt', esc: 'Escape', '+': 'Plus' }
  return keys.map(key => aliases[key.toLowerCase()] ?? key).join('+') || undefined
}
