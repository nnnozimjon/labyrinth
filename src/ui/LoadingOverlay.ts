import { FORMULA55_UI } from "./overlays/formula55-ui";

const STYLE_ID = "loading-overlay-styles";
const OVERLAY_ID = "loading-overlay";
const HIDE_MS = 360;

function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${OVERLAY_ID} {
      --f55-yellow: ${FORMULA55_UI.yellow};
      --f55-cream: ${FORMULA55_UI.textCream};
      --f55-dark: ${FORMULA55_UI.textDark};
    }

    #${OVERLAY_ID}.loading-overlay--show {
      animation: loadingFadeIn 360ms ease-out forwards;
    }

    #${OVERLAY_ID}.loading-overlay--hiding {
      animation: loadingFadeOut ${HIDE_MS}ms ease-in forwards;
    }

    #${OVERLAY_ID} .loading-gift-wrap {
      animation: loadingGiftFloat 3.2s ease-in-out infinite;
    }

    #${OVERLAY_ID} .loading-glow-ring {
      animation: loadingGlowPulse 2.4s ease-in-out infinite;
    }

    #${OVERLAY_ID} .loading-bar-fill::after {
      animation: loadingBarShine 2.2s ease-in-out infinite;
    }

    #${OVERLAY_ID} .loading-poster--left {
      animation: loadingPosterFloatLeft 4.5s ease-in-out infinite;
    }

    #${OVERLAY_ID} .loading-poster--right {
      animation: loadingPosterFloatRight 4.8s ease-in-out infinite;
    }

    @keyframes loadingFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes loadingFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes loadingGiftFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    @keyframes loadingGlowPulse {
      0%, 100% {
        opacity: 0.55;
        transform: translate(-50%, -50%) scale(1);
        box-shadow: 0 0 40px rgba(231,179,31,0.35), 0 0 80px rgba(231,179,31,0.18);
      }
      50% {
        opacity: 0.9;
        transform: translate(-50%, -50%) scale(1.06);
        box-shadow: 0 0 60px rgba(231,179,31,0.55), 0 0 110px rgba(231,179,31,0.28);
      }
    }

    @keyframes loadingBarShine {
      0% { transform: translateX(-120%) skewX(-18deg); }
      55%, 100% { transform: translateX(220%) skewX(-18deg); }
    }

    @keyframes loadingPosterFloatLeft {
      0%, 100% { transform: translateY(-50%) rotate(-4deg); }
      50% { transform: translateY(calc(-50% - 6px)) rotate(-2.5deg); }
    }

    @keyframes loadingPosterFloatRight {
      0%, 100% { transform: translateY(-50%) rotate(3.5deg); }
      50% { transform: translateY(calc(-50% - 7px)) rotate(5deg); }
    }

    @media (max-width: 720px) {
      #${OVERLAY_ID} .loading-posters {
        display: none;
      }

      #${OVERLAY_ID} .loading-bottom-tagline {
        font-size: clamp(0.72rem, 3.2vw, 0.9rem) !important;
      }
    }

    @media (max-width: 480px) {
      #${OVERLAY_ID} .loading-bottom-prize {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);
}

function createMagazineImage(
  className: string,
  src: string,
  alt: string
): HTMLImageElement {
  const img = document.createElement("img");
  img.className = `loading-poster ${className}`;
  img.src = src;
  img.alt = alt;
  img.loading = "eager";
  img.decoding = "async";
  Object.assign(img.style, {
    position: "absolute",
    width: "min(330px, 36vw)",
    height: "auto",
    borderRadius: "4px",
    boxShadow: "0 14px 32px rgba(0,0,0,0.45)",
    transformOrigin: "center center",
    objectFit: "contain",
    pointerEvents: "none",
    userSelect: "none",
  });
  return img;
}

export function createLoadingOverlay() {
  document.getElementById(OVERLAY_ID)?.remove();
  injectStyles();

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    display: "none",
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "space-between",
    zIndex: "950",
    pointerEvents: "auto",
    overflow: "hidden",
    opacity: "0",
    fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
    background: "#0a0806",
  });

  const carbon = document.createElement("div");
  Object.assign(carbon.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    background: `
      radial-gradient(circle at 50% 42%, rgba(231,179,31,0.12), transparent 40%),
      radial-gradient(circle at 18% 22%, rgba(231,179,31,0.06), transparent 28%),
      radial-gradient(circle at 84% 78%, rgba(231,179,31,0.07), transparent 30%),
      repeating-linear-gradient(135deg, rgba(255,255,255,0.028) 0 2px, transparent 2px 8px),
      repeating-linear-gradient(45deg, rgba(231,179,31,0.04) 0 1px, transparent 1px 14px),
      linear-gradient(180deg, #0d0a08 0%, #12100c 45%, #0a0806 100%)
    `,
  });

  const watermark = document.createElement("div");
  watermark.textContent = "55";
  Object.assign(watermark.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%) rotate(-12deg)",
    fontSize: "clamp(10rem, 34vw, 26rem)",
    fontWeight: "1000",
    fontStyle: "italic",
    letterSpacing: "-0.08em",
    color: "rgba(231,179,31,0.04)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    userSelect: "none",
    lineHeight: "0.8",
  });

  const center = document.createElement("main");
  Object.assign(center.style, {
    position: "relative",
    zIndex: "2",
    flex: "1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(12px, 3vw, 32px)",
    minHeight: "0",
  });

  const title = document.createElement("h1");
  title.textContent = "Футбольная Аркада";
  Object.assign(title.style, {
    margin: "0 0 8px",
    color: "#ffffff",
    fontSize: "clamp(1.6rem, 5.5vw, 3.2rem)",
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: "0.04em",
    lineHeight: "1.05",
    textAlign: "center",
    textShadow: "0 8px 24px rgba(0,0,0,0.7)",
  });

  const subtitle = document.createElement("p");
  subtitle.textContent = "Пройди лабиринт • Собери подарки • Выиграй призы";
  Object.assign(subtitle.style, {
    margin: "0",
    color: "rgba(255,255,255,0.76)",
    fontSize: "clamp(0.78rem, 2.2vw, 1.05rem)",
    fontWeight: "600",
    letterSpacing: "0.02em",
    textAlign: "center",
    maxWidth: "min(92vw, 520px)",
  });

  const posters = document.createElement("div");
  posters.className = "loading-posters";
  Object.assign(posters.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "1",
  });

  const posterLeft = createMagazineImage(
    "loading-poster--left",
    "/magazine-left.webp",
    "Журнал Formula55 — футбольная аркада"
  );
  Object.assign(posterLeft.style, {
    left: "clamp(12px, 4vw, 48px)",
    top: "50%",
    transform: "translateY(-50%) rotate(-4deg)",
  });

  const posterRight = createMagazineImage(
    "loading-poster--right",
    "/magazine-right.webp",
    "Журнал с призами — автомобиль, денежные призы и Freebet"
  );
  Object.assign(posterRight.style, {
    right: "clamp(12px, 4vw, 48px)",
    top: "50%",
    transform: "translateY(-50%) rotate(3.5deg)",
  });

  posters.append(posterLeft, posterRight);

  const bottomText = document.createElement("div");
  Object.assign(bottomText.style, {
    marginTop: "clamp(10px, 2vh, 18px)",
    textAlign: "center",
    maxWidth: "min(92vw, 560px)",
  });

  const bottomPrize = document.createElement("div");
  bottomPrize.className = "loading-bottom-prize";
  bottomPrize.textContent = "Главный приз — автомобиль";
  Object.assign(bottomPrize.style, {
    color: FORMULA55_UI.yellow,
    fontSize: "clamp(0.85rem, 2.4vw, 1.1rem)",
    fontWeight: "900",
    letterSpacing: "0.04em",
    marginBottom: "4px",
  });

  const bottomTagline = document.createElement("div");
  bottomTagline.className = "loading-bottom-tagline";
  bottomTagline.textContent =
    "Денежные призы, Freebet и подарки ждут победителей!";
  Object.assign(bottomTagline.style, {
    color: "rgba(255,255,255,0.7)",
    fontSize: "clamp(0.72rem, 2vw, 0.92rem)",
    fontWeight: "600",
    lineHeight: "1.4",
  });

  bottomText.append(bottomPrize, bottomTagline);

  const progressWrap = document.createElement("div");
  Object.assign(progressWrap.style, {
    width: "min(88vw, 420px)",
    marginTop: "clamp(16px, 3vh, 28px)",
  });

  const progressRow = document.createElement("div");
  Object.assign(progressRow.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
    gap: "12px",
  });

  const statusText = document.createElement("span");
  statusText.className = "loading-status";
  statusText.textContent = "Загрузка игры...";
  Object.assign(statusText.style, {
    color: "rgba(255,255,255,0.62)",
    fontSize: "clamp(0.68rem, 1.8vw, 0.82rem)",
    fontWeight: "600",
    flex: "1",
    textAlign: "left",
  });

  const percentText = document.createElement("span");
  percentText.className = "loading-percent";
  percentText.textContent = "0%";
  Object.assign(percentText.style, {
    color: FORMULA55_UI.yellow,
    fontSize: "clamp(0.85rem, 2.2vw, 1rem)",
    fontWeight: "900",
    fontVariantNumeric: "tabular-nums",
    minWidth: "3.2em",
    textAlign: "right",
  });

  progressRow.append(statusText, percentText);

  const barTrack = document.createElement("div");
  Object.assign(barTrack.style, {
    position: "relative",
    height: "8px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    border: "1px solid rgba(231,179,31,0.25)",
  });

  const barFill = document.createElement("div");
  barFill.className = "loading-bar-fill";
  Object.assign(barFill.style, {
    position: "relative",
    width: "0%",
    height: "100%",
    borderRadius: "999px",
    background: `linear-gradient(90deg, #c99a1a, ${FORMULA55_UI.yellow}, #f5d04a)`,
    boxShadow: "0 0 14px rgba(231,179,31,0.45)",
    transition: "width 280ms ease-out",
    overflow: "hidden",
  });

  const barShine = document.createElement("div");
  Object.assign(barShine.style, {
    position: "absolute",
    inset: "0",
    background:
      "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
    width: "40%",
  });
  barFill.appendChild(barShine);
  barTrack.appendChild(barFill);

  progressWrap.append(progressRow, barTrack);

  center.append(title, subtitle, bottomText, progressWrap);

  const legal = document.createElement("div");
  legal.textContent = "Реклама. 18+ ООО «Фортуна»";
  Object.assign(legal.style, {
    position: "relative",
    zIndex: "3",
    padding: "clamp(10px, 2vh, 16px) clamp(14px, 3vw, 24px)",
    color: "rgba(255,255,255,0.38)",
    fontSize: "clamp(0.58rem, 1.6vw, 0.72rem)",
    fontWeight: "500",
    letterSpacing: "0.02em",
  });

  overlay.append(carbon, watermark, posters, center, legal);
  document.body.appendChild(overlay);

  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    show: () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      overlay.classList.remove("loading-overlay--hiding");
      overlay.style.display = "flex";
      overlay.classList.remove("loading-overlay--show");
      void overlay.offsetWidth;
      overlay.classList.add("loading-overlay--show");
    },

    hide: () => {
      overlay.classList.remove("loading-overlay--show");
      overlay.classList.add("loading-overlay--hiding");
      hideTimer = setTimeout(() => {
        overlay.style.display = "none";
        overlay.classList.remove("loading-overlay--hiding");
        hideTimer = null;
      }, HIDE_MS);
    },

    setProgress: (progress: number) => {
      const clamped = clampProgress(progress);
      percentText.textContent = `${Math.round(clamped)}%`;
      barFill.style.width = `${clamped}%`;
    },

    setStatus: (text: string) => {
      statusText.textContent = text;
    },
  };
}
