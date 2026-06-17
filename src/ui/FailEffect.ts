const STYLE_ID = "fail-effect-styles";
const DURATION_MS = 1850;

export class FailEffect {
  private readonly root: HTMLDivElement;
  private playing = false;

  constructor() {
    this.injectStyles();

    this.root = document.createElement("div");
    this.root.className = "fail-effect-overlay";
    this.root.setAttribute("aria-hidden", "true");

    this.root.innerHTML = `
      <div class="fail-effect-vignette"></div>
      <div class="fail-effect-speed-lines"></div>
      <div class="fail-effect-corners"></div>
      <div class="fail-effect-pulse"></div>
      <div class="fail-effect-text">УПС!</div>
    `;

    this.root.style.display = "none";
    document.body.appendChild(this.root);
  }

  private injectStyles(): void {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .fail-effect-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        pointer-events: none;
        overflow: hidden;
        opacity: 0;
      }

      .fail-effect-overlay.is-playing {
        animation: fail-root ${DURATION_MS}ms ease-out forwards;
      }

      .fail-effect-vignette,
      .fail-effect-speed-lines,
      .fail-effect-corners,
      .fail-effect-pulse,
      .fail-effect-text {
        position: absolute;
        inset: 0;
      }

      .fail-effect-vignette {
        background:
          radial-gradient(circle at 50% 50%, rgba(255,221,38,0.18), transparent 34%),
          radial-gradient(circle at 50% 50%, transparent 28%, rgba(0,0,0,0.28) 72%, rgba(0,0,0,0.58) 100%);
        opacity: 0;
      }

      .fail-effect-overlay.is-playing .fail-effect-vignette {
        animation: fail-vignette ${DURATION_MS}ms ease-out forwards;
      }

      .fail-effect-speed-lines {
        background:
          repeating-linear-gradient(
            -32deg,
            transparent 0 34px,
            rgba(255,221,38,0.12) 34px 48px,
            transparent 48px 86px
          );
        opacity: 0;
        transform: translateX(-40px);
      }

      .fail-effect-overlay.is-playing .fail-effect-speed-lines {
        animation: fail-speed ${DURATION_MS}ms ease-out forwards;
      }

      .fail-effect-corners {
        background:
          radial-gradient(circle at 0% 0%, rgba(255,245,190,0.95), rgba(255,221,38,0.55) 24%, transparent 46%),
          radial-gradient(circle at 100% 0%, rgba(255,245,190,0.95), rgba(255,221,38,0.55) 24%, transparent 46%),
          radial-gradient(circle at 0% 100%, rgba(255,245,190,0.95), rgba(255,221,38,0.55) 24%, transparent 46%),
          radial-gradient(circle at 100% 100%, rgba(255,245,190,0.95), rgba(255,221,38,0.55) 24%, transparent 46%);
        opacity: 0;
      }

      .fail-effect-overlay.is-playing .fail-effect-corners {
        animation: fail-corners ${DURATION_MS}ms ease-out forwards;
      }

      .fail-effect-pulse {
        width: clamp(180px, 34vw, 360px);
        height: clamp(180px, 34vw, 360px);
        inset: 50% auto auto 50%;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,221,38,0.32), rgba(255,221,38,0.12) 36%, transparent 72%);
        transform: translate(-50%, -50%) scale(0.45);
        opacity: 0;
        filter: blur(2px);
      }

      .fail-effect-overlay.is-playing .fail-effect-pulse {
        animation: fail-pulse ${DURATION_MS}ms cubic-bezier(.2,1,.2,1) forwards;
      }

      .fail-effect-text {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
        font-size: clamp(2.4rem, 7vw, 5rem);
        font-weight: 1000;
        font-style: italic;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        text-shadow:
          0 0 16px rgba(255,221,38,0.62),
          0 8px 28px rgba(0,0,0,0.85),
          0 0 54px rgba(255,221,38,0.35);
        opacity: 0;
        transform: scale(0.6) skewX(-8deg);
      }

      .fail-effect-overlay.is-playing .fail-effect-text {
        animation: fail-text ${DURATION_MS}ms cubic-bezier(.2,1.25,.2,1) forwards;
      }

      @keyframes fail-root {
        0% { opacity: 0; transform: translate(0, 0); }
        12% { opacity: 1; transform: translate(-4px, 2px); }
        24% { transform: translate(4px, -2px); }
        38% { transform: translate(-2px, 1px); }
        52% { transform: translate(2px, -1px); }
        72% { opacity: 1; transform: translate(0, 0); }
        100% { opacity: 0; transform: translate(0, 0); }
      }

      @keyframes fail-vignette {
        0% { opacity: 0; }
        16% { opacity: 1; }
        68% { opacity: 1; }
        100% { opacity: 0; }
      }

      @keyframes fail-speed {
        0% { opacity: 0; transform: translateX(-60px); }
        16% { opacity: 1; }
        70% { opacity: 0.55; transform: translateX(34px); }
        100% { opacity: 0; transform: translateX(70px); }
      }

      @keyframes fail-corners {
        0% { opacity: 0; filter: blur(8px); }
        12% { opacity: 1; filter: blur(0); }
        52% { opacity: 0.72; }
        100% { opacity: 0; filter: blur(10px); }
      }

      @keyframes fail-pulse {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.45); }
        18% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        76% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.22); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1.45); }
      }

      @keyframes fail-text {
        0% { opacity: 0; transform: scale(0.6) skewX(-8deg); }
        18% { opacity: 1; transform: scale(1.14) skewX(-8deg); }
        36% { opacity: 1; transform: scale(1) skewX(-8deg); }
        72% { opacity: 1; transform: scale(1) skewX(-8deg); }
        100% { opacity: 0; transform: scale(1.08) skewX(-8deg); }
      }
    `;

    document.head.appendChild(style);
  }

  play(): Promise<void> {
    if (this.playing) return Promise.resolve();

    this.playing = true;
    this.root.style.display = "block";

    this.root.classList.remove("is-playing");
    void this.root.offsetWidth;
    this.root.classList.add("is-playing");

    return new Promise((resolve) => {
      window.setTimeout(() => {
        this.root.classList.remove("is-playing");
        this.root.style.display = "none";
        this.playing = false;
        resolve();
      }, DURATION_MS);
    });
  }

  dispose(): void {
    this.root.remove();
    document.getElementById(STYLE_ID)?.remove();
  }
}