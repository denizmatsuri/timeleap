"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type LandingTicketItem = {
  alt: string;
  arrivedLabel: string;
  city: string;
  era: string;
  gate: string;
  href: string;
  passenger: string;
  serial: string;
  src: string;
  year: string;
};

type LandingTicketCarouselProps = {
  tickets: readonly LandingTicketItem[];
};

const TICKET_POSITION_CLASS = {
  active:
    "absolute top-1/2 left-1/2 z-20 w-[min(328px,82vw)] -translate-x-1/2 -translate-y-1/2 scale-100 opacity-100 blur-0",
  next: "pointer-events-none absolute top-1/2 left-1/2 z-0 hidden w-[286px] translate-x-[28%] -translate-y-[48%] rotate-[6deg] scale-[.84] opacity-38 blur-[.2px] sm:block",
  previous:
    "pointer-events-none absolute top-1/2 left-1/2 z-0 hidden w-[286px] -translate-x-[128%] -translate-y-[48%] rotate-[-8deg] scale-[.84] opacity-38 blur-[.2px] sm:block",
} as const;
type TicketPosition = keyof typeof TICKET_POSITION_CLASS;

function getCircularIndex(currentIndex: number, delta: number, length: number) {
  return (currentIndex + delta + length) % length;
}

function TicketCard({
  className = "",
  onNext,
  onPrevious,
  priority = false,
  ticket,
}: {
  className?: string;
  onNext?: () => void;
  onPrevious?: () => void;
  priority?: boolean;
  ticket: LandingTicketItem;
}) {
  return (
    <div
      className={`bg-paper text-ink ticket-notch relative w-full -rotate-2 rounded-md shadow-[0_20px_50px_-20px_rgba(0,0,0,.5),0_4px_12px_rgba(0,0,0,.15)] ${className}`}
    >
      <div className="border-ink-3 flex items-center gap-3.5 border-b border-dashed px-5 py-3.5">
        <div className="flex flex-1 items-center gap-2.5">
          <div>
            <div className="font-display text-sm font-medium">TIMELEAP</div>
            <div className="font-mono text-[9px] tracking-[.15em] opacity-60">
              BOARDING PASS
            </div>
          </div>
        </div>
        <div className="flex-1" />
        <div className="font-mono text-[10px] tracking-[.15em] opacity-55">
          {ticket.serial}
        </div>
      </div>

      <div className="p-4.5">
        <div className="flex items-end justify-between gap-3.5">
          <div>
            <div className="mb-1 font-mono text-[9px] tracking-[.15em] uppercase opacity-55">
              FROM
            </div>
            <div className="font-display flex flex-col text-[24px] leading-none font-medium tracking-tight">
              2026
              <span className="text-ember-2 mt-0.5 font-mono text-[10px] font-medium tracking-[.12em]">
                SEOUL
              </span>
            </div>
          </div>
          <div className="text-ember pb-1 text-2xl">→</div>
          <div>
            <div className="mb-1 font-mono text-[9px] tracking-[.15em] uppercase opacity-55">
              TO
            </div>
            <div className="font-display flex flex-col text-[24px] leading-none font-medium tracking-tight">
              {ticket.year}
              <span className="text-ember-2 mt-0.5 font-mono text-[10px] font-medium tracking-[.12em]">
                {ticket.city}
              </span>
            </div>
          </div>
        </div>

        <Link
          href={ticket.href}
          className="border-ink/15 bg-paper-3 relative my-4 block aspect-square overflow-hidden rounded-sm border shadow-[inset_0_0_0_1px_rgba(255,255,255,.26)]"
        >
          <Image
            src={ticket.src}
            alt={ticket.alt}
            fill
            sizes="(min-width: 768px) 328px, 88vw"
            className="object-cover"
            priority={priority}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_58%,rgba(26,20,16,0.25))]" />
        </Link>

        <div className="flex justify-between gap-5">
          {[
            ["PASSENGER", ticket.passenger],
            ["ERA", ticket.era],
            ["GATE", ticket.gate],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="mb-1 font-mono text-[9px] tracking-[.15em] uppercase opacity-55">
                {label}
              </div>
              <div className="font-display text-sm font-medium">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-ink-3 border-t border-dashed px-5 pt-3 pb-4">
        <div className="barcode-bg h-5 rounded-sm opacity-75" />
      </div>

      <div className="pointer-events-none absolute top-0 -right-3 origin-top-right scale-[.86] rotate-12">
        <span className="stamp bg-paper/88 shadow-[0_8px_22px_-16px_rgba(0,0,0,.8)]">
          DEPARTED
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-0 -left-3 origin-bottom-left scale-[.86] -rotate-[8deg]">
        <span className="stamp stamp-sage bg-paper/88 shadow-[0_8px_22px_-16px_rgba(0,0,0,.8)]">
          {ticket.arrivedLabel}
        </span>
      </div>

      {onPrevious && onNext ? (
        <>
          <button
            type="button"
            aria-label="이전 탑승권 보기"
            onClick={onPrevious}
            className="border-ink/18 bg-paper-2 text-ink hover:bg-paper absolute top-1/2 -left-3.5 z-30 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border font-mono text-[15px] shadow-[0_10px_24px_-18px_rgba(0,0,0,.75)] transition"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="다음 탑승권 보기"
            onClick={onNext}
            className="border-ink/18 bg-paper-2 text-ink hover:bg-paper absolute top-1/2 -right-3.5 z-30 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border font-mono text-[15px] shadow-[0_10px_24px_-18px_rgba(0,0,0,.75)] transition"
          >
            →
          </button>
        </>
      ) : null}
    </div>
  );
}

export default function LandingTicketCarousel({
  tickets,
}: LandingTicketCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const ticketCount = tickets.length;
  const activeTicket = ticketCount > 0 ? tickets[activeIndex] : null;
  const visibleTickets: Array<{
    position: TicketPosition;
    ticket: LandingTicketItem;
  }> =
    ticketCount > 0
      ? [
          {
            position: "previous",
            ticket: tickets[getCircularIndex(activeIndex, -1, ticketCount)],
          },
          {
            position: "active",
            ticket: tickets[activeIndex],
          },
          {
            position: "next",
            ticket: tickets[getCircularIndex(activeIndex, 1, ticketCount)],
          },
        ]
      : [];

  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  const scheduleAutoAdvance = useCallback(() => {
    clearAutoAdvanceTimer();

    if (ticketCount <= 1) {
      return;
    }

    autoAdvanceTimerRef.current = window.setTimeout(() => {
      setActiveIndex((currentIndex) =>
        getCircularIndex(currentIndex, 1, ticketCount),
      );
    }, 3000);
  }, [clearAutoAdvanceTimer, ticketCount]);

  useEffect(() => {
    scheduleAutoAdvance();

    return clearAutoAdvanceTimer;
  }, [activeIndex, clearAutoAdvanceTimer, scheduleAutoAdvance]);

  function handleMove(delta: -1 | 1) {
    if (ticketCount === 0) {
      return;
    }

    clearAutoAdvanceTimer();
    setActiveIndex((currentIndex) =>
      getCircularIndex(currentIndex, delta, ticketCount),
    );
  }

  if (!activeTicket) {
    return null;
  }

  return (
    <div className="relative min-h-[520px] sm:min-h-[560px]">
      {visibleTickets.map(({ position, ticket }) => (
        <div
          key={ticket.serial}
          className={`${TICKET_POSITION_CLASS[position]} transition-[transform,opacity,filter] duration-500 ease-out`}
        >
          <TicketCard
            ticket={ticket}
            priority={position === "active"}
            onPrevious={position === "active" ? () => handleMove(-1) : undefined}
            onNext={position === "active" ? () => handleMove(1) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
