import { createStyledHuiElement } from "./hass/createStyledHuiElement";

customElements.define(
  "group-element",
  class HuiGroupElement extends HTMLElement {
    constructor() {
      super();
      this._hass = {};
      this._config = {};
      this._elements = [];
      this._visible = false;
      this._toggleTap = false;
      this._groupingId = -1;

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

      if (config.toggle_tap !== undefined) {
        this._toggleTap = config.toggle_tap;
      }

      if (config.grouping_id !== undefined) {
        this._groupingId = config.grouping_id;
        this.attributes.groupingId = config.grouping_id;
      }

      this.updateElements();
    }

    set hass(hass) {
      this._hass = hass;

      this.updateElements();
    }

    // required since otherwise if child custom elements are loaded later even fired (ll-rebuild) will not be handled
    // because this element does not yet have a parent. If this is ever added as a non custom element remove this + remove also: || !this.parentElement) {
    // from updateElements
    connectedCallback() {
      this.updateElements();
    }

    updateElements() {
      if (!this._hass || !this._config || !this.parentElement) {
        return;
      }

      if (this._elements.length === 0) {
        this._config.elements.map((elementConfig) => {
          const element = createStyledHuiElement(elementConfig);

          this._elements.push(element);
        });

        if (
          this._config.close_button !== undefined &&
          this._config.close_button.show
        ) {
          this._elements.push(
            this.createCloseButton(this._config.close_button)
          );
        }
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
      if (!this._toggleTap) {
        return;
      }

      this._visible = !this._visible;

      this.updateElements();

      if (this._visible && this._groupingId !== -1) {
        this.parentElement.querySelectorAll("group-element").forEach((el) => {
          if (
            el !== this &&
            el.attributes.groupingId !== undefined &&
            el.attributes.groupingId === this._groupingId
          ) {
            if (el._visible) {
              el.toggleVisibility();
            }
          }
        });
      }
    }

    createCloseButton(buttonConfig) {
      const left =
        buttonConfig.left !== undefined
          ? buttonConfig.left
          : "calc(100% - 11px)";
      const top =
        buttonConfig.top !== undefined ? buttonConfig.top : "calc(100% - 11px)";

      const element = document.createElement("ha-icon");

      element.icon =
        buttonConfig.icon !== undefined ? buttonConfig.icon : "hass:close";

      element.className = "element";
      element.style.left = left;
      element.style.top = top;

      element.addEventListener("click", (ev) => {
        if (ev.target !== element) {
          ev.stopPropagation();
          return;
        }

        this.toggleVisibility();
      });

      return element;
    }
  }
);
