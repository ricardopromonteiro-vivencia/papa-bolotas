import { describe, it, expect, vi } from 'vitest';
import { buildCustomerTicket, buildKitchenTicket, buildKitchenCancellationTicket } from './ticket';
import { renderTickets, PrinterSettings } from './thermal-printer';
import { TEXT_WIDTH } from './ticket-text';
import { Order } from '@/types';

// Sem ficheiro de logo nos testes: simula a falta do logo
vi.mock('./escpos-image', () => ({
  getLogoRaster: async () => null,
  PAPER_DOTS: { 58: 384, 80: 576 },
  LOGO_WIDTH_FRACTION: 0.35,
  LOGO_URL: '/logo.png',
}));

const order: Order = {
  id: 'o1',
  orderNumber: 12,
  sessionId: 's1',
  total: 18,
  isComplimentary: false,
  isCancelled: false,
  observations: 'Batatas bem passadas, sem sal, para a mesa do fundo',
  items: [
    { id: 'i1', orderId: 'o1', menuItemId: 'm1', menuItemName: 'Tábua Presunto e Enchidos', quantity: 1, unitPrice: 9, subtotal: 9 },
    { id: 'i2', orderId: 'o1', menuItemId: 'm2', menuItemName: 'Café', quantity: 2, unitPrice: 1, subtotal: 2 },
    { id: 'i3', orderId: 'o1', menuItemId: 'm3', menuItemName: 'Ovos Rotos', quantity: 1, unitPrice: 7, subtotal: 7 },
  ],
  createdAt: new Date('2026-11-21T12:30:00'),
  version: 1,
};

const settings: PrinterSettings = { baudRate: 9600, codepage: 'cp858', cutPaper: true, paperWidth: 58, printLogo: true };

const textOf = (t: ReturnType<typeof buildCustomerTicket>) =>
  t.blocks.filter(b => b.kind === 'text').map(b => (b as { text: string }).text).join('\n');

describe('talões', () => {
  it('o talão do cliente tem logo, número em grande ao centro, preços e total', () => {
    const t = buildCustomerTicket(order);
    expect(t.blocks[0]).toEqual({ kind: 'logo', fallbackText: 'PAPA BOLOTAS' });
    expect(t.blocks).toContainEqual({ kind: 'text', text: 'PEDIDO #12', align: 'center', size: 2, bold: true });
    expect(textOf(t)).toMatch(/2x Café\s+2,00€/);
    expect(textOf(t)).toMatch(/TOTAL\s+18,00€/);
  });

  it('o talão da cozinha tem o número em grande, artigos e observações, sem preços nem logo', () => {
    const t = buildKitchenTicket(order);
    expect(t.blocks.some(b => b.kind === 'logo')).toBe(false);
    expect(t.blocks).toContainEqual({ kind: 'text', text: 'PEDIDO #12', align: 'center', size: 2, bold: true });
    expect(textOf(t)).toContain('2 x Café');
    expect(textOf(t)).toContain('OBSERVAÇÕES:');
    expect(textOf(t)).not.toContain('€');
  });

  it('nenhuma linha passa da largura do papel (16 caracteres no tamanho grande)', () => {
    for (const t of [buildCustomerTicket(order), buildKitchenTicket(order)]) {
      for (const b of t.blocks) {
        if (b.kind !== 'text') continue;
        const max = b.size === 2 ? TEXT_WIDTH / 2 : TEXT_WIDTH;
        for (const l of b.text.split('\n')) expect(l.length).toBeLessThanOrEqual(max);
      }
    }
  });
});

describe('talão de cancelamento para a cozinha', () => {
  it('diz o número do pedido e CANCELADO em grande, com os artigos a não preparar', () => {
    const t = buildKitchenCancellationTicket({ ...order, isCancelled: true, cancelledAt: new Date('2026-11-21T12:40:00') });
    expect(t.blocks).toContainEqual({ kind: 'text', text: 'PEDIDO #12', align: 'center', size: 2, bold: true });
    expect(t.blocks).toContainEqual({ kind: 'text', text: 'CANCELADO', align: 'center', size: 2, bold: true });
    expect(textOf(t)).toContain('NÃO PREPARAR:');
    expect(textOf(t)).toContain('2 x Café');
    expect(textOf(t)).toMatch(/Cancelado às 12:40/);
    expect(textOf(t)).not.toContain('€');
  });
});

describe('renderTickets (ESC/POS)', () => {
  const count = (bytes: Uint8Array, seq: number[]) => {
    let n = 0;
    for (let i = 0; i + seq.length <= bytes.length; i++) if (seq.every((v, k) => bytes[i + k] === v)) n++;
    return n;
  };
  const CUT = [0x1d, 0x56, 0x42, 0x00];
  const BIG = [0x1d, 0x21, 0x11];

  it('dois talões seguidos levam um corte depois de cada um', async () => {
    const bytes = await renderTickets([buildCustomerTicket(order), buildKitchenTicket(order)], settings);
    expect(count(bytes, CUT)).toBe(2);
    expect(count(bytes, BIG)).toBe(2); // número do pedido em grande nos dois
  });

  it('sem corte ativo não envia o comando de corte', async () => {
    const bytes = await renderTickets([buildCustomerTicket(order), buildKitchenTicket(order)], { ...settings, cutPaper: false });
    expect(count(bytes, CUT)).toBe(0);
  });

  it('sem logo imprime o nome em texto', async () => {
    const bytes = await renderTickets([buildCustomerTicket(order)], settings);
    expect(new TextDecoder('latin1').decode(bytes)).toContain('PAPA BOLOTAS');
  });
});
