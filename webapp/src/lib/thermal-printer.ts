/**
 * Impressoras térmicas ESC/POS ligadas diretamente ao browser (Chrome/Edge).
 *
 * Há duas impressoras possíveis: a do cliente e a da cozinha. Cada uma pode estar ligada por:
 * - Bluetooth (Web Bluetooth / BLE): tablets Android e computadores; a maioria das impressoras
 *   Bluetooth baratas suporta BLE
 * - Porta série (Web Serial): impressoras USB que aparecem como porta COM e impressoras
 *   Bluetooth clássicas emparelhadas no Windows
 * - USB (WebUSB): impressoras USB com driver compatível (no Windows pode ser preciso o WinUSB)
 *
 * O estado "ligada/desligada" é real (eventos de ligação do browser).
 * O estado do papel/tampa usa o comando DLE EOT; nem todas as impressoras respondem.
 */

import type { Ticket } from './ticket';
import { getLogoRaster, PAPER_DOTS, LOGO_WIDTH_FRACTION } from './escpos-image';

// ── Tipos mínimos de Web Serial / WebUSB / Web Bluetooth (não fazem parte do lib.dom) ──

interface SerialPortInfo { usbVendorId?: number; usbProductId?: number; bluetoothServiceClassId?: number | string }
interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  getInfo(): SerialPortInfo;
  readonly writable: WritableStream<Uint8Array> | null;
  readonly readable: ReadableStream<Uint8Array> | null;
}
interface SerialLike extends EventTarget {
  requestPort(options?: { filters?: unknown[]; allowedBluetoothServiceClassIds?: string[] }): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
}
interface USBEndpointLike { endpointNumber: number; direction: 'in' | 'out'; type: 'bulk' | 'interrupt' | 'isochronous' }
interface USBInterfaceLike { interfaceNumber: number; alternate: { interfaceClass: number; endpoints: USBEndpointLike[] } }
interface USBDeviceLike {
  productName?: string;
  manufacturerName?: string;
  serialNumber?: string;
  vendorId: number;
  productId: number;
  opened: boolean;
  configuration: { interfaces: USBInterfaceLike[] } | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(value: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  releaseInterface(n: number): Promise<void>;
  transferOut(endpoint: number, data: BufferSource): Promise<{ status: string }>;
  transferIn(endpoint: number, length: number): Promise<{ status: string; data?: DataView }>;
}
interface USBLike extends EventTarget {
  requestDevice(options: { filters: unknown[] }): Promise<USBDeviceLike>;
  getDevices(): Promise<USBDeviceLike[]>;
}
interface BleCharacteristicLike {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValue(data: BufferSource): Promise<void>;
  writeValueWithoutResponse?(data: BufferSource): Promise<void>;
}
interface BleServiceLike { getCharacteristics(): Promise<BleCharacteristicLike[]> }
interface BleServerLike { connected: boolean; getPrimaryServices(): Promise<BleServiceLike[]>; disconnect(): void }
interface BleDeviceLike extends EventTarget {
  id: string;
  name?: string;
  gatt?: { connected: boolean; connect(): Promise<BleServerLike>; disconnect(): void };
}
interface BluetoothLike {
  requestDevice(options: { acceptAllDevices: boolean; optionalServices: string[] }): Promise<BleDeviceLike>;
  getDevices?(): Promise<BleDeviceLike[]>;
}
type DeviceNavigator = Navigator & { serial?: SerialLike; usb?: USBLike; bluetooth?: BluetoothLike };

// ── Estado público ──

export type PrinterRole = 'customer' | 'kitchen';
export const ROLE_LABEL: Record<PrinterRole, string> = { customer: 'Cliente', kitchen: 'Cozinha' };

export type PrinterTransport = 'serial' | 'usb' | 'bluetooth';
export const TRANSPORT_LABEL: Record<PrinterTransport, string> = {
  bluetooth: 'Bluetooth',
  serial: 'Porta série',
  usb: 'USB',
};

export type PrinterConnection = 'unsupported' | 'disconnected' | 'connecting' | 'connected' | 'printing' | 'error';
export type Codepage = 'cp858' | 'cp850' | 'ascii';
export type PaperWidth = 58 | 80;

export interface PaperStatus {
  /** null = a impressora não respondeu ao pedido de estado */
  paperOut: boolean | null;
  paperNearEnd: boolean | null;
  coverOpen: boolean | null;
  checkedAt: Date;
}

export interface PrinterSettings {
  baudRate: number;
  codepage: Codepage;
  cutPaper: boolean;
  paperWidth: PaperWidth;
  printLogo: boolean;
}

export interface PrinterState {
  role: PrinterRole;
  supportsSerial: boolean;
  supportsUsb: boolean;
  supportsBluetooth: boolean;
  connection: PrinterConnection;
  transport?: PrinterTransport;
  /** Nome do aparelho (USB/Bluetooth) ou descrição da porta (série) */
  deviceName?: string;
  /** Nome dado pelo utilizador nas definições */
  customName: string;
  error?: string;
  paper?: PaperStatus;
  lastPrint?: { at: Date; ok: boolean; message?: string };
  settings: PrinterSettings;
}

const DEFAULT_SETTINGS: PrinterSettings = { baudRate: 9600, codepage: 'cp858', cutPaper: true, paperWidth: 58, printLogo: true };

// localStorage pode não existir (testes) ou estar bloqueado (navegação privada): nunca rebentar
const storage = {
  get(key: string): string | null {
    try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
  },
  set(key: string, value: string) {
    try { globalThis.localStorage?.setItem(key, value); } catch { /* ignorar */ }
  },
  remove(key: string) {
    try { globalThis.localStorage?.removeItem(key); } catch { /* ignorar */ }
  },
};

// ── Codificação de texto para ESC/POS ──

// Caracteres latinos da página de código 850 (posições 0x80–0xFF) usados em português e afins
const CP850: Record<string, number> = {
  'Ç': 0x80, 'ü': 0x81, 'é': 0x82, 'â': 0x83, 'ä': 0x84, 'à': 0x85, 'å': 0x86, 'ç': 0x87,
  'ê': 0x88, 'ë': 0x89, 'è': 0x8a, 'ï': 0x8b, 'î': 0x8c, 'ì': 0x8d, 'Ä': 0x8e, 'Å': 0x8f,
  'É': 0x90, 'æ': 0x91, 'Æ': 0x92, 'ô': 0x93, 'ö': 0x94, 'ò': 0x95, 'û': 0x96, 'ù': 0x97,
  'ÿ': 0x98, 'Ö': 0x99, 'Ü': 0x9a, 'ø': 0x9b, '£': 0x9c, 'Ø': 0x9d, '×': 0x9e,
  'á': 0xa0, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3, 'ñ': 0xa4, 'Ñ': 0xa5, 'ª': 0xa6, 'º': 0xa7,
  '¿': 0xa8, '®': 0xa9, '½': 0xab, '¼': 0xac, '¡': 0xad, '«': 0xae, '»': 0xaf,
  'Á': 0xb5, 'Â': 0xb6, 'À': 0xb7, '©': 0xb8, 'ã': 0xc6, 'Ã': 0xc7,
  'Ê': 0xd2, 'Ë': 0xd3, 'È': 0xd4, 'Í': 0xd6, 'Î': 0xd7, 'Ï': 0xd8, 'Ì': 0xde,
  'Ó': 0xe0, 'ß': 0xe1, 'Ô': 0xe2, 'Ò': 0xe3, 'õ': 0xe4, 'Õ': 0xe5, 'µ': 0xe6,
  'Ú': 0xe9, 'Û': 0xea, 'Ù': 0xeb, '°': 0xf8,
};

// Comando ESC t n para escolher a página de código (numeração Epson)
const CODEPAGE_SELECT: Record<Codepage, number | null> = { cp858: 19, cp850: 2, ascii: null };

/** Converte texto Unicode para bytes da página de código escolhida (1 byte por caractere). */
export function encodeText(text: string, codepage: Codepage): Uint8Array {
  const out: number[] = [];
  for (const ch of text.replace(/\r\n/g, '\n')) {
    const code = ch.charCodeAt(0);
    if (code < 0x80) {
      out.push(code);
    } else if (ch === '€') {
      // CP858 tem o € em 0xD5; nas outras usa "E" para não desalinhar as colunas
      out.push(codepage === 'cp858' ? 0xd5 : 0x45);
    } else if (ch === '—' || ch === '–') {
      out.push(0x2d);
    } else if (codepage !== 'ascii' && CP850[ch] !== undefined) {
      out.push(CP850[ch]);
    } else {
      // Sem equivalente: retira o acento (ã → a) ou usa "?"
      const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      out.push(base.length === 1 && base.charCodeAt(0) < 0x80 ? base.charCodeAt(0) : 0x3f);
    }
  }
  return new Uint8Array(out);
}

const ESC = 0x1b, GS = 0x1d, DLE = 0x10, EOT = 0x04, LF = 0x0a;

/** Converte talões em bytes ESC/POS (cada talão termina com avanço e corte, se ativo). */
export async function renderTickets(tickets: Ticket[], settings: PrinterSettings): Promise<Uint8Array> {
  const out: number[] = [];
  const push = (bytes: ArrayLike<number>) => {
    for (let i = 0; i < bytes.length; i++) out.push(bytes[i]!);
  };
  const text = (t: string, align: 'left' | 'center' = 'left', size: 1 | 2 = 1, bold = false) => {
    push([ESC, 0x61, align === 'center' ? 1 : 0]); // ESC a — alinhamento
    push([ESC, 0x45, bold ? 1 : 0]); // ESC E — negrito
    push([GS, 0x21, size === 2 ? 0x11 : 0x00]); // GS ! — tamanho (largura e altura a dobrar)
    push(encodeText(t, settings.codepage));
    push([LF]);
    push([GS, 0x21, 0x00, ESC, 0x45, 0, ESC, 0x61, 0]);
  };

  push([ESC, 0x40]); // ESC @ — reinicia a impressora
  const cp = CODEPAGE_SELECT[settings.codepage];
  if (cp !== null) push([ESC, 0x74, cp]); // ESC t n

  for (const ticket of tickets) {
    for (const block of ticket.blocks) {
      if (block.kind === 'logo') {
        const raster = settings.printLogo
          ? await getLogoRaster(Math.round(PAPER_DOTS[settings.paperWidth] * LOGO_WIDTH_FRACTION))
          : null;
        if (raster) {
          push([ESC, 0x61, 1]);
          push(raster);
          push([ESC, 0x61, 0, LF]);
        } else if (block.fallbackText) {
          text(block.fallbackText, 'center', 1, true);
        }
      } else {
        text(block.text, block.align, block.size, block.bold);
      }
    }
    push([ESC, 0x64, 4]); // avança 4 linhas
    if (settings.cutPaper) push([GS, 0x56, 0x42, 0x00]); // GS V B 0 — corte parcial (ignorado sem guilhotina)
    else push(encodeText('- - - - - - - - - - - - - - - -\n\n', settings.codepage));
  }
  return new Uint8Array(out);
}

// Serviços BLE das impressoras térmicas mais comuns (o browser só deixa usar os que estão nesta lista)
const BLE_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
];
// Perfil de porta série Bluetooth (SPP), para a ligação por porta série a impressoras Bluetooth clássicas
const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb';

const hex4 = (n?: number) => (n === undefined ? '????' : n.toString(16).padStart(4, '0').toUpperCase());
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>(resolve => setTimeout(() => resolve(null), ms))]);
}

// Aparelhos em uso por qualquer uma das impressoras (o mesmo aparelho não pode ser cliente e cozinha)
const claimed = new Map<object, PrinterRole>();
// As religações automáticas correm uma de cada vez, para as duas impressoras não escolherem o mesmo aparelho
let reconnectChain: Promise<unknown> = Promise.resolve();

interface SavedDevice {
  transport: PrinterTransport;
  /** série: vendor:product:bt | usb: vendor:product:serial | bluetooth: id do aparelho */
  fingerprint: string;
  /** posição na lista de portas série autorizadas (desempata impressoras iguais) */
  index?: number;
}

type Listener = (state: PrinterState) => void;

class ThermalPrinter {
  private nav = (typeof navigator !== 'undefined' ? navigator : {}) as DeviceNavigator;
  private serialPort: SerialPortLike | null = null;
  private usbDevice: USBDeviceLike | null = null;
  private usbInterface = -1;
  private usbOut = -1;
  private usbIn = -1;
  private bleDevice: BleDeviceLike | null = null;
  private bleChar: BleCharacteristicLike | null = null;
  private bleChunk = 180;
  private bleWatched = new WeakSet<object>();
  private statusQueryUnsupported = false;
  private busy: Promise<unknown> = Promise.resolve();
  private listeners = new Set<Listener>();
  private state: PrinterState;

  constructor(public readonly role: PrinterRole) {
    const supportsSerial = !!this.nav.serial;
    const supportsUsb = !!this.nav.usb;
    const supportsBluetooth = !!this.nav.bluetooth;
    // O logo só existe no talão do cliente; fica ativo nas duas para o caso de só a da cozinha estar ligada
    let settings = { ...DEFAULT_SETTINGS };
    try {
      settings = { ...settings, ...JSON.parse(storage.get(this.key('settings')) || '{}') };
    } catch { /* definições inválidas: usa as predefinidas */ }

    this.state = {
      role,
      supportsSerial,
      supportsUsb,
      supportsBluetooth,
      connection: supportsSerial || supportsUsb || supportsBluetooth ? 'disconnected' : 'unsupported',
      customName: storage.get(this.key('name')) || '',
      settings,
    };

    this.nav.serial?.addEventListener('disconnect', (e: Event) => {
      if ((e.target as unknown) === this.serialPort) this.handleLost('A impressora foi desligada');
    });
    this.nav.usb?.addEventListener('disconnect', (e: Event) => {
      if ((e as Event & { device?: USBDeviceLike }).device === this.usbDevice) this.handleLost('A impressora foi desligada');
    });
    // Quando uma impressora volta a ser ligada, tenta religar automaticamente
    this.nav.serial?.addEventListener('connect', () => this.autoReconnect());
    this.nav.usb?.addEventListener('connect', () => this.autoReconnect());
  }

  private key(name: string) {
    return `papa-bolotas.printer.${this.role}.${name}`;
  }

  getState(): PrinterState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isConnected(): boolean {
    return this.state.connection === 'connected' || this.state.connection === 'printing';
  }

  private set(patch: Partial<PrinterState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(l => l(this.state));
  }

  private releaseClaims() {
    for (const dev of [this.serialPort, this.usbDevice, this.bleDevice]) if (dev) claimed.delete(dev);
  }

  private claim(device: object) {
    const owner = claimed.get(device);
    if (owner && owner !== this.role) {
      throw new Error(`Este aparelho já está ligado como impressora da ${ROLE_LABEL[owner].toLowerCase()}.`);
    }
    claimed.set(device, this.role);
  }

  private handleLost(message: string) {
    this.releaseClaims();
    this.serialPort = null;
    this.usbDevice = null;
    this.bleDevice = null;
    this.bleChar = null;
    this.set({ connection: 'disconnected', error: message, paper: undefined });
  }

  private saved(): SavedDevice | null {
    try {
      return JSON.parse(storage.get(this.key('device')) || 'null');
    } catch {
      return null;
    }
  }

  private save(device: SavedDevice) {
    storage.set(this.key('device'), JSON.stringify(device));
  }

  /** Tenta ligar ao aparelho já autorizado anteriormente (sem pedir ao utilizador). */
  autoReconnect(): Promise<void> {
    const run = async () => {
      if (this.isConnected() || this.state.connection === 'connecting') return;
      const saved = this.saved();
      if (!saved) return;
      try {
        if (saved.transport === 'serial' && this.nav.serial) {
          const ports = await this.nav.serial.getPorts();
          const free = ports.filter(p => !claimed.has(p) && serialFingerprint(p.getInfo()) === saved.fingerprint);
          const port = (saved.index !== undefined && free.find(p => ports.indexOf(p) === saved.index)) || free[0];
          if (port) await this.openSerial(port);
        } else if (saved.transport === 'usb' && this.nav.usb) {
          const devices = await this.nav.usb.getDevices();
          const device = devices.find(d => !claimed.has(d) && usbFingerprint(d) === saved.fingerprint);
          if (device) await this.openUsb(device);
        } else if (saved.transport === 'bluetooth' && this.nav.bluetooth?.getDevices) {
          const devices = await this.nav.bluetooth.getDevices();
          const device = devices.find(d => d.id === saved.fingerprint && !claimed.has(d));
          if (device) await this.openBluetooth(device);
        }
      } catch (err) {
        console.warn(`Printer (${this.role}) auto-reconnect failed:`, err);
      }
    };
    const next = reconnectChain.then(run, run);
    reconnectChain = next.catch(() => undefined);
    return next;
  }

  /** Bluetooth BLE (tablets Android e computadores). Tem de ser chamado num clique. */
  async connectBluetooth(): Promise<void> {
    if (!this.nav.bluetooth) throw new Error('Este browser não suporta Bluetooth. Use o Chrome ou o Edge.');
    const device = await this.nav.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BLE_SERVICES });
    await this.disconnect();
    await this.openBluetooth(device);
  }

  /** Porta série / Bluetooth clássico. Tem de ser chamado num clique. */
  async connectSerial(): Promise<void> {
    if (!this.nav.serial) throw new Error('Este browser não suporta portas série. Use o Chrome ou o Edge no computador.');
    const port = await this.nav.serial.requestPort({ allowedBluetoothServiceClassIds: [SPP_UUID] });
    await this.disconnect();
    await this.openSerial(port);
  }

  /** USB direto. Tem de ser chamado num clique. */
  async connectUsb(): Promise<void> {
    if (!this.nav.usb) throw new Error('Este browser não suporta USB. Use o Chrome ou o Edge.');
    const device = await this.nav.usb.requestDevice({ filters: [] });
    await this.disconnect();
    await this.openUsb(device);
  }

  private async openSerial(port: SerialPortLike) {
    this.claim(port);
    this.set({ connection: 'connecting', error: undefined });
    try {
      await port.open({ baudRate: this.state.settings.baudRate });
    } catch (err) {
      claimed.delete(port);
      // "already open" acontece se a porta ficou aberta noutro separador
      this.set({ connection: 'error', error: `Não foi possível abrir a porta: ${(err as Error).message}` });
      throw err;
    }
    this.serialPort = port;
    this.statusQueryUnsupported = false;
    const info = port.getInfo();
    const ports = (await this.nav.serial?.getPorts()) ?? [];
    this.save({ transport: 'serial', fingerprint: serialFingerprint(info), index: ports.indexOf(port) });
    const deviceName = info.bluetoothServiceClassId !== undefined
      ? 'Impressora Bluetooth (porta série)'
      : info.usbVendorId !== undefined
      ? `Porta série USB ${hex4(info.usbVendorId)}:${hex4(info.usbProductId)}`
      : 'Porta série (COM)';
    this.set({ connection: 'connected', transport: 'serial', deviceName, error: undefined });
    this.checkStatus().catch(() => undefined);
  }

  private async openUsb(device: USBDeviceLike) {
    this.claim(device);
    this.set({ connection: 'connecting', error: undefined });
    try {
      if (!device.opened) await device.open();
      if (!device.configuration) await device.selectConfiguration(1);

      // Procura uma interface com saída de dados (de preferência classe 7 = impressora)
      const interfaces = device.configuration?.interfaces ?? [];
      const sorted = [...interfaces].sort(
        (a, b) => Number(b.alternate.interfaceClass === 7) - Number(a.alternate.interfaceClass === 7)
      );
      const iface = sorted.find(i => i.alternate.endpoints.some(e => e.direction === 'out' && e.type === 'bulk'));
      if (!iface) throw new Error('O aparelho escolhido não parece ser uma impressora (sem saída de dados).');

      await device.claimInterface(iface.interfaceNumber);
      this.usbInterface = iface.interfaceNumber;
      this.usbOut = iface.alternate.endpoints.find(e => e.direction === 'out' && e.type === 'bulk')!.endpointNumber;
      this.usbIn = iface.alternate.endpoints.find(e => e.direction === 'in' && e.type === 'bulk')?.endpointNumber ?? -1;
    } catch (err) {
      claimed.delete(device);
      const msg = (err as Error).message || String(err);
      const hint = /access denied|unable to claim|SecurityError/i.test(msg)
        ? ' No Windows, a impressora está a usar o driver do sistema. Use a ligação por porta série ou instale o driver WinUSB.'
        : '';
      this.set({ connection: 'error', error: `Não foi possível ligar por USB: ${msg}.${hint}` });
      throw err;
    }
    this.usbDevice = device;
    this.statusQueryUnsupported = this.usbIn < 0;
    this.save({ transport: 'usb', fingerprint: usbFingerprint(device) });
    const deviceName = [device.manufacturerName, device.productName].filter(Boolean).join(' ') ||
      `Aparelho USB ${hex4(device.vendorId)}:${hex4(device.productId)}`;
    this.set({ connection: 'connected', transport: 'usb', deviceName, error: undefined });
    this.checkStatus().catch(() => undefined);
  }

  private async openBluetooth(device: BleDeviceLike) {
    this.claim(device);
    this.set({ connection: 'connecting', error: undefined });
    try {
      if (!device.gatt) throw new Error('O aparelho escolhido não aceita ligações Bluetooth LE');
      const server = await withTimeout(device.gatt.connect(), 12000);
      if (!server) throw new Error('A impressora não respondeu. Confirme que está ligada e perto do aparelho');

      let target: BleCharacteristicLike | null = null;
      for (const service of await server.getPrimaryServices()) {
        const chars = await service.getCharacteristics();
        target = chars.find(c => c.properties.writeWithoutResponse || c.properties.write) ?? null;
        if (target) break;
      }
      if (!target) {
        server.disconnect();
        throw new Error(
          'Esta impressora não tem um canal de impressão Bluetooth LE conhecido. ' +
          'No computador, experimente a ligação "Porta série" (Bluetooth clássico)'
        );
      }
      this.bleChar = target;
      this.bleChunk = 180;
    } catch (err) {
      claimed.delete(device);
      this.set({ connection: 'error', error: `Não foi possível ligar por Bluetooth: ${(err as Error).message}.` });
      throw err;
    }

    if (!this.bleWatched.has(device)) {
      this.bleWatched.add(device);
      device.addEventListener('gattserverdisconnected', () => {
        if (device === this.bleDevice) this.handleLost('A ligação Bluetooth à impressora foi perdida');
      });
    }
    this.bleDevice = device;
    this.statusQueryUnsupported = true; // as impressoras BLE raramente devolvem estado
    this.save({ transport: 'bluetooth', fingerprint: device.id });
    this.set({
      connection: 'connected',
      transport: 'bluetooth',
      deviceName: device.name || 'Impressora Bluetooth',
      error: undefined,
      paper: undefined,
    });
  }

  async disconnect(): Promise<void> {
    const port = this.serialPort;
    const usb = this.usbDevice;
    const ble = this.bleDevice;
    this.releaseClaims();
    this.serialPort = null;
    this.usbDevice = null;
    this.bleDevice = null;
    this.bleChar = null;
    try {
      if (port) await port.close();
      if (usb) {
        if (this.usbInterface >= 0) await usb.releaseInterface(this.usbInterface).catch(() => undefined);
        await usb.close();
      }
      if (ble?.gatt?.connected) ble.gatt.disconnect();
    } catch (err) {
      console.warn('Printer disconnect error:', err);
    }
    if (port || usb || ble) {
      storage.remove(this.key('device'));
      this.set({ connection: 'disconnected', transport: undefined, deviceName: undefined, paper: undefined, error: undefined });
    }
  }

  setCustomName(name: string) {
    storage.set(this.key('name'), name.trim());
    this.set({ customName: name.trim() });
  }

  async updateSettings(patch: Partial<PrinterSettings>) {
    const settings = { ...this.state.settings, ...patch };
    storage.set(this.key('settings'), JSON.stringify(settings));
    this.set({ settings });
    // A velocidade só se aplica ao abrir a porta: volta a abrir
    if (patch.baudRate !== undefined && this.serialPort) {
      const port = this.serialPort;
      await this.disconnect();
      await this.openSerial(port);
    }
  }

  /** Garante que só um envio/consulta usa a impressora de cada vez. */
  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.busy.then(task, task);
    this.busy = run.catch(() => undefined);
    return run;
  }

  private async write(bytes: Uint8Array) {
    if (this.serialPort?.writable) {
      const writer = this.serialPort.writable.getWriter();
      try {
        await writer.write(bytes);
      } finally {
        writer.releaseLock();
      }
    } else if (this.usbDevice) {
      for (let i = 0; i < bytes.length; i += 4096) {
        const result = await this.usbDevice.transferOut(this.usbOut, bytes.slice(i, i + 4096));
        if (result.status !== 'ok') throw new Error(`Falha no envio USB (${result.status})`);
      }
    } else if (this.bleChar) {
      const ch = this.bleChar;
      const noResponse = ch.properties.writeWithoutResponse && !!ch.writeValueWithoutResponse;
      for (let i = 0; i < bytes.length; ) {
        const chunk = bytes.slice(i, i + this.bleChunk);
        try {
          if (noResponse) {
            await ch.writeValueWithoutResponse!(chunk);
            await sleep(15); // dá tempo à impressora para esvaziar o buffer
          } else {
            await ch.writeValue(chunk);
          }
          i += chunk.length;
        } catch (err) {
          // Pacote demasiado grande para esta impressora: passa a enviar em pedaços de 20 bytes
          if (this.bleChunk > 20) {
            this.bleChunk = 20;
            continue;
          }
          throw err;
        }
      }
    } else {
      throw new Error('Nenhuma impressora ligada');
    }
  }

  /** Lê 1 byte de resposta, ou null se a impressora não responder a tempo. */
  private async readByte(timeoutMs: number): Promise<number | null> {
    if (this.serialPort?.readable) {
      const reader = this.serialPort.readable.getReader();
      try {
        const result = await withTimeout(reader.read(), timeoutMs);
        if (!result) {
          await reader.cancel().catch(() => undefined);
          return null;
        }
        const bytes = result.value;
        return bytes && bytes.length > 0 ? (bytes[bytes.length - 1] ?? null) : null;
      } finally {
        reader.releaseLock();
      }
    }
    if (this.usbDevice && this.usbIn >= 0) {
      const result = await withTimeout(this.usbDevice.transferIn(this.usbIn, 8), timeoutMs);
      if (!result || !result.data || result.data.byteLength === 0) return null;
      return result.data.getUint8(result.data.byteLength - 1);
    }
    return null;
  }

  /** Pergunta à impressora o estado do papel e da tampa (DLE EOT). */
  async checkStatus(): Promise<PaperStatus | undefined> {
    if (!this.isConnected()) return this.state.paper;
    if (this.statusQueryUnsupported) {
      const paper: PaperStatus = { paperOut: null, paperNearEnd: null, coverOpen: null, checkedAt: new Date() };
      this.set({ paper });
      return paper;
    }
    return this.exclusive(async () => {
      await this.write(new Uint8Array([DLE, EOT, 4])); // sensor de papel
      const paperByte = await this.readByte(1200);
      if (paperByte === null) {
        // A impressora não responde a pedidos de estado: não volta a perguntar nesta ligação
        this.statusQueryUnsupported = true;
        const paper: PaperStatus = { paperOut: null, paperNearEnd: null, coverOpen: null, checkedAt: new Date() };
        this.set({ paper });
        return paper;
      }
      await this.write(new Uint8Array([DLE, EOT, 2])); // causa de estar offline
      const offlineByte = await this.readByte(1200);
      const paper: PaperStatus = {
        paperOut: (paperByte & 0x60) !== 0,
        paperNearEnd: (paperByte & 0x0c) !== 0,
        coverOpen: offlineByte === null ? null : (offlineByte & 0x04) !== 0,
        checkedAt: new Date(),
      };
      this.set({ paper });
      return paper;
    });
  }

  /** Imprime um ou mais talões seguidos (com corte entre eles, se ativo). */
  async printTickets(tickets: Ticket[]): Promise<void> {
    if (!this.isConnected()) throw new Error('Nenhuma impressora ligada');
    const bytes = await renderTickets(tickets, this.state.settings);
    await this.exclusive(async () => {
      this.set({ connection: 'printing' });
      try {
        await this.write(bytes);
        this.set({ connection: 'connected', lastPrint: { at: new Date(), ok: true } });
      } catch (err) {
        const message = (err as Error).message || String(err);
        this.set({
          connection: this.serialPort || this.usbDevice || this.bleDevice ? 'connected' : 'disconnected',
          lastPrint: { at: new Date(), ok: false, message },
        });
        throw err;
      }
    });
    // Atualiza o estado do papel depois de imprimir, sem atrasar o pedido
    this.checkStatus().catch(() => undefined);
  }
}

function serialFingerprint(info: SerialPortInfo) {
  return `${info.usbVendorId ?? ''}:${info.usbProductId ?? ''}:${info.bluetoothServiceClassId ?? ''}`;
}

function usbFingerprint(d: USBDeviceLike) {
  return `${d.vendorId}:${d.productId}:${d.serialNumber ?? ''}`;
}

export type { ThermalPrinter };

export const printers: Record<PrinterRole, ThermalPrinter> = {
  customer: new ThermalPrinter('customer'),
  kitchen: new ThermalPrinter('kitchen'),
};

/** Religa as duas impressoras autorizadas (primeiro a do cliente). */
export function autoReconnectPrinters(): Promise<void> {
  return printers.customer.autoReconnect().then(() => printers.kitchen.autoReconnect());
}
