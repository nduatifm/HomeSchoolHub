const SESSION_KEY = "lyra_nav_count";

function read(): number {
  try {
    return parseInt(sessionStorage.getItem(SESSION_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function write(n: number): void {
  try {
    sessionStorage.setItem(SESSION_KEY, String(n));
  } catch {
    // ignore (private browsing / storage blocked)
  }
}

export function incrementNavCount(): void {
  write(read() + 1);
}

export function getNavCount(): number {
  return read();
}
