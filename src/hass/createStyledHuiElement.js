import { createHuiElement } from "./createHuiElement";

export function createStyledHuiElement(elementConfig) {
  const element = createHuiElement(elementConfig);
  // keep conditional card as a transparent container so let its position remain static
  if (element.tagName !== "HUI-CONDITIONAL-ELEMENT") {
    element.classList.add("element");
  }

  if (elementConfig.style) {
    Object.keys(elementConfig.style).forEach((prop) => {
      element.style.setProperty(prop, elementConfig.style[prop]);
    });
  }

  return element;
}
