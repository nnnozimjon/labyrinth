import { FORMULA55_UI } from "./overlays/formula55-ui";
import { createSvgIcon } from "./overlays/icons";

const STYLE_ID = "campaign-info-overlay-styles";
const FORMULA55_CAMPAIGNS_URL = "https://formula55.tj/campaigns";

const CLOSE_ICON_PATH =
  "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z";

const PRIZE_ICON_PATHS = [
  "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
  "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z",
  "M22 10V6c0-1.11-.9-2-2-2H4c-1.1 0-1.99.89-1.99 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-2-1.46c-1.19.69-2 1.99-2 3.46s.81 2.77 2 3.46V18H4v-2.54c1.19-.69 2-1.99 2-3.46 0-1.48-.8-2.77-1.99-3.46L4 6h16v2.54zM11.5 9v3.5h1V9h-1z",
  "M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 12 7.4l3.38 4.6L17 10.83 14.92 8H20v6z",
] as const;

export function createCampaignInfoOverlay() {
  injectStyles();

  const overlay = document.createElement("div");
  overlay.id = "campaign-info-overlay";
  overlay.style.display = "none";

  overlay.innerHTML = `
    <div class="campaign-bg"></div>

    <section class="campaign-card">
      <button class="campaign-close" type="button" aria-label="Закрыть"></button>

      <div class="campaign-watermark">55</div>

      <p class="campaign-kicker">FORMULA55 • АКЦИИ И БОНУСЫ</p>

      <h1 class="campaign-title">
        АКЦИИ <span>FORMULA55</span>
      </h1>

      <p class="campaign-subtitle">
        Участвуй в акциях, получай бонусы и выигрывай призы.
      </p>

      <div class="campaign-highlight">
        <div>
          <strong>Гонка за победу 2</strong>
          <p>Актуальная акция Formula55. Переходи на сайт, регистрируйся и участвуй.</p>
        </div>
      </div>

      <div class="campaign-grid">
        <div class="campaign-prize">
          <span class="campaign-prize-icon"></span>
          <strong>Автомобиль</strong>
          <p>Главный приз для участников акций.</p>
        </div>

        <div class="campaign-prize">
          <span class="campaign-prize-icon"></span>
          <strong>Денежные призы</strong>
          <p>Призы и бонусы для активных пользователей.</p>
        </div>

        <div class="campaign-prize">
          <span class="campaign-prize-icon"></span>
          <strong>Freebet</strong>
          <p>Фрибеты для новых и действующих игроков.</p>
        </div>

        <div class="campaign-prize">
          <span class="campaign-prize-icon"></span>
          <strong>Подарки</strong>
          <p>Специальные подарки и промо-предложения.</p>
        </div>
      </div>

      <div class="campaign-actions">
        <button id="campaign-open-btn" class="campaign-btn campaign-btn-primary" type="button">
          <span>ПЕРЕЙТИ К АКЦИЯМ</span>
        </button>

        <button id="campaign-close-btn" class="campaign-btn campaign-btn-secondary" type="button">
          <span>ЗАКРЫТЬ</span>
        </button>
      </div>

      <p class="campaign-legal">Реклама. 18+ ООО «Фортуна»</p>
    </section>
  `;

  document.body.appendChild(overlay);

  mountOverlayIcons(overlay);

  const closeBtn = overlay.querySelector(".campaign-close") as HTMLButtonElement;
  const closeBottomBtn = overlay.querySelector("#campaign-close-btn") as HTMLButtonElement;
  const openBtn = overlay.querySelector("#campaign-open-btn") as HTMLButtonElement;

  const hide = () => {
    overlay.classList.remove("campaign-info-overlay--show");
    overlay.classList.add("campaign-info-overlay--hide");

    window.setTimeout(() => {
      overlay.style.display = "none";
      overlay.classList.remove("campaign-info-overlay--hide");
    }, 220);
  };

  closeBtn.addEventListener("click", hide);
  closeBottomBtn.addEventListener("click", hide);

  openBtn.addEventListener("click", () => {
    window.open(FORMULA55_CAMPAIGNS_URL, "_blank", "noopener,noreferrer");
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) hide();
  });

  return {
    show: () => {
      overlay.style.display = "flex";
      overlay.classList.remove("campaign-info-overlay--hide");
      overlay.classList.remove("campaign-info-overlay--show");
      void overlay.offsetWidth;
      overlay.classList.add("campaign-info-overlay--show");
    },
    hide,
  };
}

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #campaign-info-overlay {
      position: fixed;
      inset: 0;
      z-index: 1200;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      background:
        radial-gradient(circle at 50% 45%, rgba(255,221,38,0.16), transparent 36%),
        radial-gradient(circle at 50% 50%, rgba(0,0,0,0.55), rgba(0,0,0,0.9) 100%);
      overflow: hidden;
    }

    .campaign-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        repeating-linear-gradient(135deg, rgba(255,221,38,0.06) 0 8px, transparent 8px 22px),
        repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 9px);
      opacity: 0.55;
    }

    .campaign-card {
      position: relative;
      isolation: isolate;
      width: min(94vw, 820px);
      max-height: min(92vh, 860px);
      overflow: hidden auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      padding: clamp(28px, 5vw, 52px);
      border-radius: 28px;
      border: 1px solid rgba(255,221,38,0.9);
      background:
        linear-gradient(145deg, rgba(12,12,12,0.98), rgba(0,0,0,0.9)),
        repeating-linear-gradient(135deg, rgba(255,221,38,0.07) 0 8px, transparent 8px 22px);
      box-shadow:
        0 30px 80px rgba(0,0,0,0.72),
        0 0 42px rgba(255,221,38,0.22),
        inset 0 1px 0 rgba(255,255,255,0.12);
      text-align: center;
    }

    .campaign-card::-webkit-scrollbar {
      display: none;
    }

    .campaign-info-overlay--show {
      animation: campaignFadeIn 260ms ease-out forwards;
    }

    .campaign-info-overlay--show .campaign-card {
      animation: campaignCardPop 360ms cubic-bezier(.2,1.2,.2,1) forwards;
    }

    .campaign-info-overlay--hide {
      animation: campaignFadeOut 220ms ease-in forwards;
    }

    .campaign-watermark {
      position: absolute;
      right: -8%;
      bottom: -14%;
      z-index: -1;
      font-size: clamp(9rem, 28vw, 17rem);
      font-weight: 1000;
      font-style: italic;
      color: rgba(255,221,38,0.055);
      line-height: 1;
      pointer-events: none;
    }

    .campaign-close {
      position: absolute;
      top: 18px;
      right: 18px;
      width: 46px;
      height: 46px;
      border-radius: 14px;
      border: 1px solid rgba(255,221,38,0.72);
      background: rgba(0,0,0,0.62);
      color: ${FORMULA55_UI.yellow};
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      cursor: pointer;
    }

    .campaign-close svg {
      width: 24px;
      height: 24px;
    }

    .campaign-kicker {
      margin: 0 0 10px;
      color: ${FORMULA55_UI.yellow};
      font-size: clamp(0.72rem, 2vw, 0.9rem);
      font-weight: 900;
      letter-spacing: 0.16em;
    }

    .campaign-title {
      margin: 0 0 12px;
      color: #fff;
      font-size: clamp(2.1rem, 7vw, 4rem);
      font-weight: 1000;
      font-style: italic;
      line-height: 0.95;
      letter-spacing: 0.04em;
      text-shadow: 0 10px 30px rgba(0,0,0,0.7);
    }

    .campaign-title span {
      color: ${FORMULA55_UI.yellow};
    }

    .campaign-subtitle {
      margin: 0 auto clamp(18px, 3vh, 28px);
      max-width: 620px;
      color: rgba(255,255,255,0.78);
      font-size: clamp(0.95rem, 2.6vw, 1.2rem);
      font-weight: 700;
    }

    .campaign-highlight {
      margin: 0 auto clamp(18px, 3vh, 28px);
      padding: 18px 22px;
      max-width: 660px;
      border-radius: 20px;
      border: 1px solid rgba(255,221,38,0.7);
      background:
        linear-gradient(145deg, rgba(255,221,38,0.14), rgba(0,0,0,0.4)),
        repeating-linear-gradient(135deg, rgba(255,221,38,0.08) 0 8px, transparent 8px 18px);
      box-shadow: 0 0 28px rgba(255,221,38,0.18);
    }

    .campaign-highlight strong {
      display: block;
      color: ${FORMULA55_UI.yellow};
      font-size: clamp(1.2rem, 3vw, 1.6rem);
      font-weight: 1000;
      font-style: italic;
      margin-bottom: 6px;
    }

    .campaign-highlight p {
      margin: 0;
      color: rgba(255,255,255,0.76);
      font-weight: 700;
    }

    .campaign-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: clamp(22px, 4vh, 34px);
    }

    .campaign-prize {
      padding: 16px 10px;
      border-radius: 18px;
      border: 1px solid rgba(255,221,38,0.55);
      background:
        linear-gradient(145deg, rgba(20,20,20,0.94), rgba(0,0,0,0.74));
      box-shadow:
        0 12px 26px rgba(0,0,0,0.42),
        0 0 20px rgba(255,221,38,0.13);
    }

    .campaign-prize-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }

    .campaign-prize-icon svg {
      width: 32px;
      height: 32px;
      filter: drop-shadow(0 0 8px rgba(255,221,38,0.35));
    }

    .campaign-prize strong {
      display: block;
      color: #fff;
      font-size: 0.95rem;
      font-weight: 1000;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .campaign-prize p {
      margin: 0;
      color: rgba(255,255,255,0.6);
      font-size: 0.78rem;
      font-weight: 700;
    }

    .campaign-actions {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .campaign-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: min(100%, 260px);
      height: 62px;
      border-radius: 16px;
      cursor: pointer;
      font-size: clamp(0.86rem, 2.4vw, 1rem);
      font-weight: 1000;
      letter-spacing: 0.08em;
      font-family: inherit;
      transform: skewX(-8deg);
      transition: filter 160ms ease, box-shadow 160ms ease, transform 120ms ease;
    }

    .campaign-btn span {
      transform: skewX(8deg);
    }

    .campaign-btn-primary {
      border: 1px solid rgba(255,221,38,0.9);
      color: ${FORMULA55_UI.textDark};
      background: linear-gradient(135deg, ${FORMULA55_UI.yellow}, #d49b0a);
      box-shadow:
        0 14px 30px rgba(0,0,0,0.45),
        0 0 26px rgba(255,221,38,0.26),
        inset 0 2px 0 rgba(255,255,255,0.36);
    }

    .campaign-btn-secondary {
      border: 1px solid rgba(255,221,38,0.75);
      color: ${FORMULA55_UI.yellow};
      background: linear-gradient(145deg, rgba(20,20,20,0.95), rgba(0,0,0,0.85));
    }

    .campaign-btn:hover {
      filter: brightness(1.08);
      transform: translateY(-2px) skewX(-8deg);
      box-shadow:
        0 18px 38px rgba(0,0,0,0.55),
        0 0 34px rgba(255,221,38,0.38),
        inset 0 2px 0 rgba(255,255,255,0.35);
    }

    .campaign-legal {
      margin: 20px 0 0;
      color: rgba(255,255,255,0.45);
      font-size: 0.76rem;
      font-weight: 600;
    }

    @keyframes campaignFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes campaignFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes campaignCardPop {
      from { opacity: 0; transform: scale(.92) translateY(24px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    @media (max-width: 720px) {
      .campaign-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 460px) {
      .campaign-grid {
        grid-template-columns: 1fr;
      }

      .campaign-card {
        padding: 28px 18px;
      }
    }
  `;

  document.head.appendChild(style);
}

function mountOverlayIcons(overlay: HTMLElement): void {
  const closeBtn = overlay.querySelector(".campaign-close");
  if (closeBtn) {
    closeBtn.appendChild(
      createSvgIcon(CLOSE_ICON_PATH, "0 0 24 24", FORMULA55_UI.yellow)
    );
  }

  overlay.querySelectorAll(".campaign-prize-icon").forEach((slot, index) => {
    const path = PRIZE_ICON_PATHS[index];
    if (!path) return;

    slot.appendChild(createSvgIcon(path, "0 0 24 24", FORMULA55_UI.yellow));
  });
}