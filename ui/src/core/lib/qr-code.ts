/**
 * Bağımlılıksız QR kod kodlayıcı (ISO/IEC 18004, yalnız byte modu).
 *
 * Neden paket değil: QR ihtiyacı iki sabit mağaza bağlantısından ibaret; bir paket bu iş
 * için gereğinden büyük. Algoritma Project Nayuki'nin referans uygulamasını (MIT) izler;
 * burada yalnız gereken kısım var. Aynı dosya Çamkıran portalında da kullanılıyor.
 *
 * Çıktı saf bir modül matrisidir, çizim işi `core/components/other/qr-code.tsx`'te. Böylece
 * aynı matris logolu/noktalı SVG'ye de, test için piksel tamponuna da dönüştürülebilir.
 */

export type QrEcl = "L" | "M" | "Q" | "H";

export interface QrMatrix {
  /** Kenar uzunluğu, modül cinsinden (21..177). */
  size: number;
  version: number;
  /** Seçilen hata düzeltme düzeyi; `boostEcl` açıksa istenenden yüksek olabilir. */
  ecl: QrEcl;
  /** (x, y) modülü koyu mu. Sol üst köşe (0, 0). */
  isDark: (x: number, y: number) => boolean;
}

export interface QrEncodeOptions {
  /** En az hata düzeltme düzeyi. Varsayılan "M". */
  ecl?: QrEcl;
  minVersion?: number;
  maxVersion?: number;
  /** Seçilen sürüme sığdığı sürece düzeyi yükselt. Varsayılan true. */
  boostEcl?: boolean;
}

const ECL_ORDER: QrEcl[] = ["L", "M", "Q", "H"];
const ECL_FORMAT_BITS: Record<QrEcl, number> = { L: 1, M: 0, Q: 3, H: 2 };

// Sürüm başına (indeks = sürüm, 0 kullanılmaz) blok başı ECC kod sözcüğü ve blok sayısı.
const ECC_CODEWORDS_PER_BLOCK: Record<QrEcl, number[]> = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};
const NUM_ERROR_CORRECTION_BLOCKS: Record<QrEcl, number[]> = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};

/** Sınır denetimli okuma (tsconfig'de noUncheckedIndexedAccess açık). */
function at<T>(values: ArrayLike<T>, index: number): T {
  const value = values[index];
  if (value === undefined) throw new RangeError(`QR: geçersiz indeks ${index}`);
  return value;
}

function getBit(value: number, index: number): boolean {
  return ((value >>> index) & 1) !== 0;
}

/** Sürümde veri + ECC için kullanılabilen modül sayısı (işlev desenleri düşülmüş). */
function getNumRawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function getNumDataCodewords(version: number, ecl: QrEcl): number {
  return (
    Math.floor(getNumRawDataModules(version) / 8) -
    at(ECC_CODEWORDS_PER_BLOCK[ecl], version) * at(NUM_ERROR_CORRECTION_BLOCKS[ecl], version)
  );
}

/** Byte modu segmentinin bit uzunluğu: mod (4) + karakter sayısı (8 veya 16) + veri. */
function getSegmentBits(byteLength: number, version: number): number {
  return 4 + (version <= 9 ? 8 : 16) + byteLength * 8;
}

// ---- Reed-Solomon, GF(2^8) / 0x11D ----

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function reedSolomonDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(at(result, j), root) ^ (j + 1 < result.length ? at(result, j + 1) : 0);
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]): number[] {
  let result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ at(result, 0);
    result = [...result.slice(1), 0].map((value, i) => value ^ gfMultiply(at(divisor, i), factor));
  }
  return result;
}

/** Veri kod sözcüklerini bloklara böler, ECC ekler ve blokları iç içe geçirir. */
function addEccAndInterleave(data: number[], version: number, ecl: QrEcl): number[] {
  const numBlocks = at(NUM_ERROR_CORRECTION_BLOCKS[ecl], version);
  const blockEccLen = at(ECC_CODEWORDS_PER_BLOCK[ecl], version);
  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const divisor = reedSolomonDivisor(blockEccLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
    k += dat.length;
    const ecc = reedSolomonRemainder(dat, divisor);
    if (i < numShortBlocks) dat.push(0); // Kısa bloklara yer tutucu; aşağıda atlanır.
    blocks.push(dat.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < at(blocks, 0).length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(at(block, i));
    });
  }
  return result;
}

// ---- Matris ----

/** Düz dizili modül ızgarası; indeks y * size + x. */
class Grid {
  private readonly dark: Uint8Array;
  private readonly fn: Uint8Array;

  constructor(readonly size: number) {
    this.dark = new Uint8Array(size * size);
    this.fn = new Uint8Array(size * size);
  }

  get(x: number, y: number): boolean {
    return this.dark[y * this.size + x] === 1;
  }

  set(x: number, y: number, dark: boolean) {
    this.dark[y * this.size + x] = dark ? 1 : 0;
  }

  isFunction(x: number, y: number): boolean {
    return this.fn[y * this.size + x] === 1;
  }

  setFunction(x: number, y: number, dark: boolean) {
    this.set(x, y, dark);
    this.fn[y * this.size + x] = 1;
  }
}

function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = Math.floor((version * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2;
  const result = [6];
  for (let pos = version * 4 + 17 - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

function drawFormatBits(grid: Grid, ecl: QrEcl, mask: number) {
  const data = (ECL_FORMAT_BITS[ecl] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const size = grid.size;

  for (let i = 0; i <= 5; i++) grid.setFunction(8, i, getBit(bits, i));
  grid.setFunction(8, 7, getBit(bits, 6));
  grid.setFunction(8, 8, getBit(bits, 7));
  grid.setFunction(7, 8, getBit(bits, 8));
  for (let i = 9; i < 15; i++) grid.setFunction(14 - i, 8, getBit(bits, i));

  for (let i = 0; i < 8; i++) grid.setFunction(size - 1 - i, 8, getBit(bits, i));
  for (let i = 8; i < 15; i++) grid.setFunction(8, size - 15 + i, getBit(bits, i));
  grid.setFunction(8, size - 8, true); // Her zaman koyu modül.
}

function drawVersion(grid: Grid, version: number) {
  if (version < 7) return;
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  const bits = (version << 12) | rem;
  for (let i = 0; i < 18; i++) {
    const dark = getBit(bits, i);
    const a = grid.size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    grid.setFunction(a, b, dark);
    grid.setFunction(b, a, dark);
  }
}

function drawFunctionPatterns(grid: Grid, version: number, ecl: QrEcl) {
  const size = grid.size;
  for (let i = 0; i < size; i++) {
    grid.setFunction(6, i, i % 2 === 0);
    grid.setFunction(i, 6, i % 2 === 0);
  }

  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        grid.setFunction(x, y, dist !== 2 && dist !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  const positions = alignmentPositions(version);
  const n = positions.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const overlapsFinder = (i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0);
      if (overlapsFinder) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          grid.setFunction(at(positions, i) + dx, at(positions, j) + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  drawFormatBits(grid, ecl, 0); // Yer ayırmak için; maske seçilince yeniden yazılır.
  drawVersion(grid, version);
}

function drawCodewords(grid: Grid, data: number[]) {
  const size = grid.size;
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // Dikey zamanlama deseni atlanır.
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!grid.isFunction(x, y) && i < data.length * 8) {
          grid.set(x, y, getBit(at(data, i >>> 3), 7 - (i & 7)));
          i++;
        }
      }
    }
  }
}

function applyMask(grid: Grid, mask: number) {
  for (let y = 0; y < grid.size; y++) {
    for (let x = 0; x < grid.size; x++) {
      let invert: boolean;
      switch (mask) {
        case 0: invert = (x + y) % 2 === 0; break;
        case 1: invert = y % 2 === 0; break;
        case 2: invert = x % 3 === 0; break;
        case 3: invert = (x + y) % 3 === 0; break;
        case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
        case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
        case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
      }
      if (invert && !grid.isFunction(x, y)) grid.set(x, y, !grid.get(x, y));
    }
  }
}

const FINDER_LIKE_A = [true, false, true, true, true, false, true, false, false, false, false];
const FINDER_LIKE_B = [false, false, false, false, true, false, true, true, true, false, true];

/** ISO 18004 bölüm 7.8.3 ceza puanı; en düşük puanlı maske seçilir. */
function penaltyScore(grid: Grid): number {
  const size = grid.size;
  let result = 0;
  let dark = 0;

  const lineAt = (index: number, horizontal: boolean) => (k: number) =>
    horizontal ? grid.get(k, index) : grid.get(index, k);

  for (let index = 0; index < size; index++) {
    for (const horizontal of [true, false]) {
      const cell = lineAt(index, horizontal);
      // Kural 1: aynı renkte 5+ modülden oluşan diziler.
      let runLength = 1;
      for (let k = 1; k <= size; k++) {
        if (k < size && cell(k) === cell(k - 1)) {
          runLength++;
        } else {
          if (runLength >= 5) result += 3 + (runLength - 5);
          runLength = 1;
        }
      }
      // Kural 3: bulucu desene benzeyen 1:1:3:1:1 dizileri.
      for (let k = 0; k + 11 <= size; k++) {
        let matchA = true;
        let matchB = true;
        for (let m = 0; m < 11; m++) {
          const v = cell(k + m);
          if (v !== at(FINDER_LIKE_A, m)) matchA = false;
          if (v !== at(FINDER_LIKE_B, m)) matchB = false;
        }
        if (matchA) result += 40;
        if (matchB) result += 40;
      }
    }
  }

  // Kural 2: aynı renkte 2x2 bloklar.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = grid.get(x, y);
      if (c === grid.get(x + 1, y) && c === grid.get(x, y + 1) && c === grid.get(x + 1, y + 1)) result += 3;
    }
  }

  // Kural 4: koyu/açık dengesi.
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (grid.get(x, y)) dark++;
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  result += k * 10;

  return result;
}

/** Metni (UTF-8) QR matrisine kodlar. Sığmazsa hata fırlatır. */
export function encodeQr(text: string, options: QrEncodeOptions = {}): QrMatrix {
  const { minVersion = 1, maxVersion = 40, boostEcl = true } = options;
  let ecl: QrEcl = options.ecl ?? "M";
  const bytes = Array.from(new TextEncoder().encode(text));

  let version = minVersion;
  for (; ; version++) {
    if (getSegmentBits(bytes.length, version) <= getNumDataCodewords(version, ecl) * 8) break;
    if (version >= maxVersion) throw new RangeError("QR: metin seçilen sürüm aralığına sığmıyor");
  }
  const usedBits = getSegmentBits(bytes.length, version);

  if (boostEcl) {
    for (const candidate of ECL_ORDER.slice(ECL_ORDER.indexOf(ecl) + 1)) {
      if (usedBits <= getNumDataCodewords(version, candidate) * 8) ecl = candidate;
    }
  }

  // Bit dizisi: mod göstergesi 0100 (byte), karakter sayısı, veri, sonlandırıcı, dolgu.
  const bits: number[] = [];
  const append = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  append(0b0100, 4);
  append(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) append(b, 8);

  const capacityBits = getNumDataCodewords(version, ecl) * 8;
  append(0, Math.min(4, capacityBits - bits.length));
  append(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) append(pad, 8);

  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | at(bits, i + j);
    dataCodewords.push(byte);
  }

  const size = version * 4 + 17;
  const grid = new Grid(size);
  drawFunctionPatterns(grid, version, ecl);
  drawCodewords(grid, addEccAndInterleave(dataCodewords, version, ecl));

  let bestMask = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(grid, mask);
    drawFormatBits(grid, ecl, mask);
    const score = penaltyScore(grid);
    if (score < bestScore) {
      bestMask = mask;
      bestScore = score;
    }
    applyMask(grid, mask); // XOR: ikinci uygulama geri alır.
  }
  applyMask(grid, bestMask);
  drawFormatBits(grid, ecl, bestMask);

  return { size, version, ecl, isDark: (x, y) => grid.get(x, y) };
}

// ---- SVG geometrisi ----

/** Bulucu desen (köşe "göz") çizim ölçüleri, modül cinsinden. */
export const QR_EYE = {
  /** Dış halka: 7x7 kutunun 1 modül kalınlıkta çerçevesi, köşe yarıçapı. */
  outerRadius: 2,
  /** İç kare: 3x3, köşe yarıçapı. */
  innerRadius: 1,
} as const;

/**
 * Veri modülü nokta yarıçapı. Komşu noktalar hafifçe üst üste biner, yine "noktalı" görünür.
 * jsQR ile 100-520 px arası 43 ölçekte ölçüldü: 0.45 ayrık ve zarif ama 23 ölçekte
 * okunamadı, 0.5 teğet 41/43, 0.52 ve üstü 43/43 (kare modüllü kontrol de 43/43).
 * Küçültmeden önce aynı taramayı yeniden yap.
 */
const DOT_RADIUS = 0.52;

export interface QrShapes {
  /** SVG viewBox; sessiz bölge (quiet zone) dahildir, arka plan beyaz çizilmeli. */
  viewBox: string;
  /** Sessiz bölgenin sol üst köşesi (negatif kenar boşluğu). */
  origin: number;
  /** Kenar uzunluğu, sessiz bölge dahil. */
  extent: number;
  /** Veri ve zamanlama modülleri: tek path içinde daireler. */
  dotsPath: string;
  /** Üç bulucu desenin sol üst köşeleri. */
  eyes: { x: number; y: number }[];
  /** Ortadaki logo için boşaltılmış kare; logo yoksa null. */
  logo: { x: number; y: number; size: number } | null;
}

/**
 * Matristen noktalı, yuvarlak gözlü QR geometrisi üretir.
 *
 * `logoModules` verilirse ortadaki kare boşaltılır (içindeki modüller hiç çizilmez). Kayıp,
 * hata düzeltmeyle karşılanır; bu yüzden logo alanı hata düzeltme bütçesinin küçük bir
 * kısmında tutulmalı (kodun %5'i civarı, Q/H düzeyinde güvenli).
 */
export function qrShapes(matrix: QrMatrix, { margin = 3, logoModules = 0 } = {}): QrShapes {
  const { size, isDark } = matrix;
  const inEye = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);

  let logo: QrShapes["logo"] = null;
  let inLogo: (x: number, y: number) => boolean = () => false;
  if (logoModules > 0) {
    // Tek sayı: boyut da tek olduğu için kare tam ortadaki modüle oturur.
    const side = logoModules % 2 === 1 ? logoModules : logoModules + 1;
    const start = (size - side) / 2;
    logo = { x: start, y: start, size: side };
    inLogo = (x, y) => x >= start && x < start + side && y >= start && y < start + side;
  }

  const r = DOT_RADIUS;
  const parts: string[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isDark(x, y) || inEye(x, y) || inLogo(x, y)) continue;
      const cx = x + 0.5 - r;
      const cy = y + 0.5;
      parts.push(`M${cx} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`);
    }
  }

  const extent = size + margin * 2;
  return {
    viewBox: `${-margin} ${-margin} ${extent} ${extent}`,
    origin: -margin,
    extent,
    dotsPath: parts.join(""),
    eyes: [
      { x: 0, y: 0 },
      { x: size - 7, y: 0 },
      { x: 0, y: size - 7 },
    ],
    logo,
  };
}
