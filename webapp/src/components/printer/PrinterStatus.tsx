/**
 * Estado das impressoras (cliente e cozinha): quadro compacto na barra das Vendas + janela de detalhe.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  printers,
  autoReconnectPrinters,
  PrinterRole,
  PrinterState,
  Codepage,
  PaperWidth,
  ROLE_LABEL,
  TRANSPORT_LABEL,
} from '@/lib/thermal-printer';
import { buildTestTicket } from '@/lib/ticket';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Printer, Usb, Bluetooth, Cable, RefreshCw, Unplug } from 'lucide-react';
import { cn } from '@/lib/utils';

export function usePrinter(role: PrinterRole): PrinterState {
  return useSyncExternalStore(
    cb => printers[role].subscribe(cb),
    () => printers[role].getState()
  );
}

const BADGE: Record<PrinterState['connection'], { label: string; cls: string }> = {
  connected: { label: 'Ligada', cls: 'bg-green-100 text-green-800' },
  printing: { label: 'A imprimir', cls: 'bg-blue-100 text-blue-800' },
  connecting: { label: 'A ligar...', cls: 'bg-amber-100 text-amber-800' },
  disconnected: { label: 'Desligada', cls: 'bg-gray-100 text-gray-700' },
  error: { label: 'Erro', cls: 'bg-red-100 text-red-800' },
  unsupported: { label: 'Não suportado', cls: 'bg-gray-100 text-gray-700' },
};

const time = (d: Date) => d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
const isOn = (s: PrinterState) => s.connection === 'connected' || s.connection === 'printing';

function displayName(state: PrinterState) {
  return state.customName || state.deviceName || 'Nenhuma impressora';
}

function paperWarning(state: PrinterState): string | null {
  if (!state.paper) return null;
  if (state.paper.paperOut) return 'Sem papel';
  if (state.paper.coverOpen) return 'Tampa aberta';
  if (state.paper.paperNearEnd) return 'Papel a acabar';
  return null;
}

/** Como os talões vão sair, conforme as impressoras ligadas. */
function routingText(customer: PrinterState, kitchen: PrinterState) {
  if (isOn(customer) && isOn(kitchen)) return 'Talão do cliente na impressora do cliente e talão da cozinha na da cozinha.';
  if (isOn(customer) || isOn(kitchen)) {
    const which = isOn(customer) ? 'do cliente' : 'da cozinha';
    return `Só a impressora ${which} está ligada: os dois talões saem seguidos nela, com corte entre eles.`;
  }
  return 'Nenhuma impressora ligada: os talões abrem na janela de impressão do browser.';
}

function StatusLine({ state }: { state: PrinterState }) {
  const badge = BADGE[state.connection];
  const warning = paperWarning(state);
  return (
    <div className="flex items-center gap-2 min-w-0 text-xs">
      <span className="w-14 shrink-0 text-gray-600">{ROLE_LABEL[state.role]}</span>
      <span className={cn('px-1.5 py-0.5 rounded font-medium whitespace-nowrap', badge.cls)}>{badge.label}</span>
      <span className={cn('truncate', warning ? 'text-red-700 font-medium' : 'text-gray-500')}>
        {warning ?? (isOn(state) ? displayName(state) : '')}
      </span>
    </div>
  );
}

/** Quadro compacto com o estado das duas impressoras; abre a janela de detalhe ao clicar. */
export function PrinterStatusCard({ className }: { className?: string }) {
  const customer = usePrinter('customer');
  const kitchen = usePrinter('kitchen');
  const [open, setOpen] = useState(false);
  const warning = paperWarning(customer) || paperWarning(kitchen);
  const anyOn = isOn(customer) || isOn(kitchen);

  // Liga automaticamente às impressoras autorizadas da última vez
  useEffect(() => {
    autoReconnectPrinters();
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-start gap-3 rounded-lg border bg-white px-3 py-2 text-left shadow-sm hover:bg-gray-50 transition-colors min-w-0',
          warning && 'border-red-300',
          className
        )}
        title="Estado das impressoras"
      >
        <Printer className={cn('h-5 w-5 mt-0.5 shrink-0', anyOn ? 'text-green-600' : 'text-gray-500')} />
        <div className="min-w-0 flex-1 space-y-1">
          <span className="text-sm font-medium">Impressoras</span>
          <StatusLine state={customer} />
          <StatusLine state={kitchen} />
        </div>
      </button>
      <PrinterDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm border-b last:border-b-0">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-right">{children}</span>
    </div>
  );
}

export function PrinterDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const customer = usePrinter('customer');
  const kitchen = usePrinter('kitchen');
  const unsupported = customer.connection === 'unsupported';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" /> Impressoras
          </DialogTitle>
          <DialogDescription>
            Ligação direta às impressoras térmicas. Com uma impressora ligada, os talões imprimem sem janela de
            impressão.
          </DialogDescription>
        </DialogHeader>

        {unsupported ? (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
            Este browser não permite ligar impressoras diretamente. Use o <strong>Chrome</strong> ou o{' '}
            <strong>Edge</strong> (no computador ou num tablet Android). No iPad não é possível. Até lá, os
            talões usam a janela de impressão do browser.
          </div>
        ) : (
          <>
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
              {routingText(customer, kitchen)}
            </div>

            <Tabs defaultValue="customer">
              <TabsList className="grid grid-cols-2 w-full">
                {(['customer', 'kitchen'] as const).map(role => {
                  const s = role === 'customer' ? customer : kitchen;
                  return (
                    <TabsTrigger key={role} value={role} className="gap-2">
                      {ROLE_LABEL[role]}
                      <span className={cn('h-2 w-2 rounded-full', isOn(s) ? 'bg-green-500' : 'bg-gray-300')} />
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <TabsContent value="customer">
                <PrinterPanel role="customer" open={open} />
              </TabsContent>
              <TabsContent value="kitchen">
                <PrinterPanel role="kitchen" open={open} />
              </TabsContent>
            </Tabs>

            <details className="rounded-md border p-3 text-sm">
              <summary className="cursor-pointer font-medium">Que ligação escolher?</summary>
              <ul className="mt-2 space-y-1.5 text-gray-700 list-disc pl-5">
                <li>
                  <strong>Tablet Android:</strong> use o Chrome e ligue as duas impressoras com{' '}
                  <strong>Bluetooth</strong>. As impressoras têm de suportar Bluetooth LE (a maioria das
                  impressoras Bluetooth de talões suporta).
                </li>
                <li>
                  <strong>Computador:</strong> a impressora USB com <strong>Porta série</strong> (se aparecer como
                  porta COM) ou <strong>USB</strong>; a impressora Bluetooth com <strong>Bluetooth</strong> ou, se
                  não aparecer, emparelhe-a no Windows e use <strong>Porta série</strong>.
                </li>
                <li>
                  No Windows, uma impressora USB instalada como impressora normal não fica disponível em
                  <strong> USB</strong>; é preciso o driver WinUSB (por exemplo com o Zadig), e ela deixa de
                  imprimir pelos outros programas.
                </li>
                <li>
                  As impressoras ficam lembradas neste aparelho e voltam a ligar sozinhas quando abrir a app. No
                  Bluetooth, alguns browsers pedem para voltar a escolher a impressora depois de reiniciar.
                </li>
              </ul>
            </details>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PrinterPanel({ role, open }: { role: PrinterRole; open: boolean }) {
  const state = usePrinter(role);
  const printer = printers[role];
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState(state.customName);
  const connected = isOn(state);

  useEffect(() => {
    if (open) {
      setName(state.customName);
      setMessage(null);
      if (connected) printer.checkStatus().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const run = async (key: string, task: () => Promise<unknown>, okMessage?: string) => {
    setBusy(key);
    setMessage(null);
    try {
      await task();
      if (okMessage) setMessage(okMessage);
    } catch (err) {
      const e = err as Error;
      // O utilizador fechou a janela de escolha do aparelho: não é um erro
      if (e?.name !== 'NotFoundError') setMessage(e?.message || 'Ocorreu um erro');
    } finally {
      setBusy(null);
    }
  };

  const paper = state.paper;
  const paperText = !connected
    ? '—'
    : !paper
    ? 'A verificar...'
    : paper.paperOut === null
    ? 'Não disponível (a impressora não responde)'
    : paper.paperOut
    ? 'Sem papel'
    : paper.paperNearEnd
    ? 'A acabar'
    : 'OK';

  return (
    <div className="space-y-3 pt-2">
      {/* Estado */}
      <div className="rounded-md border px-3">
        <Row label="Estado">
          <span className={cn('px-2 py-0.5 rounded text-xs', BADGE[state.connection].cls)}>
            {BADGE[state.connection].label}
          </span>
        </Row>
        <Row label="Nome">{displayName(state)}</Row>
        {state.customName && state.deviceName && <Row label="Aparelho">{state.deviceName}</Row>}
        <Row label="Ligação">{state.transport ? TRANSPORT_LABEL[state.transport] : '—'}</Row>
        <Row label="Papel">
          <span className={cn(paper?.paperOut && 'text-red-700', paper?.paperNearEnd && !paper.paperOut && 'text-amber-700')}>
            {paperText}
          </span>
        </Row>
        {connected && paper && paper.coverOpen !== null && (
          <Row label="Tampa">
            <span className={cn(paper.coverOpen && 'text-red-700')}>{paper.coverOpen ? 'Aberta' : 'Fechada'}</span>
          </Row>
        )}
        <Row label="Último envio">
          {state.lastPrint
            ? `${time(state.lastPrint.at)} — ${state.lastPrint.ok ? 'impresso' : `falhou (${state.lastPrint.message})`}`
            : '—'}
        </Row>
      </div>

      {(state.error || message) && (
        <div className="rounded-md bg-gray-50 border p-3 text-sm text-gray-800">{message ?? state.error}</div>
      )}

      {/* Ações */}
      {connected ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button
            onClick={() =>
              run(
                'test',
                () => printer.printTickets([buildTestTicket(ROLE_LABEL[role], role === 'customer' && state.settings.printLogo)]),
                'Página de teste enviada.'
              )
            }
            disabled={!!busy}
          >
            {busy === 'test' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            Imprimir teste
          </Button>
          <Button variant="outline" onClick={() => run('status', () => printer.checkStatus())} disabled={!!busy}>
            <RefreshCw className={cn('h-4 w-4 mr-2', busy === 'status' && 'animate-spin')} />
            Verificar
          </Button>
          <Button variant="outline" onClick={() => run('off', () => printer.disconnect())} disabled={!!busy}>
            <Unplug className="h-4 w-4 mr-2" /> Desligar
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {state.supportsBluetooth && (
            <Button onClick={() => run('ble', () => printer.connectBluetooth())} disabled={!!busy}>
              {busy === 'ble' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bluetooth className="h-4 w-4 mr-2" />}
              Bluetooth
            </Button>
          )}
          {state.supportsSerial && (
            <Button variant="outline" onClick={() => run('serial', () => printer.connectSerial())} disabled={!!busy}>
              {busy === 'serial' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Cable className="h-4 w-4 mr-2" />}
              Porta série
            </Button>
          )}
          {state.supportsUsb && (
            <Button variant="outline" onClick={() => run('usb', () => printer.connectUsb())} disabled={!!busy}>
              {busy === 'usb' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Usb className="h-4 w-4 mr-2" />}
              USB
            </Button>
          )}
        </div>
      )}

      {/* Definições */}
      <details className="rounded-md border p-3 text-sm">
        <summary className="cursor-pointer font-medium">Definições</summary>
        <div className="mt-3 space-y-3">
          <div className="space-y-1">
            <Label htmlFor={`printer-name-${role}`}>Nome a mostrar</Label>
            <Input
              id={`printer-name-${role}`}
              value={name}
              placeholder={role === 'customer' ? 'ex: Impressora do balcão' : 'ex: Impressora da cozinha'}
              onChange={e => setName(e.target.value)}
              onBlur={() => printer.setCustomName(name)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`printer-codepage-${role}`}>Caracteres</Label>
              <select
                id={`printer-codepage-${role}`}
                className="w-full h-10 rounded-md border px-2 bg-white"
                value={state.settings.codepage}
                onChange={e => printer.updateSettings({ codepage: e.target.value as Codepage })}
              >
                <option value="cp858">Acentos e € (CP858)</option>
                <option value="cp850">Acentos, € como "E" (CP850)</option>
                <option value="ascii">Sem acentos</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`printer-paper-${role}`}>Largura do papel</Label>
              <select
                id={`printer-paper-${role}`}
                className="w-full h-10 rounded-md border px-2 bg-white"
                value={state.settings.paperWidth}
                onChange={e => printer.updateSettings({ paperWidth: Number(e.target.value) as PaperWidth })}
              >
                <option value={58}>58 mm</option>
                <option value={80}>80 mm</option>
              </select>
            </div>
            {state.supportsSerial && (
              <div className="space-y-1">
                <Label htmlFor={`printer-baud-${role}`}>Velocidade (porta série)</Label>
                <select
                  id={`printer-baud-${role}`}
                  className="w-full h-10 rounded-md border px-2 bg-white"
                  value={state.settings.baudRate}
                  onChange={e => run('baud', () => printer.updateSettings({ baudRate: Number(e.target.value) }))}
                >
                  {[9600, 19200, 38400, 57600, 115200].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={state.settings.cutPaper}
              onChange={e => printer.updateSettings({ cutPaper: e.target.checked })}
            />
            Cortar o papel no fim de cada talão
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={state.settings.printLogo}
              onChange={e => printer.updateSettings({ printLogo: e.target.checked })}
            />
            Imprimir o logo no talão do cliente{role === 'kitchen' ? ' (quando sai nesta impressora)' : ''}
          </label>

          <p className="text-xs text-gray-500">
            Se o teste mostrar símbolos estranhos em vez dos acentos, experimente outra opção em "Caracteres". Se não
            sair nada pela porta série, experimente outra velocidade.
          </p>
        </div>
      </details>
    </div>
  );
}
