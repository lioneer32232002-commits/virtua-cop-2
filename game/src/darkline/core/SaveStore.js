const KEY = 'darkline.m1.save'
export class SaveStore {
  constructor(storage = globalThis.localStorage) { this.storage = storage }
  save(state) { this.storage.setItem(KEY, JSON.stringify(state)) }
  load() {
    const raw = this.storage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  }
  clear() { this.storage.removeItem(KEY) }
}
