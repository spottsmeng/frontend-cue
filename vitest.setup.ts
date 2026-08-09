import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Node 22+'s own experimental global `localStorage` (needs
// --localstorage-file to work at all) shadows jsdom's real implementation
// under this Node/jsdom/Vitest combination — `window.localStorage.getItem`
// throws instead of behaving like a browser's. A minimal in-memory
// polyfill sidesteps the version-specific quirk entirely and gives
// deterministic Storage behaviour for every test, matching what a real
// browser (and lib/store/ui-store.ts's own try/catch, written for Safari
// private-browsing's *different* localStorage failure mode) expects.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

Object.defineProperty(window, "localStorage", {
  value: new MemoryStorage(),
  configurable: true,
});

// RTL's own auto-cleanup only registers itself against a *global* afterEach
// (checks `typeof afterEach === "function"` at import time) — this project
// doesn't enable Vitest's `globals: true`, so without this, each test file
// accumulates every previous test's rendered DOM, producing false
// "multiple elements found" failures that have nothing to do with the
// component under test.
afterEach(cleanup);
