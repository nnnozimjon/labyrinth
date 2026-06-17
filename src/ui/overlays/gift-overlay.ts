import { FORMULA55_UI } from "./formula55-ui";

export function createGiftOverlay() {
  const style = document.createElement("style");
  style.textContent = `
    #gift-overlay.gift-overlay--show {
      animation: giftOverlayFade 260ms ease-out forwards;
    }

    #gift-overlay.gift-overlay--show .gift-card {
      animation: giftCardPop 360ms cubic-bezier(.2,1.2,.2,1) forwards;
    }

    #gift-overlay.gift-overlay--show .gift-prize {
      animation: giftPrizePop 520ms cubic-bezier(.2,1.35,.2,1) forwards;
    }

    #gift-ok-btn:hover {
      filter: brightness(1.08);
      transform: translateY(-2px) skewX(-8deg);
      box-shadow:
        0 18px 38px rgba(0,0,0,0.55),
        0 0 34px rgba(255,221,38,0.38),
        inset 0 2px 0 rgba(255,255,255,0.45) !important;
    }

    #gift-ok-btn:active {
      transform: translateY(1px) skewX(-8deg);
    }

    @keyframes giftOverlayFade {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes giftCardPop {
      from { opacity: 0; transform: scale(.92) translateY(24px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    @keyframes giftPrizePop {
      from { opacity: 0; transform: scale(.72) rotate(-8deg); }
      to { opacity: 1; transform: scale(1) rotate(0deg); }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "gift-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "1000",
    padding: "20px",
    background: `
      radial-gradient(circle at 50% 45%, rgba(255,221,38,0.14), transparent 32%),
      radial-gradient(circle at 50% 50%, rgba(0,0,0,0.42), rgba(0,0,0,0.86) 100%)
    `,
    fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
    pointerEvents: "auto",
  });

  const card = document.createElement("div");
  card.className = "gift-card";
  Object.assign(card.style, {
    position: "relative",
    isolation: "isolate",
    width: "min(92vw, 620px)",
    overflow: "hidden",
    padding: "clamp(34px, 5vw, 54px) clamp(24px, 5vw, 58px)",
    borderRadius: "28px",
    border: "1px solid rgba(255,221,38,0.9)",
    background: `
      linear-gradient(145deg, rgba(12,12,12,0.98), rgba(0,0,0,0.9)),
      repeating-linear-gradient(135deg, rgba(255,221,38,0.07) 0 8px, transparent 8px 22px)
    `,
    textAlign: "center",
    boxShadow: `
      0 30px 80px rgba(0,0,0,0.72),
      0 0 42px rgba(255,221,38,0.22),
      inset 0 1px 0 rgba(255,255,255,0.12)
    `,
  });

  const watermark = document.createElement("div");
  watermark.textContent = "55";
  Object.assign(watermark.style, {
    position: "absolute",
    right: "-8%",
    bottom: "-16%",
    zIndex: "-1",
    fontSize: "clamp(8rem, 28vw, 15rem)",
    fontWeight: "1000",
    fontStyle: "italic",
    color: "rgba(255,221,38,0.055)",
    lineHeight: "1",
    pointerEvents: "none",
  });

  const title = document.createElement("h1");
  title.innerHTML = `ПОДАРОК <span style="color:${FORMULA55_UI.yellow}">С СЮРПРИЗОМ!</span>`;
  Object.assign(title.style, {
    margin: "0 0 10px",
    color: "#ffffff",
    fontSize: "clamp(2rem, 6vw, 3rem)",
    fontWeight: "1000",
    fontStyle: "italic",
    letterSpacing: "0.04em",
    lineHeight: "1.05",
    textShadow: "0 8px 24px rgba(0,0,0,0.65)",
  });

  const sub = document.createElement("p");
  sub.textContent = "Внутри мы спрятали подарок от FORMULA55";
  Object.assign(sub.style, {
    color: "rgba(255,255,255,0.76)",
    fontSize: "clamp(0.95rem, 2.8vw, 1.15rem)",
    fontWeight: "700",
    letterSpacing: "0.03em",
    margin: "0 0 clamp(26px, 4vh, 38px)",
  });

  const prizeWrap = document.createElement("div");
  Object.assign(prizeWrap.style, {
    position: "relative",
    width: "min(54vw, 230px)",
    height: "min(54vw, 230px)",
    margin: "0 auto clamp(32px, 5vh, 48px)",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: `
      radial-gradient(circle, rgba(255,221,38,0.24), transparent 62%),
      linear-gradient(145deg, rgba(255,255,255,0.08), rgba(0,0,0,0.24))
    `,
    boxShadow: `
      0 0 44px rgba(255,221,38,0.25),
      inset 0 1px 0 rgba(255,255,255,0.12)
    `,
  });

  const prize = document.createElement("div");
  prize.className = "gift-prize";
  prize.textContent = "🎁";
  Object.assign(prize.style, {
    fontSize: "clamp(5rem, 18vw, 9rem)",
    lineHeight: "1",
    filter: "drop-shadow(0 18px 24px rgba(0,0,0,0.45)) drop-shadow(0 0 24px rgba(255,221,38,0.35))",
  });

  prizeWrap.appendChild(prize);

  const btn = document.createElement("button");
  btn.id = "gift-ok-btn";
  btn.type = "button";
  Object.assign(btn.style, {
    position: "relative",
    isolation: "isolate",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    width: "min(100%, 420px)",
    height: "64px",
    border: "1px solid rgba(255,221,38,0.9)",
    borderRadius: "16px",
    overflow: "hidden",
    cursor: "pointer",
    color: FORMULA55_UI.textDark,
    fontSize: "clamp(0.95rem, 2.7vw, 1.15rem)",
    fontWeight: "1000",
    letterSpacing: "0.12em",
    fontFamily: "inherit",
    background: `linear-gradient(135deg, ${FORMULA55_UI.yellow}, #d49b0a)`,
    transform: "skewX(-8deg)",
    transition: "filter 160ms ease, box-shadow 160ms ease, transform 120ms ease",
    boxShadow: `
      0 14px 30px rgba(0,0,0,0.45),
      0 0 26px rgba(255,221,38,0.26),
      inset 0 2px 0 rgba(255,255,255,0.36)
    `,
  });

  const btnShine = document.createElement("span");
  Object.assign(btnShine.style, {
    position: "absolute",
    inset: "0",
    zIndex: "-1",
    background: `
      linear-gradient(110deg, transparent 0%, transparent 30%, rgba(255,255,255,0.4) 45%, transparent 58%),
      repeating-linear-gradient(135deg, rgba(0,0,0,0.12) 0 8px, transparent 8px 18px)
    `,
    opacity: "0.5",
  });

  const btnArrow = document.createElement("span");
  btnArrow.textContent = "▶";
  Object.assign(btnArrow.style, {
    transform: "skewX(8deg)",
    fontSize: "1.1em",
    lineHeight: "1",
  });

  const btnLabel = document.createElement("span");
  btnLabel.textContent = "ЗАБРАТЬ ПОДАРОК";
  Object.assign(btnLabel.style, {
    transform: "skewX(8deg)",
  });

  btn.append(btnShine, btnArrow, btnLabel);

  card.append(watermark, title, sub, prizeWrap, btn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  return {
    show: () => {
      overlay.style.display = "flex";
      overlay.classList.remove("gift-overlay--show");
      void overlay.offsetWidth;
      overlay.classList.add("gift-overlay--show");
    },
    hide: () => {
      overlay.style.display = "none";
      overlay.classList.remove("gift-overlay--show");
    },
    onOkay: (cb: () => void) => {
      btn.addEventListener("click", cb);
    },
  };
}