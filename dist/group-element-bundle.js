;

(function () {
  "use strict";

  (function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory() : typeof define === 'function' && define.amd ? define(factory) : factory();
  })(this, function () {
    'use strict';

    function deepcopy(value) {
      if (!(!!value && typeof value == 'object')) {
        return value;
      }

      if (Object.prototype.toString.call(value) == '[object Date]') {
        return new Date(value.getTime());
      }

      if (Array.isArray(value)) {
        return value.map(deepcopy);
      }

      var result = {};
      Object.keys(value).forEach(function (key) {
        result[key] = deepcopy(value[key]);
      });
      return result;
    }

    const fireEvent = (node, type, detail) => {
      detail = detail === null || detail === undefined ? {} : detail;
      const event = new Event(type, {
        bubbles: true,
        cancelable: false,
        composed: true
      });
      event.detail = detail;
      node.dispatchEvent(event);
      return event;
    };

    const CUSTOM_TYPE_PREFIX = "custom:";
    const TIMEOUT = 2000;

    const createHuiElement = config => {
      if (!config || typeof config !== "object" || !config.type) {
        return _createErrorElement("No element type configured.", config);
      }

      if (config.type.startsWith(CUSTOM_TYPE_PREFIX)) {
        const tag = config.type.substr(CUSTOM_TYPE_PREFIX.length);

        if (customElements.get(tag)) {
          return _createElement(tag, config);
        }

        const element = _createErrorElement("Custom element doesn't exist: ".concat(tag, "."), config);

        const timer = _hideErrorElement(element);

        customElements.whenDefined(tag).then(() => {
          clearTimeout(timer);
          fireEvent(element.parentElement.parentElement, "ll-rebuild");
        });
        return element;
      }

      return _createElement("hui-".concat(config.type, "-element"), config);
    };

    const _createElement = (tag, config) => {
      const element = document.createElement(tag);

      try {
        element.setConfig(deepcopy(config));
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
        config
      });
      return el;
    };

    function _hideErrorElement(element) {
      element.style.display = "None";
      return window.setTimeout(() => {
        element.style.display = "";
      }, TIMEOUT);
    }

    function createStyledHuiElement(elementConfig) {
      const element = createHuiElement(elementConfig);

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

    customElements.define("group-element", class HuiGroupElement extends HTMLElement {
      constructor() {
        super();
        this._hass = {};
        this._config = {};
        this._elements = [];
        this._visible = false;
        this._toggleTap = false;
        this._groupingId = -1;
        this.addEventListener("click", ev => {
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
          this._elements.map(el => {
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

      connectedCallback() {
        this.updateElements();
      }

      updateElements() {
        if (!this._hass || !this._config || !this.parentElement) {
          return;
        }

        if (this._elements.length === 0) {
          this._config.elements.map(elementConfig => {
            const element = createStyledHuiElement(elementConfig);

            this._elements.push(element);
          });

          if (this._config.close_button !== undefined && this._config.close_button.show) {
            this._elements.push(this.createCloseButton(this._config.close_button));
          }
        }

        this._elements.map(el => {
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
          this.parentElement.querySelectorAll("group-element").forEach(el => {
            if (el !== this && el.attributes.groupingId !== undefined && el.attributes.groupingId === this._groupingId) {
              if (el._visible) {
                el.toggleVisibility();
              }
            }
          });
        }
      }

      createCloseButton(buttonConfig) {
        const left = buttonConfig.left !== undefined ? buttonConfig.left : "calc(100% - 11px)";
        const top = buttonConfig.top !== undefined ? buttonConfig.top : "calc(100% - 11px)";
        const element = document.createElement("ha-icon");
        element.icon = buttonConfig.icon !== undefined ? buttonConfig.icon : "hass:close";
        element.className = "element";
        element.style.left = left;
        element.style.top = top;
        element.addEventListener("click", ev => {
          if (ev.target !== element) {
            ev.stopPropagation();
            return;
          }

          this.toggleVisibility();
        });
        return element;
      }

    });
  });
})();
