import lossUrl from "../loss.ogg";

const VOLUME = 0.8;

export class LossSound {
  private readonly template: HTMLAudioElement;
  private enabled = true;
  private unlocked = false;

  constructor(url = lossUrl) {
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

    const clip = this.template.cloneNode() as HTMLAudioElement;
    clip.volume = VOLUME;
    void clip.play().catch(() => {});
  }
}
