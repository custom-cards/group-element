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

    const fireEvent = (node, type, detail, options) => {
      options = options || {};
      detail = detail === null || detail === undefined ? {} : detail;
      const event = new Event(type, {
        bubbles: options.bubbles === undefined ? true : options.bubbles,
        cancelable: Boolean(options.cancelable),
        composed: options.composed === undefined ? true : options.composed
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
          fireEvent(element, "ll-rebuild");
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

    class HuiGroupElement extends HTMLElement {
      constructor() {
        super();
        this._hass = {};
        this._config = {};
        this._elements = [];
        this._visible = false;
        this._toggleTap = false;
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

        this._toggleTap = config.toggle_tap;
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
          this._config.elements.map(elementConfig => {
            const element = createStyledHuiElement(elementConfig);

            this._elements.push(element);
          });
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
      }

    }

    customElements.define("group-element", HuiGroupElement);
  });
})();
