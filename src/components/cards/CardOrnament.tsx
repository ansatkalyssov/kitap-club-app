import { Rarity, RARITY, seedFrom } from "@/lib/cards";

interface Props {
  code: string;
  rarity: Rarity;
  size?: number;
  muted?: boolean;
}

/**
 * Қазақ оюы негізіндегі медальон. Сурет файлы жоқ — бәрі карточканың
 * code-інен есептеледі, сондықтан әр карточканың өрнегі бірегей.
 *
 * Сиректік мүйіз санымен және сақина санымен беріледі, түспен емес —
 * сондықтан ақ-қара басып шығарса да айырмашылық көрінеді.
 */
export default function CardOrnament({ code, rarity, size = 104, muted }: Props) {
  const style = RARITY[rarity];
  const seed = seedFrom(code);

  // Бастапқы бұрылыс пен ішкі мотив code-тен шығады
  const offset = seed % 90;
  const motif = seed % 3;
  const curlDepth = 32 + (seed % 5);

  const color = muted ? "#B4B2A9" : style.ink;
  const angles = Array.from({ length: style.curls }, (_, i) => (360 / style.curls) * i + offset);

  const curl = `M50 ${18} C ${40 - (seed % 3)} 18 ${curlDepth} 26 ${curlDepth} 35 C ${curlDepth} 43 40 48 46 46 C 51 44 51 37 47 36`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ color }}
      aria-hidden="true"
    >
      {Array.from({ length: style.rings }, (_, i) => (
        <circle
          key={i}
          cx="50"
          cy="50"
          r={47 - i * 4}
          fill="none"
          stroke="currentColor"
          strokeWidth={i === 0 ? 0.9 : 0.6}
          opacity={i === 0 ? 0.9 : 0.5}
        />
      ))}

      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        {angles.map((a) => (
          <path key={a} d={curl} transform={`rotate(${a} 50 50)`} />
        ))}
      </g>

      {motif === 0 && (
        <rect x="45.5" y="45.5" width="9" height="9" transform="rotate(45 50 50)" fill="currentColor" />
      )}
      {motif === 1 && (
        <>
          <circle cx="50" cy="50" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="50" cy="50" r="2.5" fill="currentColor" />
        </>
      )}
      {motif === 2 && (
        <path
          d="M50 40 L53 47 L60 50 L53 53 L50 60 L47 53 L40 50 L47 47 Z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}
