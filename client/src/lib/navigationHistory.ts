let inAppNavCount = 0;

export function incrementNavCount(): void {
  inAppNavCount++;
}

export function getNavCount(): number {
  return inAppNavCount;
}
