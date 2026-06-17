import { FORMULA55_UI } from "./overlays/formula55-ui";
import { createSvgIcon } from "./overlays/icons";

const FORMULA55_CAMPAIGNS_URL = "https://formula55.tj/campaigns";

const PRIZE_ICON_PATHS = [
  "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
  "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z",
  "M22 10V6c0-1.11-.9-2-2-2H4c-1.1 0-1.99.89-1.99 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-2-1.46c-1.19.69-2 1.99-2 3.46s.81 2.77 2 3.46V18H4v-2.54c1.19-.69 2-1.99 2-3.46 0-1.48-.8-2.77-1.99-3.46L4 6h16v2.54zM11.5 9v3.5h1V9h-1z",
  "M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 12 7.4l3.38 4.6L17 10.83 14.92 8H20v6z",
] as const;

const PRIZE_LABELS = [
  "Автомобиль",
  "Денежные призы",
  "Freebet",
  "Бонусы",
] as const;

export function createFinalWinOverlay() {
  const style = document.createElement("style");
  style.textContent = `
    #final-win-overlay {
      --f55-yellow: ${FORMULA55_UI.yellow};
      --f55-dark: ${FORMULA55_UI.textDark};
      overflow: hidden;
    }

    #final-win-overlay .final-win-card {
      overflow: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    #final-win-overlay .final-win-card::-webkit-scrollbar {
      display: none;
    }

    #final-win-overlay.final-win-overlay--show {
      animation: finalWinFadeIn 280ms ease-out forwards;
    }

    #final-win-overlay.final-win-overlay--hide {
      animation: finalWinFadeOut 220ms ease-in forwards;
    }

    #final-win-overlay.final-win-overlay--show .final-win-card {
      animation: finalWinCardPop 380ms cubic-bezier(.2,1.2,.2,1) forwards;
    }

    #final-win-overlay.final-win-overlay--show .final-win-gift {
      animation: finalWinGiftPop 520ms cubic-bezier(.2,1.35,.2,1) forwards;
    }

    #final-win-bonus-btn:hover {
      filter: brightness(1.08);
      box-shadow:
        0 18px 38px rgba(0,0,0,.55),
        0 0 34px rgba(255,221,38,.38),
        inset 0 2px 0 rgba(255,255,255,.45);
    }

    #final-win-bonus-btn:active,
    #final-win-client-btn:active {
      transform: translateY(1px) skewX(-8deg);
    }

    #final-win-client-btn:hover {
      filter: brightness(1.08);
      transform: translateY(-2px) skewX(-8deg);
      box-shadow:
        0 18px 38px rgba(0,0,0,.55),
        0 0 24px rgba(255,221,38,.22),
        inset 0 1px 0 rgba(255,255,255,.08);
    }

    .final-win-particle {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle, rgba(255,221,38,0.9), rgba(255,221,38,0));
      animation: finalWinParticleFloat 4s ease-in-out infinite;
    }

    @keyframes finalWinFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes finalWinFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes finalWinCardPop {
      from { opacity: 0; transform: scale(.92) translateY(24px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    @keyframes finalWinGiftPop {
      from { opacity: 0; transform: scale(.72) rotate(-6deg); }
      to { opacity: 1; transform: scale(1) rotate(0deg); }
    }

    @keyframes finalWinParticleFloat {
      0%, 100% { opacity: 0.15; transform: translateY(0) scale(1); }
      50% { opacity: 0.55; transform: translateY(-12px) scale(1.15); }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "final-win-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "1100",
    padding: "16px",
    overflow: "hidden",
    background: `
      radial-gradient(circle at 50% 42%, rgba(255,221,38,0.14), transparent 36%),
      radial-gradient(circle at 50% 50%, rgba(0,0,0,0.45), rgba(0,0,0,0.88) 100%)
    `,
    fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
    pointerEvents: "auto",
  });

  const particles = document.createElement("div");
  Object.assign(particles.style, {
    position: "absolute",
    inset: "0",
    overflow: "hidden",
    pointerEvents: "none",
  });

  const particleSpecs = [
    { left: "12%", top: "18%", size: 6, delay: "0s" },
    { left: "78%", top: "22%", size: 5, delay: "0.8s" },
    { left: "88%", top: "62%", size: 4, delay: "1.4s" },
    { left: "18%", top: "72%", size: 5, delay: "2.1s" },
    { left: "50%", top: "12%", size: 4, delay: "0.4s" },
    { left: "62%", top: "84%", size: 6, delay: "1.8s" },
  ];

  for (const spec of particleSpecs) {
    const p = document.createElement("div");
    p.className = "final-win-particle";
    Object.assign(p.style, {
      left: spec.left,
      top: spec.top,
      width: `${spec.size}px`,
      height: `${spec.size}px`,
      animationDelay: spec.delay,
    });
    particles.appendChild(p);
  }

  const card = document.createElement("div");
  card.className = "final-win-card";
  Object.assign(card.style, {
    position: "relative",
    isolation: "isolate",
    width: "min(92vw, 640px)",
    maxHeight: "min(96vh, 860px)",
    overflow: "auto",
    padding: "clamp(22px, 3.5vw, 38px)",
    borderRadius: "28px",
    border: "1px solid rgba(255,221,38,0.9)",
    background: `
      linear-gradient(145deg, rgba(12,12,12,0.98), rgba(0,0,0,0.9)),
      repeating-linear-gradient(135deg, rgba(255,221,38,0.08) 0 8px, transparent 8px 22px)
    `,
    textAlign: "center",
    boxShadow: `
      0 30px 80px rgba(0,0,0,0.72),
      0 0 48px rgba(255,221,38,0.24),
      inset 0 1px 0 rgba(255,255,255,0.12)
    `,
  });

  const watermark = document.createElement("div");
  watermark.textContent = "55";
  Object.assign(watermark.style, {
    position: "absolute",
    right: "-6%",
    bottom: "-12%",
    zIndex: "-1",
    fontSize: "clamp(8rem, 28vw, 15rem)",
    fontWeight: "1000",
    fontStyle: "italic",
    color: "rgba(255,221,38,0.055)",
    lineHeight: "1",
    pointerEvents: "none",
  });

  const title = document.createElement("h1");
  title.innerHTML = `ИГРА <span style="color:${FORMULA55_UI.yellow}">ПРОЙДЕНА!</span>`;
  Object.assign(title.style, {
    margin: "0 0 10px",
    color: "#ffffff",
    fontSize: "clamp(2rem, 6vw, 3rem)",
    fontWeight: "1000",
    fontStyle: "italic",
    letterSpacing: "0.05em",
    lineHeight: "1.05",
    textShadow: "0 8px 24px rgba(0,0,0,0.65)",
  });

  const subtitle = document.createElement("p");
  subtitle.textContent =
    "Ты прошёл все уровни. Участвуй в акциях Formula55 и забирай бонусы.";
  Object.assign(subtitle.style, {
    color: "rgba(255,255,255,0.78)",
    fontSize: "clamp(0.9rem, 2.6vw, 1.1rem)",
    fontWeight: "700",
    letterSpacing: "0.03em",
    margin: "0 0 clamp(18px, 3vh, 26px)",
    lineHeight: "1.4",
  });

  const giftGlow = document.createElement("div");
  Object.assign(giftGlow.style, {
    position: "absolute",
    inset: "-28px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,221,38,0.3), transparent 65%)",
    filter: "blur(8px)",
  });

  const giftBox = document.createElement("div");
  giftBox.className = "final-win-gift";
  Object.assign(giftBox.style, {
    position: "relative",
    width: "min(44vw, 160px)",
    height: "min(44vw, 160px)",
    borderRadius: "18px",
    border: "2px solid rgba(255,221,38,0.85)",
    background: `
      linear-gradient(145deg, rgba(255,221,38,0.22), rgba(0,0,0,0.35)),
      repeating-linear-gradient(135deg, rgba(255,221,38,0.12) 0 6px, transparent 6px 16px)
    `,
    boxShadow: `
      0 18px 40px rgba(0,0,0,0.55),
      0 0 32px rgba(255,221,38,0.22),
      inset 0 1px 0 rgba(255,255,255,0.18)
    `,
  });

  const ribbonV = document.createElement("div");
  Object.assign(ribbonV.style, {
    position: "absolute",
    left: "50%",
    top: "0",
    width: "22%",
    height: "100%",
    transform: "translateX(-50%)",
    background: `linear-gradient(180deg, ${FORMULA55_UI.yellow}, #c98e08)`,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
  });

  const ribbonH = document.createElement("div");
  Object.assign(ribbonH.style, {
    position: "absolute",
    top: "38%",
    left: "0",
    width: "100%",
    height: "22%",
    background: `linear-gradient(90deg, ${FORMULA55_UI.yellow}, #c98e08)`,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
  });

  const bow = document.createElement("div");
  Object.assign(bow.style, {
    position: "absolute",
    top: "-14%",
    left: "50%",
    width: "48%",
    height: "28%",
    transform: "translateX(-50%)",
    borderRadius: "50% 50% 0 0",
    border: `2px solid ${FORMULA55_UI.yellow}`,
    background: `radial-gradient(circle at 50% 80%, ${FORMULA55_UI.yellow}, #a87d08)`,
    boxShadow: "0 0 18px rgba(255,221,38,0.35)",
  });

  giftBox.append(ribbonV, ribbonH, bow);

  const message = document.createElement("p");
  message.textContent =
    "Регистрируйся на FORMULA55.TJ, участвуй в акциях и получай шанс выиграть призы.";
  Object.assign(message.style, {
    color: "#ffffff",
    fontSize: "clamp(0.88rem, 2.5vw, 1.05rem)",
    fontWeight: "800",
    fontStyle: "italic",
    letterSpacing: "0.04em",
    margin: "0 0 clamp(18px, 3vh, 26px)",
    lineHeight: "1.45",
  });

  const prizeGrid = document.createElement("div");
  Object.assign(prizeGrid.style, {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "clamp(10px, 2.5vw, 16px)",
    marginBottom: "clamp(20px, 3vh, 30px)",
  });

  for (let i = 0; i < PRIZE_LABELS.length; i++) {
    const prizeCard = document.createElement("div");
    Object.assign(prizeCard.style, {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
      padding: "clamp(12px, 2.5vw, 16px)",
      borderRadius: "16px",
      border: "1px solid rgba(255,221,38,0.45)",
      background: `
        radial-gradient(circle at 35% 25%, rgba(255,255,255,0.1), transparent 40%),
        linear-gradient(145deg, rgba(18,18,18,0.95), rgba(0,0,0,0.78))
      `,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
    });

    const iconWrap = document.createElement("span");
    Object.assign(iconWrap.style, {
      display: "grid",
      placeItems: "center",
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      background: `linear-gradient(145deg, ${FORMULA55_UI.yellow}, #c98e08)`,
      boxShadow: "0 0 16px rgba(255,221,38,0.3)",
    });

    const icon = createSvgIcon(PRIZE_ICON_PATHS[i], "0 0 24 24", FORMULA55_UI.textDark);
    iconWrap.appendChild(icon);

    const label = document.createElement("strong");
    label.textContent = PRIZE_LABELS[i];
    Object.assign(label.style, {
      color: "#ffffff",
      fontSize: "clamp(0.78rem, 2.2vw, 0.92rem)",
      fontWeight: "900",
      letterSpacing: "0.03em",
      lineHeight: "1.2",
    });

    prizeCard.append(iconWrap, label);
    prizeGrid.appendChild(prizeCard);
  }

  const actions = document.createElement("div");
  Object.assign(actions.style, {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
  });

  const createButton = (
    id: string,
    text: string,
    variant: "primary" | "secondary"
  ) => {
    const btn = document.createElement("button");
    btn.id = id;
    btn.type = "button";
    Object.assign(btn.style, {
      position: "relative",
      isolation: "isolate",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "min(100%, 420px)",
      height: "64px",
      border: "1px solid rgba(255,221,38,0.9)",
      borderRadius: "16px",
      overflow: "hidden",
      cursor: "pointer",
      color:
        variant === "primary" ? FORMULA55_UI.textDark : FORMULA55_UI.yellow,
      fontSize: "clamp(0.85rem, 2.4vw, 1.05rem)",
      fontWeight: "1000",
      letterSpacing: "0.1em",
      fontFamily: "inherit",
      background:
        variant === "primary"
          ? `linear-gradient(135deg, ${FORMULA55_UI.yellow}, #d49b0a)`
          : `linear-gradient(145deg, rgba(20,20,20,0.95), rgba(0,0,0,0.85))`,
      transform: "skewX(-8deg)",
      transition: "filter 160ms ease, box-shadow 160ms ease, transform 120ms ease",
      boxShadow:
        variant === "primary"
          ? `
            0 14px 30px rgba(0,0,0,0.45),
            0 0 26px rgba(255,221,38,0.26),
            inset 0 2px 0 rgba(255,255,255,0.36)
          `
          : `
            0 14px 30px rgba(0,0,0,0.45),
            inset 0 1px 0 rgba(255,255,255,0.08)
          `,
    });

    const shine = document.createElement("span");
    Object.assign(shine.style, {
      position: "absolute",
      inset: "0",
      zIndex: "-1",
      background:
        variant === "primary"
          ? `
            linear-gradient(110deg, transparent 0%, transparent 30%, rgba(255,255,255,0.4) 45%, transparent 58%),
            repeating-linear-gradient(135deg, rgba(0,0,0,0.12) 0 8px, transparent 8px 18px)
          `
          : `
            linear-gradient(110deg, transparent 0%, transparent 30%, rgba(255,221,38,0.14) 45%, transparent 58%),
            repeating-linear-gradient(135deg, rgba(255,221,38,0.08) 0 8px, transparent 8px 18px)
          `,
      opacity: "0.5",
    });

    const label = document.createElement("span");
    label.textContent = text;
    Object.assign(label.style, {
      transform: "skewX(8deg)",
    });

    btn.append(shine, label);
    return btn;
  };

  const bonusBtn = createButton("final-win-bonus-btn", "ЗАБРАТЬ БОНУС", "primary");
  const clientBtn = createButton("final-win-client-btn", "Я УЖЕ КЛИЕНТ", "secondary");
  actions.append(bonusBtn, clientBtn);

  const legal = document.createElement("p");
  legal.textContent = "Реклама. 18+ ООО «Фортуна»";
  Object.assign(legal.style, {
    margin: "0",
    color: "rgba(255,255,255,0.42)",
    fontSize: "clamp(0.68rem, 1.8vw, 0.78rem)",
    fontWeight: "600",
    letterSpacing: "0.04em",
  });

  card.append(
    watermark,
    title,
    subtitle,
    message,
    prizeGrid,
    actions,
    legal
  );

  overlay.append(particles, card);
  document.body.appendChild(overlay);

  let alreadyClientCb: (() => void) | null = null;
  let hideTimer: number | null = null;

  const hide = () => {
    overlay.classList.remove("final-win-overlay--show");
    overlay.classList.add("final-win-overlay--hide");
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
    }
    hideTimer = window.setTimeout(() => {
      overlay.style.display = "none";
      overlay.classList.remove("final-win-overlay--hide");
      hideTimer = null;
    }, 220);
  };

  bonusBtn.addEventListener("click", () => {
    window.open(FORMULA55_CAMPAIGNS_URL, "_blank", "noopener,noreferrer");
  });

  clientBtn.addEventListener("click", () => {
    hide();
    alreadyClientCb?.();
  });

  return {
    show: () => {
      overlay.style.display = "flex";
      overlay.classList.remove("final-win-overlay--hide");
      overlay.classList.remove("final-win-overlay--show");
      void overlay.offsetWidth;
      overlay.classList.add("final-win-overlay--show");
    },
    hide,
    onAlreadyClient: (cb: () => void) => {
      alreadyClientCb = cb;
    },
  };
}
