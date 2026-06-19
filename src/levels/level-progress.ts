import { DEBUG_START_LEVEL, TOTAL_LEVELS } from "../utils/constants";

const STORAGE_KEY = "f55-game:level";

function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= TOTAL_LEVELS;
}

export function loadSavedLevel(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 1;

    const level = Number.parseInt(raw, 10);
    return isValidLevel(level) ? level : 1;
  } catch {
    return 1;
  }
}

export function saveLevel(level: number): void {
  if (!isValidLevel(level)) return;

  try {
    localStorage.setItem(STORAGE_KEY, String(level));
  } catch {
    // Ignore private mode / quota errors.
  }
}

export function clearSavedLevel(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore private mode errors.
  }
}

/** Dev override wins; otherwise resume from localStorage. */
export function resolveStartLevel(): number {
  if (DEBUG_START_LEVEL !== 1) {
    return DEBUG_START_LEVEL;
  }
  return loadSavedLevel();
}
