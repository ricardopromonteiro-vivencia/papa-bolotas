/**
 * Converte o logo (webapp/public/logo.png) numa imagem só a preto e branco para impressoras ESC/POS.
 *
 * Envia em faixas com o comando GS v 0, que a grande maioria das impressoras térmicas suporta.
 */

export const LOGO_URL = '/logo.png';

const cache = new Map<number, Promise<Uint8Array | null>>();

/** Pontos por linha de cada largura de papel (203 dpi). */
export const PAPER_DOTS = { 58: 384, 80: 576 } as const;

/** Largura do logo no talão, em fração da largura do papel (0,35 ≈ 17 mm em papel de 58 mm). */
export const LOGO_WIDTH_FRACTION = 0.35;

/** Luminância (0–255) abaixo da qual um ponto fica preto. Subir = logo mais escuro. */
const BLACK_THRESHOLD = 140;

/** Devolve os bytes ESC/POS do logo com a largura pedida, ou null se não houver logo. */
export function getLogoRaster(widthDots: number): Promise<Uint8Array | null> {
  const width = Math.max(8, Math.floor(widthDots / 8) * 8);
  let pending = cache.get(width);
  if (!pending) {
    pending = buildRaster(width).catch(err => {
      console.warn('Logo not available for printing:', err);
      cache.delete(width); // volta a tentar na próxima impressão (por ex. depois de adicionar o ficheiro)
      return null;
    });
    cache.set(width, pending);
  }
  return pending;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Não foi possível carregar ${src}`));
    img.src = src;
  });
}

async function buildRaster(width: number): Promise<Uint8Array> {
  const img = await loadImage(LOGO_URL);
  if (!img.naturalWidth || !img.naturalHeight) throw new Error('Logo vazio');
  const height = Math.max(1, Math.round((img.naturalHeight * width) / img.naturalWidth));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.fillStyle = '#fff'; // zonas transparentes ficam brancas
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  // Só preto e branco (sem cinzentos): cada ponto mais escuro do que o limiar fica preto.
  // O fundo creme e o rosa ficam brancos; traços, letras e verdes escuros ficam pretos.
  const bytesPerRow = width / 8;
  const bits = new Uint8Array(bytesPerRow * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const lum = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
      if (lum < BLACK_THRESHOLD) {
        const byte = y * bytesPerRow + (x >> 3);
        bits[byte] = bits[byte]! | (0x80 >> (x & 7));
      }
    }
  }

  // Faixas de no máximo 128 linhas (algumas impressoras têm pouca memória)
  const out: number[] = [];
  for (let y0 = 0; y0 < height; y0 += 128) {
    const rows = Math.min(128, height - y0);
    out.push(0x1d, 0x76, 0x30, 0x00, bytesPerRow & 0xff, bytesPerRow >> 8, rows & 0xff, rows >> 8);
    const band = bits.subarray(y0 * bytesPerRow, (y0 + rows) * bytesPerRow);
    for (let k = 0; k < band.length; k++) out.push(band[k]!);
  }
  return new Uint8Array(out);
}
