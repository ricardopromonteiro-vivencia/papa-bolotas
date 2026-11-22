import { describe, it, expect } from 'vitest';
import { buildSessionReportText, summarizeOrders, REPORT_WIDTH } from './session-report';
import { Order, Session } from '@/types';

const item = (name: string, quantity: number, unitPrice: number) => ({
  id: `${name}-${quantity}`,
  orderId: 'o',
  menuItemId: name,
  menuItemName: name,
  quantity,
  unitPrice,
  subtotal: quantity * unitPrice,
});

const order = (n: number, items: ReturnType<typeof item>[], extra: Partial<Order> = {}): Order => ({
  id: `order-${n}`,
  orderNumber: n,
  sessionId: 's1',
  total: items.reduce((s, i) => s + i.subtotal, 0),
  isComplimentary: false,
  isCancelled: false,
  items,
  createdAt: new Date('2026-11-21T10:56:00'),
  version: 1,
  ...extra,
});

const session: Session = {
  id: 's1',
  userId: 'u1',
  startedAt: new Date('2026-11-20T00:45:00'),
  endedAt: new Date('2026-11-21T11:02:00'),
  expectedCash: 10.5,
  actualCash: 10,
  discrepancy: -0.5,
  isActive: false,
  version: 1,
};

const orders: Order[] = [
  order(1, [item('Batatas c/ Cheddar', 1, 4.5), item('Café', 1, 1)], { isCancelled: true, cancelledAt: new Date('2026-11-21T11:01:00') }),
  order(2, [item('Café', 2, 1), item('Tábua Presunto e Enchidos', 1, 9)], { observations: 'Sem pão, mesa junto à janela do lado esquerdo' }),
  order(3, [item('Café', 1, 1)], { isComplimentary: true, total: 0 }),
];

describe('summarizeOrders', () => {
  it('separa vendidos e ofertas e ignora cancelados', () => {
    const s = summarizeOrders(orders);
    expect(s.paid).toHaveLength(1);
    expect(s.offered).toHaveLength(1);
    expect(s.cancelled).toHaveLength(1);
    expect(s.revenue).toBe(11);
    expect(s.items.find(i => i.name === 'Café')).toEqual({ name: 'Café', sold: 2, offered: 1, revenue: 2 });
    expect(s.items.find(i => i.name === 'Batatas c/ Cheddar')).toBeUndefined();
    expect(s.totals).toEqual({ sold: 3, offered: 1, revenue: 11 });
  });
});

describe('buildSessionReportText', () => {
  const text = buildSessionReportText(session, orders);
  const lines = text.split('\n');

  it(`nunca passa das ${REPORT_WIDTH} colunas`, () => {
    const tooLong = lines.filter(l => l.length > REPORT_WIDTH);
    expect(tooLong).toEqual([]);
  });

  it('inclui o resumo de caixa, as quantidades e todos os pedidos', () => {
    expect(text).toContain('RELATÓRIO DE FECHO DE CAIXA');
    expect(text).toMatch(/Dinheiro esperado\s+10,50€/);
    expect(text).toMatch(/Diferença\s+-0,50€/);
    expect(text).toMatch(/TOTAL\s+3\s+1\s+11,00€/);
    expect(text).toContain('#1');
    expect(text).toContain('CANCELADO');
    expect(text).toContain('OFERTA');
    expect(text).toContain('Obs: Sem pão');
  });

  it('marca a sessão aberta como relatório parcial, sem dados de caixa', () => {
    const open = buildSessionReportText({ ...session, isActive: true, endedAt: undefined }, orders);
    expect(open).toContain('RELATÓRIO PARCIAL');
    expect(open).not.toContain('Dinheiro esperado');
  });
});
