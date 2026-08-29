class SharedMemory {
  constructor() {
    this.store = new Map();
  }

  set(key, value) {
    this.store.set(key, {
      value,
      updatedAt: new Date(),
    });
  }

  get(key) {
    const entry = this.store.get(key);
    return entry ? entry.value : null;
  }

  getAll() {
    const result = {};
    for (const [key, entry] of this.store) {
      result[key] = entry.value;
    }
    return result;
  }

  append(key, value) {
    const existing = this.get(key) || [];
    this.set(key, [...existing, value]);
  }

  clear() {
    this.store.clear();
  }

  toContext() {
    const all = this.getAll();
    return Object.entries(all)
      .map(([k, v]) => `[${k}]: ${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join("\n\n");
  }
}

export const sharedMemory = new SharedMemory();
