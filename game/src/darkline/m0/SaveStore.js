// 極簡存檔：序列化進度到注入的 storage（預設 localStorage）。注入讓它可測。
const KEY = 'darkline.m0.save'
export class SaveStore {
  constructor(storage = globalThis.localStorage) { this.storage = storage }
  save(state) { this.storage.setItem(KEY, JSON.stringify(state)) }
  load() {
    const raw = this.storage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  }
  clear() { this.storage.removeItem(KEY) }
}
