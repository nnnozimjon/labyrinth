import { FORMULA55_UI } from "./formula55-ui";
import { createSvgIcon } from "./icons";

export function createStartOverlay(_level = 1) {
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Russo+One&display=swap');

    #start-overlay {
      --f55-yellow: ${FORMULA55_UI.yellow};
      --f55-yellow-hover: ${FORMULA55_UI.yellowHover};
      --f55-dark: ${FORMULA55_UI.textDark};
      --f55-cream: ${FORMULA55_UI.textCream};
    }

    #start-overlay.start-overlay--show {
      animation: startOverlayFade 360ms ease-out forwards;
    }

    #start-overlay.start-overlay--show .start-header {
      animation: startHeaderDrop 460ms ease-out forwards;
    }

    #start-overlay.start-overlay--show .start-hero {
      animation: startHeroPop 520ms cubic-bezier(.2,1.2,.2,1) forwards;
    }

    #start-overlay.start-overlay--show .start-footer {
      animation: startFooterUp 520ms ease-out forwards;
    }

    .start-icon-btn:active {
      transform: translateY(1px) skewX(-8deg) !important;
    }

    #start-game-btn {
      animation: startButtonPulse 2.4s ease-in-out infinite;
    }

    #start-game-btn:hover {
      filter: brightness(1.1);
      box-shadow:
        0 22px 50px rgba(0,0,0,0.62),
        0 0 46px rgba(255,221,38,0.5),
        inset 0 2px 0 rgba(255,255,255,0.55),
        inset 0 -4px 0 rgba(120,70,0,0.3) !important;
    }

    #start-game-btn:active {
      transform: translateY(1px) skewX(-8deg) !important;
    }

    @keyframes startOverlayFade {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes startHeaderDrop {
      from { opacity: 0; transform: translateY(-18px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes startHeroPop {
      from { opacity: 0; transform: scale(.94) translateY(18px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    @keyframes startFooterUp {
      from { opacity: 0; transform: translateY(22px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes startButtonPulse {
      0%, 100% {
        box-shadow:
          0 16px 38px rgba(0,0,0,0.55),
          0 0 28px rgba(255,221,38,0.3),
          inset 0 2px 0 rgba(255,255,255,0.45),
          inset 0 -4px 0 rgba(120,70,0,0.3);
      }
      50% {
        box-shadow:
          0 22px 52px rgba(0,0,0,0.65),
          0 0 52px rgba(255,221,38,0.55),
          inset 0 2px 0 rgba(255,255,255,0.55),
          inset 0 -4px 0 rgba(120,70,0,0.3);
      }
    }

    @keyframes startFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    @keyframes startShine {
      0% { transform: translateX(-120%) skewX(-18deg); }
      55%, 100% { transform: translateX(220%) skewX(-18deg); }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "start-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "space-between",
    zIndex: "900",
    pointerEvents: "auto",
    overflow: "hidden",
    fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
    background: "rgba(0,0,0,0.05)",
  });

  const ambient = document.createElement("div");
  Object.assign(ambient.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    background: `
      radial-gradient(circle at 50% 48%, rgba(255,221,38,0.16), transparent 38%),
      radial-gradient(circle at 20% 20%, rgba(255,221,38,0.08), transparent 26%),
      radial-gradient(circle at 82% 74%, rgba(255,221,38,0.09), transparent 28%),
      linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 34%, rgba(0,0,0,0.42) 74%, rgba(0,0,0,0.82) 100%)
    `,
  });

  const carbon = document.createElement("div");
  Object.assign(carbon.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    opacity: "0.32",
    background: `
      repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 2px, transparent 2px 8px),
      repeating-linear-gradient(45deg, rgba(255,221,38,0.045) 0 1px, transparent 1px 14px)
    `,
  });

  const watermark = document.createElement("div");
  watermark.textContent = "55";
  Object.assign(watermark.style, {
    position: "absolute",
    left: "50%",
    top: "54%",
    transform: "translate(-50%, -50%) rotate(-14deg)",
    fontSize: "clamp(12rem, 38vw, 30rem)",
    fontWeight: "1000",
    fontStyle: "italic",
    letterSpacing: "-0.08em",
    color: "rgba(255,221,38,0.045)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    userSelect: "none",
    lineHeight: "0.8",
  });

  const header = document.createElement("header");
  header.className = "start-header";
  Object.assign(header.style, {
    position: "relative",
    zIndex: "2",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "clamp(16px, 3vw, 30px) clamp(20px, 4vw, 44px)",
    flexShrink: "0",
  });

  const logo = document.createElement("div");
  Object.assign(logo.style, {
    position: "relative",
    isolation: "isolate",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 18px 10px 16px",
    border: "1px solid rgba(255,221,38,0.9)",
    borderRadius: "14px",
    overflow: "hidden",
    background: `
      linear-gradient(135deg, rgba(18,18,18,0.94), rgba(0,0,0,0.74)),
      repeating-linear-gradient(135deg, rgba(255,221,38,0.12) 0 7px, transparent 7px 16px)
    `,
    boxShadow: `
      0 14px 34px rgba(0,0,0,0.48),
      0 0 22px rgba(255,221,38,0.18),
      inset 0 1px 0 rgba(255,255,255,0.12)
    `,
    transform: "skewX(-10deg)",
  });

  const logoText = document.createElement("span");
  logoText.textContent = "FORMULA";
  Object.assign(logoText.style, {
    color: "#ffffff",
    fontSize: "clamp(1.1rem, 2.8vw, 1.7rem)",
    fontWeight: "950",
    fontStyle: "italic",
    letterSpacing: "0.04em",
    lineHeight: "1",
    transform: "skewX(10deg)",
    textShadow: "0 2px 10px rgba(0,0,0,0.55)",
  });

  const logoBadge = document.createElement("span");
  logoBadge.textContent = "55";
  Object.assign(logoBadge.style, {
    color: FORMULA55_UI.yellow,
    fontSize: "clamp(1.15rem, 3vw, 1.85rem)",
    fontWeight: "1000",
    fontStyle: "italic",
    lineHeight: "1",
    transform: "skewX(10deg)",
    textShadow: "0 0 16px rgba(255,221,38,0.45)",
  });

  logo.append(logoText, logoBadge);

  const actions = document.createElement("div");
  Object.assign(actions.style, {
    display: "flex",
    gap: "14px",
    alignItems: "center",
  });

  function makeHeaderIconButton(label: string, path: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "start-icon-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", label);

    const defaultBackground = `
      linear-gradient(145deg, rgba(22,22,22,0.92), rgba(0,0,0,0.72)),
      repeating-linear-gradient(135deg, rgba(255,221,38,0.1) 0 6px, transparent 6px 14px)
    `;
    const defaultBoxShadow = `
      0 12px 26px rgba(0,0,0,0.46),
      0 0 18px rgba(255,221,38,0.16),
      inset 0 1px 0 rgba(255,255,255,0.12)
    `;
    const hoverBoxShadow = `
      0 16px 34px rgba(0,0,0,0.55),
      0 0 26px rgba(255,221,38,0.32),
      inset 0 1px 0 rgba(255,255,255,0.18)
    `;

    Object.assign(btn.style, {
      position: "relative",
      isolation: "isolate",
      width: "56px",
      height: "56px",
      borderRadius: "14px",
      border: `1px solid ${FORMULA55_UI.yellow}`,
      overflow: "hidden",
      background: defaultBackground,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: defaultBoxShadow,
      transition:
        "transform 150ms ease, box-shadow 150ms ease, background 150ms ease",
      transform: "skewX(-8deg)",
    });

    const iconWrap = document.createElement("span");
    Object.assign(iconWrap.style, {
      display: "inline-flex",
      transform: "skewX(8deg)",
    });

    const icon = createSvgIcon(path, "0 0 24 24", FORMULA55_UI.yellow);
    const iconPath = icon.querySelector("path");
    Object.assign(icon.style, {
      width: "28px",
      height: "28px",
      filter: "drop-shadow(0 0 8px rgba(255,221,38,0.35))",
      transition: "filter 150ms ease",
    });

    iconWrap.appendChild(icon);
    btn.append(iconWrap);

    btn.addEventListener("mouseenter", () => {
      if (iconPath) iconPath.setAttribute("fill", FORMULA55_UI.textDark);
      Object.assign(icon.style, { filter: "none" });
      Object.assign(btn.style, {
        transform: "translateY(-2px) skewX(-8deg)",
        background: FORMULA55_UI.yellow,
        boxShadow: hoverBoxShadow,
      });
    });

    btn.addEventListener("mouseleave", () => {
      if (iconPath) iconPath.setAttribute("fill", FORMULA55_UI.yellow);
      Object.assign(icon.style, {
        filter: "drop-shadow(0 0 8px rgba(255,221,38,0.35))",
      });
      Object.assign(btn.style, {
        transform: "skewX(-8deg)",
        background: defaultBackground,
        boxShadow: defaultBoxShadow,
      });
    });

    return btn;
  }

  const menuBtn = makeHeaderIconButton(
    "Menu",
    "M4 7h16v2H4V7zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"
  );

  const soundBtn = makeHeaderIconButton(
    "Sound",
    "M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.15-3.82v7.63A4.48 4.48 0 0 0 16.5 12zm2.82-2.82A7.48 7.48 0 0 1 20 12a7.48 7.48 0 0 1-1.68 4.82l-1.42-1.42A5.48 5.48 0 0 0 17.5 12a5.48 5.48 0 0 0-1.5-3.8l1.42-1.42z"
  );

  actions.append(menuBtn, soundBtn);
  header.append(logo, actions);

  const center = document.createElement("main");
  center.className = "start-hero";
  Object.assign(center.style, {
    position: "relative",
    zIndex: "2",
    flex: "1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 clamp(16px, 4vw, 40px)",
    pointerEvents: "none",
    minHeight: "0",
  });

  const title = document.createElement("h1");
  title.innerHTML = `ВЫИГРАЙ ПРИЗЫ <span style="color:${FORMULA55_UI.yellow}">FORMULA55</span>`;
  Object.assign(title.style, {
    margin: "0 0 10px",
    color: "#ffffff",
    fontSize: "clamp(2rem, 7vw, 4.5rem)",
    fontWeight: "1000",
    fontStyle: "italic",
    letterSpacing: "0.035em",
    lineHeight: "0.95",
    textAlign: "center",
    textShadow: "0 10px 30px rgba(0,0,0,0.7)",
  });

  const subtitle = document.createElement("p");
  subtitle.textContent = "Проходи уровни, находи подарки и открывай награды";
  Object.assign(subtitle.style, {
    margin: "0 0 clamp(16px, 3vh, 26px)",
    color: "rgba(255,255,255,0.78)",
    fontSize: "clamp(0.9rem, 2.4vw, 1.15rem)",
    fontWeight: "700",
    letterSpacing: "0.03em",
    textAlign: "center",
  });

  const prizeCards = document.createElement("div");
  Object.assign(prizeCards.style, {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "clamp(8px, 2vw, 14px)",
    width: "min(92vw, 620px)",
    marginBottom: "clamp(16px, 3vh, 28px)",
  });

  // const prizes = [
  //   { icon: "🎮", title: "Nintendo", desc: "Главный приз" },
  //   { icon: "🎁", title: "Подарки", desc: "Сюрпризы" },
  //   { icon: "🏆", title: "Награды", desc: "За уровни" },
  // ];

  // for (const prize of prizes) {
  //   const card = document.createElement("div");
  //   Object.assign(card.style, {
  //     position: "relative",
  //     overflow: "hidden",
  //     padding: "12px 10px",
  //     borderRadius: "16px",
  //     border: "1px solid rgba(255,221,38,0.65)",
  //     background: `
  //       linear-gradient(145deg, rgba(20,20,20,0.92), rgba(0,0,0,0.72)),
  //       repeating-linear-gradient(135deg, rgba(255,221,38,0.08) 0 6px, transparent 6px 15px)
  //     `,
  //     boxShadow: `
  //       0 12px 26px rgba(0,0,0,0.42),
  //       0 0 20px rgba(255,221,38,0.16),
  //       inset 0 1px 0 rgba(255,255,255,0.1)
  //     `,
  //     textAlign: "center",
  //   });

  //   const icon = document.createElement("div");
  //   icon.textContent = prize.icon;
  //   Object.assign(icon.style, {
  //     fontSize: "clamp(1.45rem, 4vw, 2.3rem)",
  //     lineHeight: "1",
  //     marginBottom: "6px",
  //     filter: "drop-shadow(0 0 10px rgba(255,221,38,0.35))",
  //   });

  //   const prizeTitle = document.createElement("div");
  //   prizeTitle.textContent = prize.title;
  //   Object.assign(prizeTitle.style, {
  //     color: "#fff",
  //     fontSize: "clamp(0.74rem, 2vw, 0.95rem)",
  //     fontWeight: "900",
  //     letterSpacing: "0.04em",
  //     textTransform: "uppercase",
  //   });

  //   const prizeDesc = document.createElement("div");
  //   prizeDesc.textContent = prize.desc;
  //   Object.assign(prizeDesc.style, {
  //     marginTop: "3px",
  //     color: "rgba(255,255,255,0.58)",
  //     fontSize: "clamp(0.62rem, 1.7vw, 0.78rem)",
  //     fontWeight: "700",
  //   });

  //   card.append(icon, prizeTitle, prizeDesc);
  //   prizeCards.appendChild(card);
  // }

  // const boardFrame = document.createElement("div");
  // Object.assign(boardFrame.style, {
  //   position: "relative",
  //   width: "min(82vw, 560px)",
  //   aspectRatio: "4 / 3",
  //   borderRadius: "24px",
  //   padding: "clamp(6px, 1.1vw, 10px)",
  //   background: `
  //     linear-gradient(145deg, rgba(255,240,60,0.98), rgba(196,130,0,0.96)),
  //     repeating-linear-gradient(135deg, rgba(0,0,0,0.14) 0 8px, transparent 8px 18px)
  //   `,
  //   boxShadow: `
  //     0 0 0 2px rgba(0,0,0,0.62),
  //     0 0 42px rgba(255,221,38,0.32),
  //     0 22px 58px rgba(0,0,0,0.56)
  //   `,
  //   transform: "perspective(1200px) rotateX(4deg)",
  //   pointerEvents: "none",
  // });

  // const boardInner = document.createElement("div");
  // Object.assign(boardInner.style, {
  //   position: "relative",
  //   width: "100%",
  //   height: "100%",
  //   borderRadius: "17px",
  //   overflow: "hidden",
  //   background: `
  //     radial-gradient(circle at 50% 42%, rgba(255,221,38,0.18), transparent 38%),
  //     linear-gradient(145deg, rgba(35,35,35,0.9), rgba(6,6,6,0.92)),
  //     repeating-linear-gradient(135deg, rgba(255,255,255,0.055) 0 8px, transparent 8px 18px)
  //   `,
  //   boxShadow: `
  //     inset 0 0 28px rgba(0,0,0,0.58),
  //     inset 0 1px 0 rgba(255,255,255,0.1)
  //   `,
  // });

  // const gift = document.createElement("div");
  // gift.textContent = "🎁";
  // Object.assign(gift.style, {
  //   position: "absolute",
  //   left: "50%",
  //   top: "48%",
  //   transform: "translate(-50%, -50%)",
  //   fontSize: "clamp(4rem, 14vw, 8rem)",
  //   filter: "drop-shadow(0 22px 28px rgba(0,0,0,0.6)) drop-shadow(0 0 24px rgba(255,221,38,0.45))",
  //   animation: "startFloat 2.6s ease-in-out infinite",
  // });

  // const boardText = document.createElement("div");
  // boardText.textContent = `LEVEL ${_level} • FIND THE GIFT`;
  // Object.assign(boardText.style, {
  //   position: "absolute",
  //   left: "50%",
  //   bottom: "18px",
  //   transform: "translateX(-50%)",
  //   color: "#fff",
  //   fontSize: "clamp(0.72rem, 2vw, 0.95rem)",
  //   fontWeight: "900",
  //   letterSpacing: "0.12em",
  //   textShadow: "0 4px 14px rgba(0,0,0,0.8)",
  //   whiteSpace: "nowrap",
  // });

  // boardInner.append(gift, boardText);
  // boardFrame.appendChild(boardInner);

  const heroTagline = document.createElement("div");
  heroTagline.className = "start-hero-tagline";
  heroTagline.textContent = "Футболная аркадия";
  Object.assign(heroTagline.style, {
    position: "relative",
    width: "min(82vw, 560px)",
    padding: "clamp(18px, 4vw, 28px) clamp(12px, 3vw, 20px)",
    color: "#ffffff",
    fontFamily: '"Russo One", "Segoe UI", system-ui, sans-serif',
    fontSize: "clamp(1.85rem, 7.5vw, 3.6rem)",
    fontWeight: "400",
    letterSpacing: "0.04em",
    lineHeight: "1.08",
    textAlign: "center",
    textShadow:
      "0 3px 14px rgba(0,0,0,0.72), 0 1px 0 rgba(255,255,255,0.14)",
    transform: "skewX(-8deg)",
    pointerEvents: "none",
  });

  const heroTaglineAccent = document.createElement("span");
  Object.assign(heroTaglineAccent.style, {
    position: "absolute",
    left: "50%",
    bottom: "clamp(6px, 1.2vh, 10px)",
    transform: "translateX(-50%) skewX(8deg)",
    width: "min(42%, 180px)",
    height: "3px",
    borderRadius: "2px",
    background: `linear-gradient(90deg, transparent, ${FORMULA55_UI.yellow}, transparent)`,
    opacity: "0.85",
    pointerEvents: "none",
  });

  heroTagline.appendChild(heroTaglineAccent);

  const progress = document.createElement("div");
  Object.assign(progress.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "min(88vw, 560px)",
    marginTop: "clamp(14px, 2.5vh, 22px)",
    color: "rgba(255,255,255,0.72)",
    fontSize: "clamp(0.65rem, 1.8vw, 0.82rem)",
    fontWeight: "900",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  });

  center.append(title, subtitle, prizeCards, /* boardFrame, */ progress);

  const footer = document.createElement("footer");
  footer.className = "start-footer";
  Object.assign(footer.style, {
    position: "relative",
    zIndex: "2",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "30px",
    padding: "clamp(18px, 3vh, 34px) clamp(16px, 4vw, 32px) clamp(26px, 5vh, 48px)",
    flexShrink: "0",
  });

  const startBtn = document.createElement("button");
  startBtn.id = "start-game-btn";
  startBtn.type = "button";
  Object.assign(startBtn.style, {
    position: "relative",
    isolation: "isolate",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "14px",
    minWidth: "min(88vw, 460px)",
    height: "72px",
    padding: "0 64px",
    border: "1px solid rgba(255,221,38,0.9)",
    borderRadius: "16px",
    overflow: "hidden",
    background: `linear-gradient(135deg, rgba(255,236,50,1) 0%, rgba(255,205,20,1) 45%, rgba(207,145,8,1) 100%)`,
    color: "#101010",
    fontSize: "clamp(1.05rem, 3vw, 1.45rem)",
    fontWeight: "1000",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "inherit",
    transform: "translateY(0) skewX(-8deg)",
    transition: "transform 160ms ease, box-shadow 160ms ease, filter 160ms ease",
  });

  const btnShine = document.createElement("span");
  Object.assign(btnShine.style, {
    position: "absolute",
    top: "0",
    bottom: "0",
    left: "0",
    width: "42%",
    zIndex: "-1",
    background: "linear-gradient(110deg, transparent, rgba(255,255,255,0.55), transparent)",
    animation: "startShine 3s ease-in-out infinite",
  });

  const btnTexture = document.createElement("span");
  Object.assign(btnTexture.style, {
    position: "absolute",
    inset: "0",
    zIndex: "-2",
    background: "repeating-linear-gradient(135deg, rgba(0,0,0,0.12) 0 8px, transparent 8px 18px)",
    opacity: "0.5",
  });

  const startLabel = document.createElement("span");
  startLabel.textContent = "Начать игру";
  Object.assign(startLabel.style, {
    transform: "skewX(8deg)",
    textShadow: "0 1px 0 rgba(255,255,255,0.35)",
  });

  startBtn.append(btnShine, btnTexture, startLabel);

  startBtn.addEventListener("mouseenter", () => {
    startBtn.style.transform = "translateY(-3px) skewX(-8deg)";
  });

  startBtn.addEventListener("mouseleave", () => {
    startBtn.style.transform = "translateY(0) skewX(-8deg)";
  });

  footer.append(heroTagline, startBtn);

  overlay.append(ambient, carbon, watermark, header, center, footer);
  document.body.appendChild(overlay);

  let visible = true;

  return {
    show: () => {
      visible = true;
      overlay.style.display = "flex";
      overlay.classList.remove("start-overlay--show");
      void overlay.offsetWidth;
      overlay.classList.add("start-overlay--show");
    },
    hide: () => {
      visible = false;
      overlay.style.display = "none";
      overlay.classList.remove("start-overlay--show");
    },
    isVisible: () => visible,
    onStart: (cb: () => void) => {
      startBtn.addEventListener("click", cb);
    },
  };
}