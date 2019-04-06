import { createStyledHuiElement } from "./hass/createStyledHuiElement";

class HuiGroupElement extends HTMLElement {
  constructor() {
    super();
    this._hass = {};
    this._config = {};
    this._elements = [];
    this._visible = false;

    this.addEventListener("click", (ev) => {
      if (ev.target !== this) {
        ev.stopPropagation();
        return;
      }
      this.toggleVisibility();
    });
  }

  setConfig(config) {
    if (!config.elements || !Array.isArray(config.elements)) {
      throw new Error("Error in card configuration.");
    }

    if (this._elements.length > 0) {
      this._elements.map((el) => {
        if (el.parentElement) {
          el.parentElement.removeChild(el);
        }
      });

      this._elements = [];
    }

    this._config = config;

    this.style.transform = "none";
    if (config.visible !== undefined) {
      this._visible = config.visible;
    }

    this.updateElements();
  }

  set hass(hass) {
    this._hass = hass;

    this.updateElements();
  }

  updateElements() {
    if (!this._hass || !this._config) {
      return;
    }

    if (this._elements.length === 0) {
      this._config.elements.map((elementConfig) => {
        const element = createStyledHuiElement(elementConfig);

        this._elements.push(element);
      });
    }

    this._elements.map((el) => {
      if (this._visible) {
        el.hass = this._hass;
        if (!el.parentElement) {
          this.appendChild(el);
        }
      } else if (el.parentElement) {
        el.parentElement.removeChild(el);
      }
    });
  }

  toggleVisibility() {
    if (!this._config.toggle_tap) {
      return;
    }

    this._visible = !this._visible;

    this.updateElements();
  }
}

customElements.define("group-element", HuiGroupElement);
