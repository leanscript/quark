const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function quoteIdentifier(
  identifier: string,
  quotePart: (part: string) => string,
): string {
  return identifier
    .split('.')
    .map((part) => {
      if (!IDENTIFIER_PATTERN.test(part)) {
        throw new Error(`Invalid SQL identifier: ${identifier}`);
      }

      return quotePart(part);
    })
    .join('.');
}

export function quoteDouble(identifier: string): string {
  return quoteIdentifier(identifier, (part) => `"${part}"`);
}

export function quoteBacktick(identifier: string): string {
  return quoteIdentifier(identifier, (part) => `\`${part}\``);
}
