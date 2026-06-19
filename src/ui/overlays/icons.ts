import { FORMULA55_UI } from "./formula55-ui";

export function createCheckmarkIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z");
  path.setAttribute("fill", "#ffffff");
  svg.appendChild(path);
  return svg;
}

export function createSvgIcon(
  pathD: string,
  viewBox = "0 0 24 24",
  fill: string = FORMULA55_UI.textDark
) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("width", "22");
  svg.setAttribute("height", "22");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathD);
  path.setAttribute("fill", fill);
  svg.appendChild(path);
  return svg;
}
