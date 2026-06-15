export function translate(dict, key, vars = {}) {
  let s = dict[key]
  if (s == null) return key
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}

export class I18n {
  constructor(dict = {}) { this.dict = dict }
  t(key, vars) { return translate(this.dict, key, vars) }
}
