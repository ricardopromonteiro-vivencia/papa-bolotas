/**
 * Encaminhamento da impressão:
 * - Talões de um pedido (cliente + cozinha):
 *     duas impressoras ligadas → um talão em cada
 *     uma impressora ligada    → os dois seguidos nessa, com corte entre eles
 *     nenhuma                  → janela de impressão do browser (um talão por página)
 * - Outros documentos (relatório, recibo de cancelamento, reimpressão):
 *     impressora do cliente → senão a da cozinha → senão o browser
 */

import { Order } from '@/types';
import { printers } from './thermal-printer';
import {
  Ticket,
  TicketBlock,
  buildCustomerTicket,
  buildKitchenTicket,
  buildKitchenCancellationTicket,
  textTicket,
} from './ticket';
import { LOGO_URL } from './escpos-image';

export type PrintMethod = 'thermal' | 'browser';

export interface PrintOutcome {
  method: PrintMethod;
  /** Aviso a mostrar ao utilizador (por ex. uma das impressoras falhou) */
  note?: string;
}

/** Imprime os talões do cliente e da cozinha de um pedido acabado de registar. */
export async function printOrderTickets(order: Order): Promise<PrintOutcome> {
  const customerTicket = buildCustomerTicket(order);
  const kitchenTicket = buildKitchenTicket(order);
  const customer = printers.customer;
  const kitchen = printers.kitchen;

  if (customer.isConnected() && kitchen.isConnected()) {
    const [c, k] = await Promise.allSettled([
      customer.printTickets([customerTicket]),
      kitchen.printTickets([kitchenTicket]),
    ]);
    if (c.status === 'fulfilled' && k.status === 'fulfilled') return { method: 'thermal' };
    // Uma falhou: tenta imprimir esse talão na outra impressora
    if (c.status === 'fulfilled') {
      await customer.printTickets([kitchenTicket]);
      return { method: 'thermal', note: 'A impressora da cozinha falhou: o talão da cozinha saiu na do cliente.' };
    }
    if (k.status === 'fulfilled') {
      await kitchen.printTickets([customerTicket]);
      return { method: 'thermal', note: 'A impressora do cliente falhou: o talão do cliente saiu na da cozinha.' };
    }
    throw (c as PromiseRejectedResult).reason;
  }

  const only = customer.isConnected() ? customer : kitchen.isConnected() ? kitchen : null;
  if (only) {
    await only.printTickets([customerTicket, kitchenTicket]);
    return { method: 'thermal' };
  }

  printTicketsViaBrowser([customerTicket, kitchenTicket], customerTicket.title);
  return { method: 'browser' };
}

/** Avisa a cozinha de um pedido cancelado: impressora da cozinha, senão a do cliente, senão o browser. */
export async function printKitchenCancellation(order: Order): Promise<PrintMethod> {
  const ticket = buildKitchenCancellationTicket(order);
  const target = printers.kitchen.isConnected()
    ? printers.kitchen
    : printers.customer.isConnected()
    ? printers.customer
    : null;
  if (target) {
    await target.printTickets([ticket]);
    return 'thermal';
  }
  printTicketsViaBrowser([ticket], ticket.title);
  return 'browser';
}

/** Imprime talões na impressora do cliente, senão na da cozinha, senão no browser. */
export async function printTickets(tickets: Ticket[], title = tickets[0]?.title ?? 'Recibo'): Promise<PrintMethod> {
  const target = printers.customer.isConnected()
    ? printers.customer
    : printers.kitchen.isConnected()
    ? printers.kitchen
    : null;
  if (target) {
    await target.printTickets(tickets);
    return 'thermal';
  }
  printTicketsViaBrowser(tickets, title);
  return 'browser';
}

/** Imprime texto já formatado (relatórios, recibos de cancelamento). */
export function printReceipt(receiptText: string, title = 'Recibo'): Promise<PrintMethod> {
  return printTickets([textTicket(receiptText, title)], title);
}

// ── Impressão pelo browser ──

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function blockHtml(block: TicketBlock, origin: string): string {
  if (block.kind === 'logo') {
    const fallback = block.fallbackText
      ? `<pre class="c b">${escapeHtml(block.fallbackText)}</pre>`
      : '';
    // Se o ficheiro do logo não existir, mostra o texto alternativo
    return `<div class="logo"><img src="${origin}${LOGO_URL}" alt="" onerror="this.parentNode.innerHTML=${escapeHtml(JSON.stringify(fallback))}"></div>`;
  }
  const cls = [block.align === 'center' ? 'c' : '', block.bold ? 'b' : '', block.size === 2 ? 'big' : '']
    .filter(Boolean)
    .join(' ');
  return `<pre class="${cls}">${escapeHtml(block.text)}</pre>`;
}

/** Abre a janela de impressão do browser só com os talões (um por página). */
export function printTicketsViaBrowser(tickets: Ticket[], title = 'Recibo'): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error('Não foi possível preparar a impressão');
  }

  const origin = window.location.origin;
  const body = tickets
    .map(t => `<section class="ticket">${t.blocks.map(b => blockHtml(b, origin)).join('')}</section>`)
    .join('');

  doc.open();
  doc.write(`<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 4mm; }
  body { margin: 0; font-family: 'Courier New', monospace; }
  .ticket { width: 32ch; font-size: 12px; }
  .ticket + .ticket { break-before: page; page-break-before: always; }
  pre { font-family: inherit; font-size: 1em; line-height: 1.3; white-space: pre-wrap; margin: 0; }
  .c { text-align: center; }
  .b { font-weight: bold; }
  .big { font-size: 2em; line-height: 1.2; margin: 0.15em 0; }
  .logo { text-align: center; margin-bottom: 0.4em; }
  /* Logo pequeno e só a preto e branco, como na impressora térmica */
  .logo img { width: 35%; max-width: 100px; filter: grayscale(1) contrast(4) brightness(1.15); }
</style>
</head>
<body>${body}</body>
</html>`);
  doc.close();

  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    win.addEventListener('afterprint', () => setTimeout(() => iframe.remove(), 1000), { once: true });
    win.focus();
    win.print();
    // Alguns browsers não disparam 'afterprint'; garante que o iframe é removido
    setTimeout(() => iframe.isConnected && iframe.remove(), 60000);
  };
  // Espera que as imagens (logo) carreguem ou falhem, no máximo 3 s, antes de abrir a janela de impressão
  const pending = Array.from(doc.images).filter(img => !img.complete);
  if (pending.length === 0) {
    doPrint();
  } else {
    let left = pending.length;
    const done = () => { if (--left === 0) setTimeout(doPrint, 50); };
    pending.forEach(img => {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
    setTimeout(doPrint, 3000);
  }
}
