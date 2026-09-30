import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './ImageLightbox.module.css';

export interface LightboxImage {
  id: string;
  url: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  startIndex: number;
  onClose: () => void;
}

export function ImageLightbox({ images, startIndex, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);

  const showPrev = useCallback(() => {
    if (images.length === 0) {
      return;
    }
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const showNext = useCallback(() => {
    if (images.length === 0) {
      return;
    }
    setIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowLeft') {
        showPrev();
      } else if (event.key === 'ArrowRight') {
        showNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, showPrev, showNext]);

  if (images.length === 0) {
    return null;
  }

  const current = images[index];

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const startX = touchStartX.current;
        touchStartX.current = null;
        if (startX === null) {
          return;
        }
        const delta = (event.changedTouches[0]?.clientX ?? startX) - startX;
        if (Math.abs(delta) > 40) {
          if (delta < 0) {
            showNext();
          } else {
            showPrev();
          }
        }
      }}
    >
      <button
        type="button"
        className={styles.close}
        aria-label="Закрыть"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        ×
      </button>

      {images.length > 1 && (
        <button
          type="button"
          className={styles.navPrev}
          aria-label="Предыдущее изображение"
          onClick={(event) => {
            event.stopPropagation();
            showPrev();
          }}
        >
          ‹
        </button>
      )}

      <figure className={styles.figure} onClick={(event) => event.stopPropagation()}>
        <img className={styles.image} src={current.url} alt="" />
        <figcaption className={styles.counter}>
          {index + 1} / {images.length}
        </figcaption>
      </figure>

      {images.length > 1 && (
        <button
          type="button"
          className={styles.navNext}
          aria-label="Следующее изображение"
          onClick={(event) => {
            event.stopPropagation();
            showNext();
          }}
        >
          ›
        </button>
      )}
    </div>
  );
}
