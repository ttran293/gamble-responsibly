export const demoConnectionProviders = ["draftkings", "fanduel", "moonharbor"] as const;
export type DemoConnectionProvider = (typeof demoConnectionProviders)[number];

const storageKey = "stillwater-demo-connections-v1";
const seededKey = "stillwater-demo-connections-seeded-v1";

function readSaved(): DemoConnectionProvider[] {
  const raw = sessionStorage.getItem(storageKey);
  if (raw === null) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return demoConnectionProviders.filter(provider => parsed.includes(provider));
}

/** Account views with no saved choice load every synthetic demo account. */
export function demoConnectionsToLoad(accountDefault: boolean): DemoConnectionProvider[] {
  const seeded = sessionStorage.getItem(seededKey) === "1";
  if (accountDefault && !seeded) return [...demoConnectionProviders];
  return readSaved();
}

export function saveDemoConnections(providers: DemoConnectionProvider[], markAccountSeeded: boolean) {
  sessionStorage.setItem(storageKey, JSON.stringify(providers));
  if (markAccountSeeded) sessionStorage.setItem(seededKey, "1");
}

export function seedAccountDemoConnections() {
  saveDemoConnections([...demoConnectionProviders], true);
}

export function clearDemoConnections() {
  sessionStorage.removeItem(storageKey);
  sessionStorage.removeItem(seededKey);
}
