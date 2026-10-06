// Префикс basePath: на боевом домене — пусто, на GitHub Pages — "/shardekor".
// См. NEXT_PUBLIC_BASE_PATH в .github/workflows/deploy.yml.
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBase(path: string) {
  if (!BASE || !path.startsWith("/")) return path;
  if (path === BASE || path.startsWith(`${BASE}/`)) return path;
  return `${BASE}${path}`;
}
