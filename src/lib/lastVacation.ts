const LAST_VACATION_KEY = "expense-tracker:last-vacation";

export function getLastVacationId(): string | null {
  try {
    return localStorage.getItem(LAST_VACATION_KEY);
  } catch {
    return null;
  }
}

export function setLastVacationId(id: string): void {
  try {
    localStorage.setItem(LAST_VACATION_KEY, id);
  } catch {
    // Remembering the last vacation is optional when storage is unavailable.
  }
}
