import { FORMULA55_UI } from "./formula55-ui";
import { createCheckmarkIcon } from "./icons";

const WIN_STEPPER_TOTAL = 3;

function remainingLevelsLabel(remaining: number): string {
  const mod10 = remaining % 10;
  const mod100 = remaining % 100;
  let word: string;
  if (mod100 >= 11 && mod100 <= 14) {
    word = "УРОВНЕЙ";
  } else if (mod10 === 1) {
    word = "УРОВЕНЬ";
  } else if (mod10 >= 2 && mod10 <= 4) {
    word = "УРОВНЯ";
  } else {
    word = "УРОВНЕЙ";
  }
  return `ПРОЙДИ ЕЩЁ ${remaining} ${word}!`;
}

export function createWinOverlay(stepperTotal = WIN_STEPPER_TOTAL) {
  const style = document.createElement("style");
  style.textContent = `
    #win-overlay {
      --f55-yellow: ${FORMULA55_UI.yellow};
      --f55-dark: ${FORMULA55_UI.textDark};
      overflow: hidden;
    }

    #win-overlay .win-card {
      overflow: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    #win-overlay .win-card::-webkit-scrollbar {
      display: none;
    }

    #win-overlay.win-overlay--show {
      animation: winFadeIn 260ms ease-out forwards;
    }

    #win-overlay.win-overlay--show .win-card {
      animation: winCardPop 360ms cubic-bezier(.2,1.2,.2,1) forwards;
    }

    #win-next-btn:hover {
      filter: brightness(1.08);
      box-shadow:
        0 18px 38px rgba(0,0,0,.55),
        0 0 34px rgba(255,221,38,.38),
        inset 0 2px 0 rgba(255,255,255,.45);
    }

    #win-next-btn:active {
      transform: translateY(1px) skewX(-8deg);
    }

    @keyframes winFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes winCardPop {
      from { opacity: 0; transform: scale(.92) translateY(24px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "win-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "1000",
    padding: "16px",
    overflow: "hidden",
    background: `
      radial-gradient(circle at 50% 45%, rgba(255,221,38,0.12), transparent 34%),
      radial-gradient(circle at 50% 50%, rgba(0,0,0,0.35), rgba(0,0,0,0.82) 100%)
    `,
    fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
    pointerEvents: "auto",
  });

  const card = document.createElement("div");
  card.className = "win-card";
  Object.assign(card.style, {
    position: "relative",
    isolation: "isolate",
    width: "min(92vw, 620px)",
    maxHeight: "min(96vh, 840px)",
    overflow: "hidden",
    padding: "clamp(20px, 3.5vw, 36px)",
    borderRadius: "28px",
    border: "1px solid rgba(255,221,38,0.9)",
    background: `
      linear-gradient(145deg, rgba(12,12,12,0.98), rgba(0,0,0,0.88)),
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
    bottom: "-10%",
    zIndex: "-1",
    fontSize: "clamp(8rem, 28vw, 15rem)",
    fontWeight: "1000",
    fontStyle: "italic",
    color: "rgba(255,221,38,0.055)",
    lineHeight: "1",
    pointerEvents: "none",
  });

  const title = document.createElement("h1");
  title.innerHTML = `УРОВЕНЬ <span style="color:${FORMULA55_UI.yellow}">ПРОЙДЕН!</span>`;
  Object.assign(title.style, {
    margin: "0 0 clamp(14px, 2.5vh, 22px)",
    color: "#ffffff",
    fontSize: "clamp(2rem, 6vw, 3rem)",
    fontWeight: "1000",
    fontStyle: "italic",
    letterSpacing: "0.05em",
    lineHeight: "1",
    textShadow: "0 8px 24px rgba(0,0,0,0.65)",
  });

  const heroWrap = document.createElement("div");
  Object.assign(heroWrap.style, {
    position: "relative",
    width: "min(100%, 420px)",
    margin: "0 auto clamp(14px, 2.5vh, 20px)",
  });

  const heroGlow = document.createElement("div");
  Object.assign(heroGlow.style, {
    position: "absolute",
    inset: "-36px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,221,38,0.28), transparent 62%)",
    filter: "blur(6px)",
  });

  const mainImage = document.createElement("div");
  Object.assign(mainImage.style, {
    position: "relative",
    aspectRatio: "16 / 9",
    borderRadius: "20px",
    border: "1px solid rgba(255,221,38,0.55)",
    background: `
      linear-gradient(145deg, rgba(255,255,255,0.1), rgba(0,0,0,0.35)),
      rgba(255,255,255,0.04)
    `,
    boxShadow: `
      0 18px 40px rgba(0,0,0,0.55),
      0 0 28px rgba(255,221,38,0.18),
      inset 0 1px 0 rgba(255,255,255,0.16)
    `,
  });

  heroWrap.append(heroGlow, mainImage);

  const productRow = document.createElement("div");
  Object.assign(productRow.style, {
    display: "flex",
    justifyContent: "center",
    gap: "clamp(18px, 5vw, 34px)",
    margin: "clamp(-6px, -1vh, 0px) 0 clamp(16px, 2.5vh, 24px)",
  });

  const createPrizeCircle = () => {
    const item = document.createElement("div");
    Object.assign(item.style, {
      width: "clamp(86px, 18vw, 118px)",
      height: "clamp(86px, 18vw, 118px)",
      borderRadius: "50%",
      border: "1px solid rgba(255,221,38,0.75)",
      background: `
        radial-gradient(circle at 35% 25%, rgba(255,255,255,0.16), transparent 35%),
        linear-gradient(145deg, rgba(18,18,18,0.95), rgba(0,0,0,0.75))
      `,
      boxShadow: `
        0 16px 34px rgba(0,0,0,0.55),
        0 0 24px rgba(255,221,38,0.2),
        inset 0 1px 0 rgba(255,255,255,0.12)
      `,
      flexShrink: "0",
    });
    return item;
  };

  const productLeft = createPrizeCircle();
  const productRight = createPrizeCircle();
  productRow.append(productLeft, productRight);

  const infoLine1 = document.createElement("p");
  infoLine1.textContent = "ВЫ НА ОДИН ШАГ БЛИЖЕ К ПРИЗАМ.";
  Object.assign(infoLine1.style, {
    color: "#ffffff",
    fontSize: "clamp(0.95rem, 2.8vw, 1.15rem)",
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: "0.045em",
    margin: "0 0 6px",
    lineHeight: "1.35",
  });

  const infoLine2 = document.createElement("p");
  Object.assign(infoLine2.style, {
    color: "rgba(255,255,255,0.72)",
    fontSize: "clamp(0.78rem, 2.2vw, 0.95rem)",
    fontWeight: "700",
    letterSpacing: "0.04em",
    margin: "0 0 clamp(16px, 2.5vh, 22px)",
  });

  const stepper = document.createElement("div");
  Object.assign(stepper.style, {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: "clamp(10px, 2.6vw, 16px)",
    marginBottom: "clamp(18px, 3vh, 28px)",
  });

  type StepElements = {
    box: HTMLDivElement;
    number: HTMLSpanElement;
    check: SVGSVGElement;
  };

  const steps: StepElements[] = [];

  for (let i = 1; i <= stepperTotal; i++) {
    const stepWrap = document.createElement("div");
    Object.assign(stepWrap.style, {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "6px",
    });

    const check = createCheckmarkIcon();
    Object.assign(check.style, {
      visibility: "hidden",
      filter: "drop-shadow(0 0 8px rgba(255,221,38,0.7))",
    });

    const box = document.createElement("div");
    Object.assign(box.style, {
      width: "clamp(42px, 10vw, 56px)",
      height: "clamp(42px, 10vw, 56px)",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "1px solid rgba(255,221,38,0.32)",
      background: "rgba(255,255,255,0.045)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
    });

    const number = document.createElement("span");
    number.textContent = String(i);
    Object.assign(number.style, {
      fontSize: "clamp(1rem, 3vw, 1.3rem)",
      fontWeight: "1000",
      lineHeight: "1",
      color: "rgba(255,255,255,0.38)",
    });

    box.appendChild(number);
    stepWrap.append(check, box);
    stepper.appendChild(stepWrap);
    steps.push({ box, number, check });
  }

  const updateProgress = (completedLevel: number) => {
    const remaining = Math.max(0, stepperTotal - completedLevel);
    infoLine2.textContent =
      remaining === 0
        ? "ВСЕ УРОВНИ ПРОЙДЕНЫ!"
        : remainingLevelsLabel(remaining);

    for (let i = 0; i < steps.length; i++) {
      const stepNum = i + 1;
      const { box, number, check } = steps[i];

      if (stepNum <= completedLevel) {
        Object.assign(box.style, {
          background: `linear-gradient(145deg, ${FORMULA55_UI.yellow}, #c98e08)`,
          borderColor: FORMULA55_UI.yellow,
          boxShadow: "0 0 22px rgba(255,221,38,0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
        });
        number.style.color = FORMULA55_UI.textDark;
        check.style.visibility = "visible";
      } else {
        Object.assign(box.style, {
          background: "rgba(255,255,255,0.045)",
          borderColor: "rgba(255,221,38,0.25)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
        });
        number.style.color = "rgba(255,255,255,0.35)";
        check.style.visibility = "hidden";
      }
    }
  };

  const btn = document.createElement("button");
  btn.id = "win-next-btn";
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
    fontSize: "clamp(0.95rem, 2.7vw, 1.2rem)",
    fontWeight: "1000",
    letterSpacing: "0.13em",
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


  const btnLabel = document.createElement("span");
  btnLabel.textContent = "ПРОДОЛЖИТЬ";
  Object.assign(btnLabel.style, {
    transform: "skewX(8deg)",
  });

  btn.append(btnShine, btnLabel);

  card.append(
    watermark,
    title,
    heroWrap,
    productRow,
    infoLine1,
    infoLine2,
    stepper,
    btn
  );

  overlay.append(card);
  document.body.appendChild(overlay);

  return {
    show: (completedLevel = 1) => {
      updateProgress(completedLevel);
      overlay.style.display = "flex";
      overlay.classList.remove("win-overlay--show");
      void overlay.offsetWidth;
      overlay.classList.add("win-overlay--show");
    },
    hide: () => {
      overlay.style.display = "none";
      overlay.classList.remove("win-overlay--show");
    },
    onNextLevel: (cb: () => void) => {
      btn.addEventListener("click", cb);
    },
  };
}