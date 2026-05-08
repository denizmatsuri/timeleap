import Image from "next/image";
import Link from "next/link";
import { type EraTone } from "@/lib/time-machine/destinations";

const HERO_PHOTO_BY_TONE: Record<EraTone, string> = {
  azure: "ph-fifties",
  champagne: "ph-gilded",
  chrome: "ph-eighties",
  cobalt: "ph-ticket",
  disco: "ph-disco",
  electric: "ph-eighties",
  ember: "ph-wildwest",
  fiesta: "ph-fifties",
  fog: "ph-noir",
  indigo: "ph-ticket",
  mod: "ph-sixties",
  noir: "ph-noir",
  pastel: "ph-fifties",
  punk: "ph-roaring",
  sepia: "ph-gilded",
};
const DIARY_CARD_ROTATE_CLASSES = [
  "rotate-[-0.45deg]",
  "rotate-[0.35deg]",
  "rotate-[-0.2deg]",
  "rotate-[0.55deg]",
  "rotate-[-0.65deg]",
  "rotate-[0.15deg]",
] as const;

type DiaryPhotoCardProps = {
  countryFlag: string;
  countryName: string;
  createdAtLabel: string;
  eraTone: EraTone;
  eraYear: string;
  excerpt?: string;
  footerLabel: string;
  href: string;
  imageAlt: string;
  imageSizes?: string;
  imageUrl: string | null;
  index: number;
  title: string;
  titleElement?: "h2" | "h3";
};

export default function DiaryPhotoCard({
  countryFlag,
  countryName,
  createdAtLabel,
  eraTone,
  eraYear,
  excerpt,
  footerLabel,
  href,
  imageAlt,
  imageSizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  imageUrl,
  index,
  title,
  titleElement = "h3",
}: DiaryPhotoCardProps) {
  const TitleElement = titleElement;
  const placeholderClassName = HERO_PHOTO_BY_TONE[eraTone];

  return (
    <Link
      href={href}
      className={`group bg-photocard relative flex flex-col p-3 pb-5 shadow-[0_1px_0_rgba(0,0,0,.05),0_18px_40px_-20px_rgba(0,0,0,.32)] transition-all duration-300 hover:-translate-y-1 hover:rotate-0 hover:shadow-[0_18px_44px_-18px_rgba(0,0,0,.36)] ${DIARY_CARD_ROTATE_CLASSES[index % DIARY_CARD_ROTATE_CLASSES.length]}`}
    >
      <div className="bg-paper-3 relative aspect-[4/5] overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes={imageSizes}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : (
          <div
            className={`absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03] ${placeholderClassName}`}
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.22))]" />
        <div className="absolute bottom-3 left-3 rounded-sm bg-black/30 px-2 py-1 font-mono text-[9px] tracking-[0.12em] text-white/75 uppercase">
          {createdAtLabel}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-2 pt-4 text-center">
        <div className="mb-2 flex items-center justify-center gap-2 font-mono text-[10px] tracking-[.1em] opacity-55">
          <span>{countryFlag}</span>
          <span>
            {countryName} · {eraYear}
          </span>
        </div>
        <TitleElement className="font-handwriting text-ink-2 line-clamp-2 text-[24px] leading-[1.05]">
          {title}
        </TitleElement>
        {excerpt ? (
          <p className="mt-3 line-clamp-3 text-[12px] leading-[1.58] opacity-65">
            {excerpt}
          </p>
        ) : null}
        <div className="mt-auto pt-3 font-mono text-[9px] tracking-[.12em] opacity-42">
          {footerLabel}
        </div>
      </div>
    </Link>
  );
}
