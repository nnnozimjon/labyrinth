import ballHitUrl from "../ball-hit.ogg";

const HIT_DEBOUNCE_MS = 1000;
const VOLUME = 0.65;

export class BallHitSound {
  private readonly template: HTMLAudioElement;
  private enabled = true;
  private unlocked = false;
  private lastPlayTime = 0;

  constructor(url = ballHitUrl) {
    this.template = new Audio(url);
    this.template.preload = "auto";
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;

    const probe = this.template.cloneNode() as HTMLAudioElement;
    probe.volume = 0;
    void probe.play().then(() => probe.pause()).catch(() => {});
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  play() {
    if (!this.enabled || !this.unlocked) return;

    const now = performance.now();
    if (now - this.lastPlayTime < HIT_DEBOUNCE_MS) return;
    this.lastPlayTime = now;

    const clip = this.template.cloneNode() as HTMLAudioElement;
    clip.volume = VOLUME;
    void clip.play().catch(() => {});
  }
}
