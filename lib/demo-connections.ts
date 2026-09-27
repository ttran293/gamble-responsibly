export const demoConnectionProviders = ["draftkings", "fanduel", "moonharbor"] as const;
export type DemoConnectionProvider = (typeof demoConnectionProviders)[number];
export type DemoVersion = "v1" | "v2";

const versionKey = "stillwater-demo-version";
const providersKey = "stillwater-demo-selected-providers";

export function savedDemoVersion(): DemoVersion | null {
  const version = sessionStorage.getItem(versionKey);
  return version === "v1" || version === "v2" ? version : null;
}

export function saveDemoVersion(version: DemoVersion) {
  sessionStorage.setItem(versionKey, version);
}

export function savedDemoProviders(): DemoConnectionProvider[] {
  const raw = sessionStorage.getItem(providersKey);
  if (!raw) return [...demoConnectionProviders];
  try {
    const values: unknown = JSON.parse(raw);
    const selected = Array.isArray(values) ? demoConnectionProviders.filter(provider => values.includes(provider)) : [];
    return selected.length ? selected : [...demoConnectionProviders];
  } catch {
    return [...demoConnectionProviders];
  }
}

export function saveDemoProviders(providers: DemoConnectionProvider[]) {
  sessionStorage.setItem(providersKey, JSON.stringify(providers));
}

export function clearDemoConnections() {
  sessionStorage.removeItem(versionKey);
  sessionStorage.removeItem(providersKey);
  sessionStorage.removeItem("stillwater-demo-connections-v1");
  sessionStorage.removeItem("stillwater-demo-connections-seeded-v1");
}
