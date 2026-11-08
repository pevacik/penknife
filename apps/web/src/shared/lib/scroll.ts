const HOME_SCROLL_KEY = 'penknife:home-scroll';

export interface HomeScrollState {
  scrollY: number;
  page: number;
}

function getStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveHomeScroll(state: HomeScrollState): void {
  if (typeof window === 'undefined') {
    return;
  }

  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(HOME_SCROLL_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage может быть недоступен в приватном режиме.
  }
}

export function takeHomeScroll(): HomeScrollState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(HOME_SCROLL_KEY);
    storage.removeItem(HOME_SCROLL_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<HomeScrollState>;
    if (typeof parsed.scrollY !== 'number' || !Number.isFinite(parsed.scrollY)) {
      return null;
    }

    return {
      scrollY: Math.max(0, parsed.scrollY),
      page: typeof parsed.page === 'number' && Number.isFinite(parsed.page)
        ? Math.max(0, Math.floor(parsed.page))
        : 1,
    };
  } catch {
    storage.removeItem(HOME_SCROLL_KEY);
    return null;
  }
}

export function clearHomeScroll(): void {
  if (typeof window === 'undefined') {
    return;
  }

  getStorage()?.removeItem(HOME_SCROLL_KEY);
}
