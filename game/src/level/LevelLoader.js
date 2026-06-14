// Every level is a JSON file in ./levels/, auto-discovered at build time. To
// author a new level you just drop a <name>.json here with a unique "id" — it
// shows up in the menu automatically, no code change. Add an optional
// "baseStage" ("stage1"|"stage2"|"stage3") to reuse that stage's geometry +
// camera path while supplying your own waves (see custom1.json).
const levelModules = import.meta.glob('./levels/*.json', { eager: true })

function indexLevels() {
  const byId = new Map()
  for (const path in levelModules) {
    const raw = levelModules[path].default ?? levelModules[path]
    if (raw && raw.id) byId.set(raw.id, raw)
  }
  return byId
}

export class LevelLoader {
  /**
   * Validates a raw level JSON object and returns it typed.
   * Throws a descriptive Error on any missing or invalid field.
   * @param {object} raw
   */
  static validate(raw) {
    if (!raw.id) throw new Error('Level missing required field: id')
    if (!raw.railPath) throw new Error('Level missing required field: railPath')
    if (!Array.isArray(raw.railPath) || raw.railPath.length < 3)
      throw new Error('Level railPath must have at least 3 points')
    if (!Array.isArray(raw.waves)) throw new Error('Level missing required field: waves')
    if (typeof raw.duration !== 'number') throw new Error('Level missing required field: duration')
    return raw
  }

  /**
   * Look up an auto-discovered level by its `id` and return it validated.
   * @param {string} id  e.g. 'stage1', 'custom1'
   * @returns {Promise<object>}
   */
  static async load(id) {
    const raw = indexLevels().get(id)
    if (!raw) throw new Error(`Unknown level: ${id}`)
    return LevelLoader.validate(raw)
  }

  /**
   * The discovered levels for the stage-select menu — base stages first
   * (stage1, stage2, …), then any custom levels alphabetically.
   * @returns {{id: string, name: string}[]}
   */
  static list() {
    return [...indexLevels().values()]
      .map(l => ({ id: l.id, name: l.name ?? l.id }))
      .sort((a, b) => {
        const as = a.id.startsWith('stage'), bs = b.id.startsWith('stage')
        if (as !== bs) return as ? -1 : 1
        return a.id.localeCompare(b.id, undefined, { numeric: true })
      })
  }
}
