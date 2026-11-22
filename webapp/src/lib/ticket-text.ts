/**
 * Formatação de texto para talões e relatórios de 32 colunas (impressora térmica de 58 mm).
 */

export const TEXT_WIDTH = 32;
const W = TEXT_WIDTH;

export const money = (v: number) => `${v.toFixed(2).replace('.', ',')}€`;

export const center = (s: string, width = W) => {
  const t = s.slice(0, width);
  return ' '.repeat(Math.floor((width - t.length) / 2)) + t;
};

export const rule = (ch: string, width = W) => ch.repeat(width);

/** Divide o texto em linhas de no máximo `width` caracteres, cortando nos espaços. */
export function wrap(text: string, width = W): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (word.length > width) {
      if (current) lines.push(current);
      for (let i = 0; i < word.length; i += width) lines.push(word.slice(i, i + width));
      current = lines.pop() ?? '';
      continue;
    }
    if (!current) current = word;
    else if (current.length + 1 + word.length <= width) current += ' ' + word;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

/** Texto à esquerda e valor à direita; se não couber, o texto passa para as linhas de cima. */
export function line(left: string, right = '', indent = '', width = W): string[] {
  const room = width - right.length - (right ? 1 : 0);
  const parts = wrap(left, Math.max(room - indent.length, 8)).map((p, i) => (i === 0 ? p : indent + p));
  const last = parts.pop()!;
  if (last.length > room) return [...parts, last, right.padStart(width)];
  return [...parts, last + right.padStart(width - last.length)];
}
