/**
 * Talões: um documento simples (blocos) que pode ser impresso na impressora térmica (ESC/POS)
 * ou na janela de impressão do browser.
 *
 * - Talão do cliente: logo, número do pedido em grande, artigos com preços e total.
 * - Talão da cozinha: número do pedido em grande, artigos e observações, sem preços.
 */

import { Order } from '@/types';
import { TEXT_WIDTH, money, line, wrap, rule } from './ticket-text';

export type TicketBlock =
  /** Logo do Papa Bolotas; se não houver ficheiro de logo, imprime `fallbackText` */
  | { kind: 'logo'; fallbackText?: string }
  /** size 2 = altura e largura a dobrar (cabem 16 caracteres por linha) */
  | { kind: 'text'; text: string; align?: 'left' | 'center'; size?: 1 | 2; bold?: boolean };

export interface Ticket {
  title: string;
  blocks: TicketBlock[];
}

const W = TEXT_WIDTH;

const dateTime = (d: Date) =>
  new Date(d).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const hourMin = (d: Date) => new Date(d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

/** Talão com texto já formatado (recibos de cancelamento, relatórios). */
export function textTicket(text: string, title = 'Recibo'): Ticket {
  return { title, blocks: [{ kind: 'text', text }] };
}

export function buildCustomerTicket(order: Order): Ticket {
  const items = order.items.flatMap(i => line(`${i.quantity}x ${i.menuItemName}`, money(i.subtotal), '   '));
  const blocks: TicketBlock[] = [
    { kind: 'logo', fallbackText: 'PAPA BOLOTAS' },
    { kind: 'text', text: `PEDIDO #${order.orderNumber}`, align: 'center', size: 2, bold: true },
    { kind: 'text', text: dateTime(order.createdAt), align: 'center' },
    { kind: 'text', text: [rule('-'), ...items, rule('-')].join('\n') },
    { kind: 'text', text: line('TOTAL', money(order.total)).join('\n'), bold: true },
  ];
  if (order.isComplimentary) {
    blocks.push({ kind: 'text', text: '*** OFERTA ***', align: 'center', bold: true });
  }
  if (order.observations?.trim()) {
    blocks.push({ kind: 'text', text: ['', 'Observações:', ...wrap(order.observations.trim(), W)].join('\n') });
  }
  blocks.push({ kind: 'text', text: '\nObrigado pela visita!', align: 'center' });
  return { title: `Pedido #${order.orderNumber} - cliente`, blocks };
}

export function buildKitchenTicket(order: Order): Ticket {
  const items = order.items.flatMap(i => wrap(`${i.quantity} x ${i.menuItemName}`, W).map((l, idx) => (idx ? '    ' + l : l)));
  const blocks: TicketBlock[] = [
    { kind: 'text', text: '*** COZINHA ***', align: 'center', bold: true },
    { kind: 'text', text: `PEDIDO #${order.orderNumber}`, align: 'center', size: 2, bold: true },
    { kind: 'text', text: hourMin(order.createdAt), align: 'center' },
    { kind: 'text', text: rule('-') },
    { kind: 'text', text: items.join('\n'), bold: true },
    { kind: 'text', text: rule('-') },
  ];
  if (order.observations?.trim()) {
    blocks.push({ kind: 'text', text: ['OBSERVAÇÕES:', ...wrap(order.observations.trim(), W)].join('\n'), bold: true });
  }
  return { title: `Pedido #${order.orderNumber} - cozinha`, blocks };
}

/** Talão para a cozinha a avisar que um pedido foi cancelado (o que não deve ser preparado). */
export function buildKitchenCancellationTicket(order: Order): Ticket {
  const items = order.items.flatMap(i => wrap(`${i.quantity} x ${i.menuItemName}`, W).map((l, idx) => (idx ? '    ' + l : l)));
  const cancelledAt = order.cancelledAt ?? new Date();
  const blocks: TicketBlock[] = [
    { kind: 'text', text: '*** COZINHA ***', align: 'center', bold: true },
    { kind: 'text', text: `PEDIDO #${order.orderNumber}`, align: 'center', size: 2, bold: true },
    { kind: 'text', text: 'CANCELADO', align: 'center', size: 2, bold: true },
    { kind: 'text', text: `Cancelado às ${hourMin(cancelledAt)}`, align: 'center' },
    { kind: 'text', text: [rule('-'), 'NÃO PREPARAR:'].join('\n'), bold: true },
  ];
  if (items.length > 0) blocks.push({ kind: 'text', text: items.join('\n'), bold: true });
  blocks.push({ kind: 'text', text: rule('-') });
  return { title: `Pedido #${order.orderNumber} - cancelado`, blocks };
}

/** Página de teste para confirmar acentos, €, tamanho grande e (no cliente) o logo. */
export function buildTestTicket(roleLabel: string, withLogo: boolean): Ticket {
  const blocks: TicketBlock[] = [];
  if (withLogo) blocks.push({ kind: 'logo', fallbackText: 'PAPA BOLOTAS' });
  blocks.push(
    { kind: 'text', text: 'TESTE', align: 'center', size: 2, bold: true },
    { kind: 'text', text: `Impressora: ${roleLabel}`, align: 'center' },
    { kind: 'text', text: new Date().toLocaleString('pt-PT'), align: 'center' },
    {
      kind: 'text',
      text: [
        rule('-'),
        'Acentos: á à â ã é ê í ó ô õ ú',
        'Cedilha: ç Ç   Maiúsc.: Ã Õ É',
        ...line('Preço:', '5,50€'),
        rule('-'),
      ].join('\n'),
    },
    { kind: 'text', text: 'Se vê acentos e o €,\na impressora está pronta.', align: 'center' }
  );
  return { title: `Teste - ${roleLabel}`, blocks };
}
