export type Rarity = "common" | "rare" | "epic" | "legendary";

export type Card = {
  id: string;
  code: string;
  name: string;
  book_title: string | null;
  author: string | null;
  quote: string | null;
  rarity: Rarity;
  art_url: string | null;
  unlock_type: "starter" | "threshold" | "random" | "achievement";
  threshold: number | null;
  sort_order: number;
};

export type RarityStyle = {
  label: string;
  bg: string;
  border: string;
  ink: string;
  title: string;
  /** Ою мүйіздерінің саны — сиректік осы арқылы көзге бірден оқылады */
  curls: number;
  rings: number;
};

export const RARITY: Record<Rarity, RarityStyle> = {
  common: {
    label: "Кәдімгі",
    bg: "#F1EFE8",
    border: "#B4B2A9",
    ink: "#5F5E5A",
    title: "#2C2C2A",
    curls: 4,
    rings: 1,
  },
  rare: {
    label: "Сирек",
    bg: "#E1F5EE",
    border: "#5DCAA5",
    ink: "#0F6E56",
    title: "#04342C",
    curls: 5,
    rings: 2,
  },
  epic: {
    label: "Эпикалық",
    bg: "#EEEDFE",
    border: "#AFA9EC",
    ink: "#534AB7",
    title: "#26215C",
    curls: 6,
    rings: 2,
  },
  legendary: {
    label: "Аңызға айналған",
    bg: "#FAEEDA",
    border: "#EF9F27",
    ink: "#854F0B",
    title: "#412402",
    curls: 8,
    rings: 3,
  },
};

/**
 * Карточканың code-інен тұрақты сан жасайды.
 * Бірдей code әрқашан бірдей ою береді — сондықтан сурет файлы керек емес,
 * әрі әр карточканың оюы бірегей болып шығады.
 */
export function seedFrom(code: string): number {
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export const CARD_THRESHOLDS = [500, 1500, 3000, 5000, 8000, 12000, 17000, 23000];
