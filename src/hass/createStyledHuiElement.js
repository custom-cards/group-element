import { createHuiElement } from "./createHuiElement.js";

export function createStyledHuiElement(elementConfig, eventTarget) {
  const element = createHuiElement(elementConfig, eventTarget);
  // keep conditional card as a transparent container so let its position remain static
  if (element.tagName !== "HUI-CONDITIONAL-ELEMENT") {
    element.classList.add("element");
  }

  if (elementConfig.style) {
    Object.keys(elementConfig.style).forEach(prop => {
      element.style.setProperty(prop, elementConfig.style[prop]);
    });
  }

  return element;
}
