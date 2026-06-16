const BASE_SIZE = 120;
const STICK_SIZE = 48;
const MAX_DEFLECTION = 40;

export class VirtualJoystick {
  readonly element: HTMLDivElement;

  /** Normalized horizontal input in range [-1, 1]. */
  x = 0;

  /** Normalized vertical input in range [-1, 1]. Up is negative. */
  y = 0;

  private readonly base: HTMLDivElement;
  private readonly stick: HTMLDivElement;
  private active = false;
  private pointerId: number | null = null;
  private centerX = 0;
  private centerY = 0;

  constructor() {
    this.element = document.createElement("div");
    Object.assign(this.element.style, {
      position: "fixed",
      bottom: "40px",
      left: "50%",
      transform: "translateX(-50%)",
      width: `${BASE_SIZE}px`,
      height: `${BASE_SIZE}px`,
      touchAction: "none",
      userSelect: "none",
      zIndex: "10",
    });

    this.base = document.createElement("div");
    Object.assign(this.base.style, {
      position: "absolute",
      inset: "0",
      borderRadius: "50%",
      background: "rgba(255, 255, 255, 0.12)",
      border: "2px solid rgba(255, 255, 255, 0.25)",
    });

    this.stick = document.createElement("div");
    Object.assign(this.stick.style, {
      position: "absolute",
      left: "50%",
      top: "50%",
      width: `${STICK_SIZE}px`,
      height: `${STICK_SIZE}px`,
      marginLeft: `${-STICK_SIZE / 2}px`,
      marginTop: `${-STICK_SIZE / 2}px`,
      borderRadius: "50%",
      background: "rgba(255, 255, 255, 0.45)",
      border: "2px solid rgba(255, 255, 255, 0.6)",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.35)",
      transition: "background 0.15s",
    });

    this.element.appendChild(this.base);
    this.element.appendChild(this.stick);
    document.body.appendChild(this.element);

    this.element.addEventListener("pointerdown", this.onPointerDown);
    this.element.addEventListener("pointermove", this.onPointerMove);
    this.element.addEventListener("pointerup", this.onPointerUp);
    this.element.addEventListener("pointercancel", this.onPointerUp);
  }

  private onPointerDown = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.active = true;
    this.pointerId = event.pointerId;
    this.element.setPointerCapture(event.pointerId);
    this.stick.style.transition = "none";
    this.updateFromPointer(event);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.active || event.pointerId !== this.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.updateFromPointer(event);
  };

  private onPointerUp = (event: PointerEvent) => {
    if (!this.active || event.pointerId !== this.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.active = false;
    this.pointerId = null;
    this.x = 0;
    this.y = 0;
    this.stick.style.transition = "transform 0.2s ease-out";
    this.stick.style.transform = "translate(0px, 0px)";
    this.element.releasePointerCapture(event.pointerId);
  };

  private updateFromPointer(event: PointerEvent) {
    const rect = this.element.getBoundingClientRect();
    this.centerX = rect.left + rect.width / 2;
    this.centerY = rect.top + rect.height / 2;

    const offsetX = event.clientX - this.centerX;
    const offsetY = event.clientY - this.centerY;
    const distance = Math.hypot(offsetX, offsetY);

    let clampedX = offsetX;
    let clampedY = offsetY;

    if (distance > MAX_DEFLECTION) {
      const scale = MAX_DEFLECTION / distance;
      clampedX *= scale;
      clampedY *= scale;
    }

    this.x = clampedX / MAX_DEFLECTION;
    this.y = clampedY / MAX_DEFLECTION;

    this.stick.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
  }
}
