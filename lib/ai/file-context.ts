/**
 * Keep uploaded file payloads under OpenRouter free-tier prompt budgets.
 * ~4 chars ≈ 1 token for English text; leave headroom for system prompt + completion.
 * PDFs are never sent to the model — LOOP builds download PDFs locally from structured data.
 */
export const MAX_TEXT_CONTEXT_CHARS = 36_000;

export type PreparedFileContext = {
  content: Array<{ type: string; text?: string }>;
  truncated: boolean;
  originalChars: number;
  sentChars: number;
  note: string | null;
};

function sampleTextForModel(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) {
    return { text, truncated: false };
  }

  const lines = text.split(/\r?\n/);
  if (lines.length <= 3) {
    const head = Math.floor(maxChars * 0.7);
    const tail = maxChars - head - 80;
    return {
      text: `${text.slice(0, head)}\n\n[…truncated middle…]\n\n${text.slice(-Math.max(tail, 0))}`,
      truncated: true,
    };
  }

  const header = lines[0];
  const body = lines.slice(1).filter((line) => line.trim());
  const budget = maxChars - header.length - 120;
  const selected: string[] = [];
  let used = 0;

  const takeIndexes = new Set<number>();
  const targetRows = Math.min(body.length, 400);
  if (body.length <= targetRows) {
    for (let i = 0; i < body.length; i += 1) takeIndexes.add(i);
  } else {
    const thirds = Math.floor(targetRows / 3);
    for (let i = 0; i < thirds; i += 1) takeIndexes.add(i);
    const midStart = Math.floor(body.length / 2) - Math.floor(thirds / 2);
    for (let i = 0; i < thirds; i += 1) takeIndexes.add(Math.min(body.length - 1, midStart + i));
    for (let i = body.length - thirds; i < body.length; i += 1) takeIndexes.add(i);
  }

  const ordered = [...takeIndexes].sort((a, b) => a - b);
  for (const index of ordered) {
    const line = body[index];
    if (!line) continue;
    const cost = line.length + 1;
    if (used + cost > budget) break;
    selected.push(line);
    used += cost;
  }

  return {
    text: [
      header,
      ...selected,
      "",
      `[TRUNCATED: showing ${selected.length} of ${body.length} data rows to fit the model context limit.]`,
    ].join("\n"),
    truncated: true,
  };
}

export function prepareFileContextForModel(input: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  prompt: string;
}): PreparedFileContext | { error: string } {
  const { fileName, mimeType, buffer, prompt } = input;
  const lowerName = fileName.toLowerCase();
  const isPdf = mimeType === "application/pdf" || lowerName.endsWith(".pdf");

  if (isPdf) {
    return {
      error:
        "PDF uploads are not sent to the AI. Upload CSV, TXT, or Markdown feedback instead — then download a PDF that LOOP builds from the generated report data.",
    };
  }

  const original = buffer.toString("utf8");
  const sampled = sampleTextForModel(original, MAX_TEXT_CONTEXT_CHARS);
  const note = sampled.truncated
    ? `Source was truncated to ~${MAX_TEXT_CONTEXT_CHARS.toLocaleString()} characters for the model context limit.`
    : null;

  return {
    content: [
      {
        type: "text",
        text: `${prompt}\n\nSource file: ${fileName}${note ? `\n${note}` : ""}\n<source>\n${sampled.text}\n</source>`,
      },
    ],
    truncated: sampled.truncated,
    originalChars: original.length,
    sentChars: sampled.text.length,
    note,
  };
}

export function isPromptLimitError(message?: string) {
  const normalized = message?.toLowerCase() ?? "";
  return (
    normalized.includes("prompt tokens limit exceeded") ||
    normalized.includes("context length") ||
    normalized.includes("maximum context") ||
    normalized.includes("too many tokens")
  );
}

export function promptLimitUserMessage() {
  return "This file is too large for the current AI context limit. Try a smaller CSV/TXT excerpt (roughly under 40–50 KB of text), or split the export and generate multiple reports.";
}
