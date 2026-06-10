// Escapes a value for safe inclusion in a CSV row.
export function csvEscape(value: unknown): string {
  const s = value !== undefined && value !== null ? String(value) : "";
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    const noNewlines = s.replace(/\r?\n|\r/g, " ");
    const escapedQuotes = noNewlines.replace(/"/g, '""');
    return `"${escapedQuotes}"`;
  }
  return s;
}
