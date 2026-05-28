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
   * Import a level module dynamically by stage id.
   * @param {'stage1'|'stage2'|'stage3'} stageId
   * @returns {Promise<object>}
   */
  static async load(stageId) {
    const modules = {
      stage1: () => import('./levels/stage1.json'),
      stage2: () => import('./levels/stage2.json'),
      stage3: () => import('./levels/stage3.json'),
    }
    if (!modules[stageId]) throw new Error(`Unknown stage: ${stageId}`)
    const mod = await modules[stageId]()
    return LevelLoader.validate(mod.default ?? mod)
  }
}
