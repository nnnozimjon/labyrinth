/** True when the primary pointer is touch (phones, tablets). */
export function isMobileDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}
