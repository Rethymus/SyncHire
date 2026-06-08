type StorageBackend = "tauri" | "capacitor" | "web";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: unknown;
  }
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isTauriRuntime(): boolean {
  return isBrowser() && (!!window.__TAURI_INTERNALS__ || !!window.__TAURI__);
}

async function getCapacitorPlatform(): Promise<string | null> {
  if (!isBrowser()) {
    return null;
  }

  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.getPlatform();
  } catch {
    return null;
  }
}

async function getBackend(): Promise<StorageBackend> {
  if (isTauriRuntime()) {
    return "tauri";
  }

  const capacitorPlatform = await getCapacitorPlatform();
  if (capacitorPlatform && capacitorPlatform !== "web") {
    return "capacitor";
  }

  return "web";
}

async function getTauriValue(key: string): Promise<string | null> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string | null>("read_platform_storage", { key });
}

async function setTauriValue(key: string, value: string): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("write_platform_storage", { key, value });
}

async function removeTauriValue(key: string): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("remove_platform_storage", { key });
}

async function getCapacitorValue(key: string): Promise<string | null> {
  const { Preferences } = await import("@capacitor/preferences");
  const result = await Preferences.get({ key });
  return result.value ?? null;
}

async function setCapacitorValue(key: string, value: string): Promise<void> {
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.set({ key, value });
}

async function removeCapacitorValue(key: string): Promise<void> {
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.remove({ key });
}

function getWebValue(key: string): string | null {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(key);
}

function setWebValue(key: string, value: string): void {
  if (isBrowser()) {
    window.localStorage.setItem(key, value);
  }
}

function removeWebValue(key: string): void {
  if (isBrowser()) {
    window.localStorage.removeItem(key);
  }
}

export async function getPlatformStorageItem(key: string): Promise<string | null> {
  const backend = await getBackend();

  try {
    if (backend === "tauri") {
      return await getTauriValue(key);
    }

    if (backend === "capacitor") {
      return await getCapacitorValue(key);
    }
  } catch {
    return getWebValue(key);
  }

  return getWebValue(key);
}

export async function setPlatformStorageItem(
  key: string,
  value: string
): Promise<void> {
  const backend = await getBackend();

  try {
    if (backend === "tauri") {
      await setTauriValue(key, value);
      return;
    }

    if (backend === "capacitor") {
      await setCapacitorValue(key, value);
      return;
    }
  } catch {
    setWebValue(key, value);
    return;
  }

  setWebValue(key, value);
}

export async function removePlatformStorageItem(key: string): Promise<void> {
  const backend = await getBackend();

  try {
    if (backend === "tauri") {
      await removeTauriValue(key);
      return;
    }

    if (backend === "capacitor") {
      await removeCapacitorValue(key);
      return;
    }
  } catch {
    removeWebValue(key);
    return;
  }

  removeWebValue(key);
}

export async function migrateWebStorageItemToNative(key: string): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  const backend = await getBackend();
  if (backend === "web") {
    return;
  }

  const nativeValue = await getPlatformStorageItem(key);
  if (nativeValue) {
    return;
  }

  const webValue = getWebValue(key);
  if (webValue) {
    await setPlatformStorageItem(key, webValue);
  }
}
