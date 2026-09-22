/**
 * Суретті жүктер алдында браузерде кішірейту.
 *
 * Бұрын телефоннан түсірілген сурет сол күйі қоймаға кететін: бір клуб
 * эмблемасы 1536×1024, 402 КБ болып жатты, ал экранда ол 24 пиксель.
 * Ондай суреттерді Vercel-дің өңдеу қызметі кішірейтіп беретін, бірақ
 * оның айлық шегі бітіп қалды да, барлық сурет сынып тұрды.
 *
 * Сондықтан кішірейтуді жүктеу сәтінде өзіміз істейміз. Сонда қоймаға
 * бірден дайын өлшемдегі файл түседі, ешқандай сыртқы қызметке тәуелді
 * болмаймыз, әрі оқырманның интернеті де аяулы болады.
 *
 * Бұл — браузердің коды, тек клиент компоненттерінен шақырылады.
 */

type Preset = { maxSize: number; quality: number };

/**
 * Әр суреттің ең үлкен қабырғасы. Қолданбада ең ірі көрінетін орнынан
 * екі есе үлкен етіп алынған — экраны тығыз телефондарда анық болсын.
 */
export const IMAGE_PRESETS = {
  /** Кітап мұқабасы — трекер мен жоспар беттерінде */
  cover: { maxSize: 600, quality: 0.82 },
  /** Клуб эмблемасы — тізімде кішкене, клуб бетінде орташа */
  emblem: { maxSize: 400, quality: 0.85 },
  /** Профиль суреті */
  avatar: { maxSize: 400, quality: 0.85 },
} satisfies Record<string, Preset>;

export type ImageKind = keyof typeof IMAGE_PRESETS;

export type PreparedImage = {
  /** Жүктелетін файл. Кішірейту сәтсіз болса — бастапқы файлдың өзі */
  blob: Blob;
  /** Жолға қойылатын кеңейтім, нүктесіз */
  ext: string;
};

/** Файлдың атынан кеңейтім алу — қысу мүмкін болмағанда керек */
function extOf(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && /^[a-z0-9]{1,5}$/i.test(fromName)) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return fromType && /^[a-z0-9]{1,5}$/i.test(fromType) ? fromType : "jpg";
}

/**
 * Суретті оқу. createImageBitmap EXIF бұрышын дұрыс ескереді — телефоннан
 * түскен сурет теріс айналып кетпес үшін алдымен соны қолданамыз.
 */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Кейбір браузерде параметр қолдау таппайды — төмендегі жолмен көреміз
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Суретті кішірейтіп, webp форматына келтіреді.
 *
 * Ешқашан қате лақтырмайды: браузер файлды танымаса (мысалы iPhone-ның
 * HEIC пішімі) немесе пайдасы шықпаса, бастапқы файлдың өзін қайтарады.
 * Сурет жүктеу мүлдем тоқтап қалмауы керек.
 */
export async function prepareImage(file: File, kind: ImageKind): Promise<PreparedImage> {
  const fallback: PreparedImage = { blob: file, ext: extOf(file) };

  if (typeof document === "undefined") return fallback;
  if (!file.type.startsWith("image/")) return fallback;
  // SVG-ні кенепке салсақ растрға айналып, сапасы төмендейді
  if (file.type === "image/svg+xml") return fallback;

  const { maxSize, quality } = IMAGE_PRESETS[kind];

  const source = await decode(file);
  if (!source) return fallback;

  try {
    const w = source.width;
    const h = source.height;
    if (!w || !h) return fallback;

    const scale = Math.min(1, maxSize / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) return fallback;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    const blob =
      (await toBlob(canvas, "image/webp", quality)) ??
      (await toBlob(canvas, "image/jpeg", quality));
    if (!blob) return fallback;

    // Кішірейтілгені үлкенірек шықса (мысалы файл онсыз да ықшам болса),
    // бастапқысын қалдырамыз
    if (blob.size >= file.size) return fallback;

    return { blob, ext: blob.type === "image/webp" ? "webp" : "jpg" };
  } finally {
    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
      source.close();
    }
  }
}
