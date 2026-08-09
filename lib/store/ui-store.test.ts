import { beforeEach, describe, expect, it } from "vitest";

import { THEME_STORAGE_KEY, useUIStore } from "./ui-store";

function resetStore() {
  useUIStore.setState({
    sidebarCollapsed: false,
    projectSwitcherOpen: false,
    theme: "system",
  });
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
}

describe("useUIStore", () => {
  beforeEach(resetStore);

  it("toggles sidebarCollapsed independently of other fields", () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it("setTheme('dark') sets the data-theme attribute and persists it", () => {
    useUIStore.getState().setTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("setTheme('system') removes the data-theme override", () => {
    useUIStore.getState().setTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    useUIStore.getState().setTheme("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
  });

  it("setProjectSwitcherOpen sets the open state exactly", () => {
    useUIStore.getState().setProjectSwitcherOpen(true);
    expect(useUIStore.getState().projectSwitcherOpen).toBe(true);
    useUIStore.getState().setProjectSwitcherOpen(false);
    expect(useUIStore.getState().projectSwitcherOpen).toBe(false);
  });
});
