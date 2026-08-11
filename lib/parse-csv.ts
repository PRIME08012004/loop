export type ParsedFeedbackRow = {
  content: string;
  channel: string;
  createdAt: string;
};

export const MAX_ASK_CSV_ROWS = 300;

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsv(
  text: string,
  options: { maxRows?: number } = {},
): ParsedFeedbackRow[] {
  const maxRows = options.maxRows ?? Number.POSITIVE_INFINITY;
  const lines = text.split(/\r?\n/);
  const nonEmpty: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) nonEmpty.push(trimmed);
    // Stop reading far past the row cap so huge files stay snappy.
    if (Number.isFinite(maxRows) && nonEmpty.length > maxRows + 5) break;
  }
  if (!nonEmpty.length) return [];

  const hasHeader =
    nonEmpty[0].toLowerCase().includes("content") ||
    nonEmpty[0].toLowerCase().includes("feedback") ||
    nonEmpty[0].toLowerCase().includes("message") ||
    nonEmpty[0].toLowerCase().includes("channel");

  if (!text.includes(",") && !hasHeader) {
    return nonEmpty
      .slice(0, Number.isFinite(maxRows) ? maxRows : undefined)
      .map((content) => ({
        content,
        channel: "Pasted feedback",
        createdAt: new Date().toISOString(),
      }))
      .filter((item) => item.content);
  }

  const header = parseCsvLine(nonEmpty[0]).map((item) => item.toLowerCase());
  const contentIndex = header.findIndex(
    (item) =>
      item.includes("content") ||
      item.includes("feedback") ||
      item.includes("message") ||
      item.includes("comment") ||
      item.includes("text"),
  );
  const channelIndex = header.findIndex(
    (item) => item.includes("channel") || item.includes("source") || item.includes("type"),
  );
  const dateIndex = header.findIndex(
    (item) => item.includes("date") || item.includes("created") || item.includes("time"),
  );
  const rows = hasHeader && contentIndex >= 0 ? nonEmpty.slice(1) : nonEmpty;
  const parsed: ParsedFeedbackRow[] = [];

  for (const line of rows) {
    if (parsed.length >= maxRows) break;
    const cells = parseCsvLine(line);
    const content = cells[contentIndex >= 0 ? contentIndex : 0]?.replace(/^"|"$/g, "");
    if (!content) continue;
    const suppliedDate = cells[dateIndex];
    parsed.push({
      content,
      channel: cells[channelIndex]?.replace(/^"|"$/g, "") || "Pasted feedback",
      createdAt:
        suppliedDate && !Number.isNaN(Date.parse(suppliedDate))
          ? new Date(suppliedDate).toISOString()
          : new Date().toISOString(),
    });
  }

  return parsed;
}

export function buildFeedbackContext(rows: ParsedFeedbackRow[], maxChars = 12000) {
  let context = "";
  let used = 0;

  for (const item of rows) {
    const line = `[${item.createdAt.slice(0, 10)}] ${item.channel}: ${item.content}\n`;
    if (used + line.length > maxChars) break;
    context += line;
    used += line.length;
  }

  return context.trim() || "No feedback records were supplied.";
}
