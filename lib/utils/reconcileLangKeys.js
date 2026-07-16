/**
 * Reconciles the language keys modules declare they expect against the keys a
 * langpack actually translates. A declared entry flagged `pattern: true` is
 * treated as a key prefix (a dynamic family) rather than an exact key.
 * @param {Object} options
 * @param {Object} options.declared Map of declared key to its definition (a definition may set `pattern: true`)
 * @param {Array<String>|Object} options.translated The available translated keys (array, or object whose keys are used)
 * @returns {{ missing: Array<String>, orphan: Array<String> }} `missing` = declared keys with no translation; `orphan` = translated keys nothing declares
 */
export function reconcileLangKeys ({ declared = {}, translated = [] } = {}) {
  const translatedKeys = Array.isArray(translated) ? translated : Object.keys(translated)
  const translatedSet = new Set(translatedKeys)
  const declaredKeys = Object.keys(declared)
  const patterns = declaredKeys.filter(k => declared[k]?.pattern)

  const missing = declaredKeys.filter(k => {
    return declared[k]?.pattern
      ? !translatedKeys.some(t => t.startsWith(k))
      : !translatedSet.has(k)
  })

  const orphan = translatedKeys.filter(t => {
    return !declaredKeys.includes(t) && !patterns.some(p => t.startsWith(p))
  })

  return { missing, orphan }
}
