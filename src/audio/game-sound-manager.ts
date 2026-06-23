import ballHitUrl from "../ball-hit.ogg";
import lossUrl from "../loss.ogg";

const HIT_DEBOUNCE_MS = 1000;
const HIT_VOLUME = 0.65;
const LOSS_VOLUME = 0.8;

export class GameSoundManager {
  private enabled = false;
  private context: AudioContext | null = null;
  private hitBuffer: AudioBuffer | null = null;
  private lossBuffer: AudioBuffer | null = null;
  private lastHitTime = 0;

  async preload(): Promise<void> {
    const [hitBuffer, lossBuffer] = await Promise.all([
      this.loadBuffer(ballHitUrl),
      this.loadBuffer(lossUrl),
    ]);
    this.hitBuffer = hitBuffer;
    this.lossBuffer = lossBuffer;
  }

  /** Call from a user gesture when sound is turned on (required on mobile). */
  async unlock(): Promise<void> {
    const context = this.getOrCreateContext();
    if (context.state === "suspended") {
      await context.resume();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  playHit() {
    this.playBuffer(this.hitBuffer, HIT_VOLUME, true);
  }

  playLoss() {
    this.playBuffer(this.lossBuffer, LOSS_VOLUME, false);
  }

  private getOrCreateContext(): AudioContext {
    if (!this.context) {
      const AudioContextCtor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error("Web Audio API is not available.");
      }
      this.context = new AudioContextCtor();
    }
    return this.context;
  }

  private async loadBuffer(url: string): Promise<AudioBuffer> {
    const context = this.getOrCreateContext();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return context.decodeAudioData(arrayBuffer);
  }

  private playBuffer(
    buffer: AudioBuffer | null,
    volume: number,
    debounce: boolean
  ) {
    if (!this.enabled || !buffer || !this.context) return;
    if (this.context.state !== "running") return;

    if (debounce) {
      const now = performance.now();
      if (now - this.lastHitTime < HIT_DEBOUNCE_MS) return;
      this.lastHitTime = now;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const gain = this.context.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(this.context.destination);
    source.start();
  }
}
