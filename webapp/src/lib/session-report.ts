/**
 * Relatório de sessão (fecho de caixa): somatório por artigo e texto para impressão.
 *
 * O texto usa 32 colunas, como os recibos, para sair bem na impressora térmica
 * e também na impressão normal do browser.
 */

import { Order, Session } from '@/types';
import { TEXT_WIDTH, money, center, rule, wrap, line } from './ticket-text';

export interface ItemSummary {
  name: string;
  sold: number;
  offered: number;
  revenue: number;
}

export interface OrdersSummary {
  paid: Order[];
  offered: Order[];
  cancelled: Order[];
  revenue: number;
  items: ItemSummary[];
  totals: { sold: number; offered: number; revenue: number };
}

/** Soma os pedidos de uma sessão. Os pedidos cancelados não entram nas quantidades. */
export function summarizeOrders(orders: Order[]): OrdersSummary {
  const paid = orders.filter(o => !o.isCancelled && !o.isComplimentary);
  const offered = orders.filter(o => !o.isCancelled && o.isComplimentary);
  const cancelled = orders.filter(o => o.isCancelled);

  const map = new Map<string, ItemSummary>();
  for (const order of orders) {
    if (order.isCancelled) continue;
    for (const item of order.items) {
      const row = map.get(item.menuItemName) ?? { name: item.menuItemName, sold: 0, offered: 0, revenue: 0 };
      if (order.isComplimentary) {
        row.offered += item.quantity;
      } else {
        row.sold += item.quantity;
        row.revenue += item.subtotal;
      }
      map.set(item.menuItemName, row);
    }
  }

  const items = [...map.values()].sort(
    (a, b) => b.sold + b.offered - (a.sold + a.offered) || a.name.localeCompare(b.name, 'pt')
  );

  return {
    paid,
    offered,
    cancelled,
    revenue: paid.reduce((sum, o) => sum + o.total, 0),
    items,
    totals: items.reduce(
      (t, i) => ({ sold: t.sold + i.sold, offered: t.offered + i.offered, revenue: t.revenue + i.revenue }),
      { sold: 0, offered: 0, revenue: 0 }
    ),
  };
}

// ── Formatação de texto (32 colunas) ──

export const REPORT_WIDTH = TEXT_WIDTH;
const W = REPORT_WIDTH;

const signedMoney = (v: number) => (v > 0.005 ? '+' : '') + money(v);
const dateTime = (d: Date) =>
  new Date(d).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const hourMin = (d: Date) => new Date(d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

// Tabela de artigos: nome(16) + vendidos(4) + ofertas(4) + total(8) = 32
const NAME_W = 16;
function itemRow(name: string, sold: string, offered: string, total: string): string[] {
  const cols = sold.padStart(4) + offered.padStart(4) + total.padStart(8);
  if (name.length <= NAME_W) return [name.padEnd(NAME_W) + cols];
  // Nome comprido: nome inteiro em cima, números na linha de baixo
  return [...wrap(name, W), ' '.repeat(NAME_W) + cols];
}

/** Gera o relatório completo de uma sessão em texto de 32 colunas. */
export function buildSessionReportText(session: Session, orders: Order[]): string {
  const s = summarizeOrders(orders);
  const out: string[] = [];

  out.push(center('PAPA BOLOTAS'));
  out.push(rule('='));
  out.push(center(session.isActive ? 'RELATÓRIO PARCIAL' : 'RELATÓRIO DE FECHO DE CAIXA'));
  if (session.isActive) out.push(center('(sessão ainda aberta)'));
  out.push('');
  out.push(...line('Abertura:', dateTime(session.startedAt)));
  out.push(...line('Fecho:', session.endedAt ? dateTime(session.endedAt) : '—'));
  out.push(rule('-'));

  out.push(...line('Receita', money(s.revenue)));
  out.push(...line('Pedidos pagos', String(s.paid.length)));
  out.push(...line('Ofertas', String(s.offered.length)));
  out.push(...line('Cancelados', String(s.cancelled.length)));

  if (!session.isActive) {
    out.push(rule('-'));
    out.push(...line('Dinheiro esperado', session.expectedCash !== undefined ? money(session.expectedCash) : '—'));
    out.push(...line('Dinheiro contado', session.actualCash !== undefined ? money(session.actualCash) : '—'));
    out.push(...line('Diferença', session.discrepancy !== undefined ? signedMoney(session.discrepancy) : '—'));
  }

  out.push(rule('='));
  out.push('QUANTIDADES POR ARTIGO');
  out.push('');
  if (s.items.length === 0) {
    out.push('Nenhum artigo vendido.');
  } else {
    out.push(...itemRow('Artigo', 'Vend', 'Ofer', 'Total'));
    out.push(rule('-'));
    for (const i of s.items) {
      out.push(...itemRow(i.name, String(i.sold), String(i.offered), money(i.revenue)));
    }
    out.push(rule('-'));
    out.push(...itemRow('TOTAL', String(s.totals.sold), String(s.totals.offered), money(s.totals.revenue)));
  }
  out.push('(cancelados não incluídos)');

  out.push(rule('='));
  out.push(`PEDIDOS (${orders.length})`);
  if (orders.length === 0) {
    out.push('');
    out.push('Nenhum pedido registado.');
  }
  for (const order of orders) {
    const status = order.isCancelled ? 'CANCELADO' : order.isComplimentary ? 'OFERTA' : 'PAGO';
    out.push('');
    out.push(...line(`#${order.orderNumber} ${hourMin(order.createdAt)} ${status}`, money(order.total)));
    for (const item of order.items) {
      out.push(...line(` ${item.quantity}x ${item.menuItemName}`, money(item.subtotal), '    '));
    }
    if (order.observations) {
      out.push(...wrap(`Obs: ${order.observations}`, W - 1).map(l => ' ' + l));
    }
    if (order.isCancelled && order.cancelledAt) {
      out.push(` Cancelado às ${hourMin(order.cancelledAt)}`);
    }
  }

  out.push(rule('='));
  out.push(...line('Impresso em', dateTime(new Date())));
  out.push('');

  return out.join('\n');
}
