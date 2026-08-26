import Image from "next/image";
import { Lock } from "lucide-react";
import { Card, RARITY } from "@/lib/cards";
import CardOrnament from "./CardOrnament";

interface Props {
  card: Card;
  locked?: boolean;
  /** Жабық карточканың қалай ашылатыны — "500 ұпай" сияқты */
  hint?: string;
}

export default function BookCard({ card, locked, hint }: Props) {
  const style = RARITY[card.rarity];

  if (locked) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
        <div className="my-2 flex h-[76px] w-[76px] items-center justify-center">
          <CardOrnament code={card.code} rarity={card.rarity} size={76} muted />
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
          <Lock size={11} />
          {hint ?? "Жабық"}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center rounded-xl p-4 text-center"
      style={{ background: style.bg, border: `1px solid ${style.border}` }}
    >
      <span
        className="text-[10px] uppercase tracking-wider"
        style={{ color: style.ink }}
      >
        {style.label}
      </span>

      <div className="my-2.5">
        {card.art_url ? (
          <Image
            src={card.art_url}
            alt={card.name}
            width={88}
            height={88}
            className="h-22 w-22 rounded-lg object-cover"
          />
        ) : (
          <CardOrnament code={card.code} rarity={card.rarity} size={88} />
        )}
      </div>

      <p className="text-base font-semibold leading-tight" style={{ color: style.title }}>
        {card.name}
      </p>

      {(card.book_title || card.author) && (
        <p className="mt-1 text-[11px] leading-snug" style={{ color: style.ink }}>
          {card.book_title}
          {card.book_title && card.author && " · "}
          {card.author}
        </p>
      )}

      {card.quote && (
        <p
          className="mt-2.5 border-t pt-2.5 text-[11px] italic leading-snug"
          style={{ color: style.ink, borderColor: style.border }}
        >
          «{card.quote}»
        </p>
      )}
    </div>
  );
}
