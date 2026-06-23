import { FORMULA55_UI } from "./formula55-ui";
import { createSvgIcon } from "./icons";

let hudStylesMounted = false;

function mountHudStyles() {
  if (hudStylesMounted) return;
  hudStylesMounted = true;

  const style = document.createElement("style");
  style.textContent = `
    #game-hud {
      --f55-yellow: ${FORMULA55_UI.yellow};
      --f55-yellow-hover: ${FORMULA55_UI.yellowHover};
      --f55-dark: ${FORMULA55_UI.textDark};
      -webkit-user-select: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    #game-hud.game-hud--show .game-hud-header {
      animation: gameHudHeaderDrop 460ms ease-out forwards;
    }

    .game-hud-icon-btn:active {
      transform: translateY(1px) skewX(-8deg) !important;
    }

    @keyframes gameHudHeaderDrop {
      from { opacity: 0; transform: translateY(-18px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

function makeHeaderIconButton(label: string, path: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "game-hud-icon-btn";
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
    if (btn.dataset.soundEnabled === "true") return;
    if (iconPath) iconPath.setAttribute("fill", FORMULA55_UI.textDark);
    Object.assign(icon.style, { filter: "none" });
    Object.assign(btn.style, {
      transform: "translateY(-2px) skewX(-8deg)",
      background: FORMULA55_UI.yellow,
      boxShadow: hoverBoxShadow,
    });
  });

  btn.addEventListener("mouseleave", () => {
    if (btn.dataset.soundEnabled === "true") return;
    if (btn.dataset.iconVariant === "sound") {
      setSoundEnabled(btn, false);
      return;
    }
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

export function createGameHud() {
  mountHudStyles();

  const hud = document.createElement("div");
  hud.id = "game-hud";
  Object.assign(hud.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    zIndex: "950",
    pointerEvents: "none",
    fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
  });

  const header = document.createElement("header");
  header.className = "game-hud-header";
  Object.assign(header.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "clamp(16px, 3vw, 30px) clamp(20px, 4vw, 44px)",
    pointerEvents: "auto",
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

  const menuBtn = makeHeaderIconButton(
    "Menu",
    "M4 7h16v2H4V7zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"
  );

  const soundBtn = makeHeaderIconButton(
    "Sound",
    "M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.15-3.82v7.63A4.48 4.48 0 0 0 16.5 12zm2.82-2.82A7.48 7.48 0 0 1 20 12a7.48 7.48 0 0 1-1.68 4.82l-1.42-1.42A5.48 5.48 0 0 0 17.5 12a5.48 5.48 0 0 0-1.5-3.8l1.42-1.42z"
  );
  soundBtn.dataset.iconVariant = "sound";

  actions.append(menuBtn, soundBtn);
  header.append(logo, actions);
  hud.appendChild(header);
  document.body.appendChild(hud);

  hud.classList.add("game-hud--show");
  setSoundEnabled(soundBtn, false);

  return {
    element: hud,
    menuButton: menuBtn,
    soundButton: soundBtn,
  };
}

const SOUND_BTN_DEFAULT_BACKGROUND = `
  linear-gradient(145deg, rgba(22,22,22,0.92), rgba(0,0,0,0.72)),
  repeating-linear-gradient(135deg, rgba(255,221,38,0.1) 0 6px, transparent 6px 14px)
`;
const SOUND_BTN_DEFAULT_BOX_SHADOW = `
  0 12px 26px rgba(0,0,0,0.46),
  0 0 18px rgba(255,221,38,0.16),
  inset 0 1px 0 rgba(255,255,255,0.12)
`;

export function setSoundEnabled(button: HTMLButtonElement, enabled: boolean) {
  button.dataset.soundEnabled = enabled ? "true" : "false";

  const icon = button.querySelector("svg");
  const iconPath = button.querySelector("path");

  if (enabled) {
    if (iconPath) iconPath.setAttribute("fill", FORMULA55_UI.textDark);
    if (icon) {
      Object.assign(icon.style, { filter: "none" });
    }
    Object.assign(button.style, {
      background: FORMULA55_UI.yellow,
      borderColor: FORMULA55_UI.yellow,
      boxShadow: `
        0 16px 34px rgba(0,0,0,0.55),
        0 0 26px rgba(255,221,38,0.32),
        inset 0 1px 0 rgba(255,255,255,0.18)
      `,
    });
    return;
  }

  if (iconPath) iconPath.setAttribute("fill", "rgba(255,255,255,0.42)");
  if (icon) {
    Object.assign(icon.style, { filter: "none" });
  }
  Object.assign(button.style, {
    background: SOUND_BTN_DEFAULT_BACKGROUND,
    borderColor: "rgba(255,255,255,0.28)",
    boxShadow: SOUND_BTN_DEFAULT_BOX_SHADOW,
  });
}
