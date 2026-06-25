/** Parse a `{ ids: number[] }` reorder body; returns null if invalid. */
export async function parseIds(req: Request): Promise<number[] | null> {
  let body: { ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return null;
  }
  if (!Array.isArray(body.ids) || body.ids.length === 0) return null;
  const ids = body.ids.map(Number);
  if (ids.some((n) => !Number.isInteger(n))) return null;
  return ids;
}
