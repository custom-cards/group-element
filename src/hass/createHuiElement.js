import deepClone from "deep-clone-simple";
import { fireEvent } from "./fireEvent";

const CUSTOM_TYPE_PREFIX = "custom:";
const TIMEOUT = 2000;

export const createHuiElement = (config) => {
  if (!config || typeof config !== "object" || !config.type) {
    return _createErrorElement("No element type configured.", config);
  }

  if (config.type.startsWith(CUSTOM_TYPE_PREFIX)) {
    const tag = config.type.substr(CUSTOM_TYPE_PREFIX.length);

    if (customElements.get(tag)) {
      return _createElement(tag, config);
    }
    const element = _createErrorElement(
      `Custom element doesn't exist: ${tag}.`,
      config
    );
    const timer = _hideErrorElement(element);

    customElements.whenDefined(tag).then(() => {
      clearTimeout(timer);
      fireEvent(element.parentElement.parentElement, "ll-rebuild");
    });

    return element;
  }

  return _createElement(`hui-${config.type}-element`, config);
};

const _createElement = (tag, config) => {
  const element = document.createElement(tag);
  try {
    element.setConfig(deepClone(config));
  } catch (err) {
    return _createErrorElement(err.message, config);
  }
  return element;
};

const _createErrorElement = (error, config) => {
  const el = document.createElement("hui-error-card");
  el.setConfig({
    type: "error",
    error,
    config,
  });
  return el;
};

function _hideErrorElement(element) {
  element.style.display = "None";
  return window.setTimeout(() => {
    element.style.display = "";
  }, TIMEOUT);
}
