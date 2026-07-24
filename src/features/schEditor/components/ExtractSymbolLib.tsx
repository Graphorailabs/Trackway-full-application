




export const extractSymbolNames = (content: string): string[] => {
  // This regex matches: (symbol "SYMBOL_NAME"
  const regex = /\(symbol\s+"([^"]+)"/g;
  const symbolNames: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    symbolNames.push(match[1]);
  }

  return symbolNames;
};


/**
 * Extracts the full (symbol "NAME" ...) block from a KiCad .kicad_sym file
 * @param name The symbol name to find (e.g. "Fan" or "Fan_ALT")
 * @param content The full S-expression file text
 * @returns The full text of the matching symbol block, or null if not found
 */
export function extractSymbolByName(name: string, content: string): string | null {
  const startToken = `(symbol "${name}"`;
  const startIndex = content.indexOf(startToken);
  if (startIndex === -1) return null;

  let depth = 0;
  let endIndex = startIndex;
  let started = false;

  for (; endIndex < content.length; endIndex++) {
    const ch = content[endIndex];
    if (ch === '(') {
      depth++;
      started = true;
    } else if (ch === ')') {
      depth--;
      if (started && depth === 0) {
        endIndex++; // include the final ')'
        break;
      }
    }
  }

  return content.slice(startIndex, endIndex).trim();
}
