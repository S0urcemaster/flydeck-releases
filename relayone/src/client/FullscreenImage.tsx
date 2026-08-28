import {
  useEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
} from "react";

export function FullscreenImage({
  alt,
  buttonClassName,
  imageClassName,
  loading,
  src,
}: {
  alt: string;
  buttonClassName: string;
  imageClassName?: string;
  loading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
  src: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <button
        aria-label={`Open image: ${alt}`}
        className={`imageTrigger ${buttonClassName}`}
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <img
          alt={alt}
          className={imageClassName}
          loading={loading}
          src={src}
        />
      </button>
      {open && (
        <div
          aria-label={`Fullscreen image: ${alt}`}
          aria-modal="true"
          className="fullscreenImageOverlay"
          onClick={close}
          role="dialog"
        >
          <button
            aria-label="Close fullscreen image"
            autoFocus
            className="fullscreenImageClose"
            onClick={close}
            type="button"
          >
            <img alt={alt} src={src} />
          </button>
        </div>
      )}
    </>
  );
}
