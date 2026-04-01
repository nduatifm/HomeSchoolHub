export function slugify(text: string, id: number): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60); // cap base at 60 chars so URLs stay readable in browser bars
  return base;
}
