"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "@/app/time-machine/_components/chrono-profile-photo.module.css";

const PROFILE_PHOTO_SWAP_INTERVAL_MS = 1250;

type ChronoProfilePhotoProps = {
  imageUrls: string[];
};

function pickNextIndex(length: number, previousIndex: number) {
  if (length <= 1) {
    return 0;
  }

  let nextIndex = Math.floor(Math.random() * length);

  if (nextIndex === previousIndex) {
    nextIndex = (nextIndex + 1) % length;
  }

  return nextIndex;
}

export default function ChronoProfilePhoto({
  imageUrls,
}: ChronoProfilePhotoProps) {
  const [activeIndex, setActiveIndex] = useState(() =>
    pickNextIndex(imageUrls.length, -1),
  );
  const [glitchTick, setGlitchTick] = useState(0);
  const activeIndexRef = useRef(activeIndex);
  const activeImageUrl = imageUrls[activeIndex] ?? imageUrls[0] ?? null;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (imageUrls.length === 0) {
      return;
    }

    const swapTimer = window.setInterval(() => {
      const nextIndex = pickNextIndex(
        imageUrls.length,
        activeIndexRef.current,
      );

      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      setGlitchTick((currentValue) => currentValue + 1);
    }, PROFILE_PHOTO_SWAP_INTERVAL_MS);

    return () => {
      window.clearInterval(swapTimer);
    };
  }, [imageUrls.length]);

  return (
    <div
      className={styles.photoPlate}
      data-has-photo={activeImageUrl ? "true" : undefined}
    >
      {activeImageUrl ? (
        <>
          <Image
            key={`${activeImageUrl}-${glitchTick}`}
            src={activeImageUrl}
            alt="시간여행자 프로필 사진"
            fill
            sizes="74px"
            className={styles.profilePhoto}
            unoptimized
          />
          <span className={styles.photoGlitch} aria-hidden="true" />
        </>
      ) : (
        <span className={styles.photoInitials}>TL</span>
      )}
    </div>
  );
}
