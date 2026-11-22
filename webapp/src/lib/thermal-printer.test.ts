import { describe, it, expect } from 'vitest';
import { encodeText } from './thermal-printer';

describe('encodeText (ESC/POS)', () => {
  it('mantém ASCII sem alterações', () => {
    expect(Array.from(encodeText('Total: 5,50', 'cp858'))).toEqual(Array.from(new TextEncoder().encode('Total: 5,50')));
  });

  it('converte acentos portugueses para CP850/CP858', () => {
    expect(Array.from(encodeText('éãõçÇÃÕÉ', 'cp858'))).toEqual([0x82, 0xc6, 0xe4, 0x87, 0x80, 0xc7, 0xe5, 0x90]);
    expect(Array.from(encodeText('áàâêíóôú', 'cp850'))).toEqual([0xa0, 0x85, 0x83, 0x88, 0xa1, 0xa2, 0x93, 0xa3]);
  });

  it('codifica o € em 0xD5 no CP858 e como "E" nas outras páginas', () => {
    expect(Array.from(encodeText('€', 'cp858'))).toEqual([0xd5]);
    expect(Array.from(encodeText('€', 'cp850'))).toEqual([0x45]);
    expect(Array.from(encodeText('€', 'ascii'))).toEqual([0x45]);
  });

  it('retira os acentos no modo ASCII', () => {
    expect(new TextDecoder().decode(encodeText('ANULAÇÃO Observações', 'ascii'))).toBe('ANULACAO Observacoes');
  });

  it('usa 1 byte por caractere para não desalinhar as colunas do recibo', () => {
    const line = 'Água (Lisa)'.padEnd(26) + '1,00€';
    expect(encodeText(line, 'cp858').length).toBe(line.length);
    expect(encodeText(line, 'ascii').length).toBe(line.length);
  });

  it('converte quebras de linha do Windows', () => {
    expect(Array.from(encodeText('a\r\nb', 'cp858'))).toEqual([0x61, 0x0a, 0x62]);
  });
});
