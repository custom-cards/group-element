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

    var fireEvent = (node, type, detail) => {
      detail = detail === null || detail === undefined ? {} : detail;
      var event = new Event(type, {
        bubbles: true,
        cancelable: false,
        composed: true
      });
      event.detail = detail;
      node.dispatchEvent(event);
      return event;
    };

    var CUSTOM_TYPE_PREFIX = "custom:";
    var TIMEOUT = 2000;

    var createHuiElement = (config, eventTarget) => {
      if (!config || typeof config !== "object" || !config.type) {
        return _createErrorElement("No element type configured.", config);
      }

      if (config.type.startsWith(CUSTOM_TYPE_PREFIX)) {
        var tag = config.type.substr(CUSTOM_TYPE_PREFIX.length);

        if (customElements.get(tag)) {
          return _createElement(tag, config);
        }

        var element = _createErrorElement("Custom element doesn't exist: ".concat(tag, "."), config);

        var timer = _hideErrorElement(element);

        customElements.whenDefined(tag).then(() => {
          clearTimeout(timer);

          if (eventTarget) {
            fireEvent(eventTarget, "ll-rebuild");
          }
        });
        return element;
      }

      return _createElement("hui-".concat(config.type, "-element"), config);
    };

    var _createElement = (tag, config) => {
      var element = document.createElement(tag);

      try {
        element.setConfig(deepcopy(config));
      } catch (err) {
        return _createErrorElement(err.message, config);
      }

      return element;
    };

    var _createErrorElement = (error, config) => {
      var el = document.createElement("hui-error-card");
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

    function createStyledHuiElement(elementConfig, eventTarget) {
      var element = createHuiElement(elementConfig, eventTarget);

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
        this._toggleAreaElements = [];
        this._visible = true;
        this._toggleTap = false;
        this._noToggleHide = false;
        this._container = undefined;
        this.fullyHideOtherGroupsOnShow = undefined;
        this.addEventListener("tap", ev => {
          if (ev.target !== this && this._toggleAreaElements.length === 0) {
            ev.stopPropagation();
            return;
          }

          this.toggleVisibility(true, this.fullyHideOtherGroupsOnShow !== undefined && this.fullyHideOtherGroupsOnShow);
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

        if (this._toggleAreaElements.length > 0) {
          this._toggleAreaElements.map(el => {
            if (el.parentElement) {
              el.parentElement.removeChild(el);
            }
          });

          this._toggleAreaElements = [];
        }

        this._config = config;
        this.style.transform = "none";

        if (config.visible !== undefined) {
          this._visible = config.visible;
        }

        if (config.toggle_tap !== undefined) {
          this._toggleTap = config.toggle_tap;
        }

        if (this._toggleTap) {
          this.style.cursor = "pointer";
        }

        if (config.no_toggle_hide !== undefined) {
          this._noToggleHide = config.no_toggle_hide;
        }

        if (config.grouping_code !== undefined) {
          this.attributes.groupingCode = config.grouping_code;
        }

        if (config.fully_hide_other_groups_on_show !== undefined) {
          this.fullyHideOtherGroupsOnShow = config.fully_hide_other_groups_on_show;
        }

        if (config.visible_style) {
          var dynamicStyle = "";
          Object.keys(config.visible_style).forEach(prop => {
            dynamicStyle += prop + ": " + config.visible_style[prop] + " !important;\n";
          });
          var visibleStyleNode = document.createElement("style");
          visibleStyleNode.innerHTML = "\n          .visibleOn {\n           " + dynamicStyle + "\n          }\n        ";
          this.appendChild(visibleStyleNode);
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

      disconnectedCallback() {
        this.removeAllElements();
      }

      updateElements() {
        if (!this._hass || !this._config || !this.parentElement) {
          return;
        }

        if (this._elements.length === 0) {
          this._config.elements.map(elementConfig => {
            var element = createStyledHuiElement(elementConfig, this.parentElement);

            this._elements.push(element);
          });

          if (this._config.elements_pos !== undefined) {
            this._container = this.createElementsContainer(this._config.elements_pos);
          }

          if (this._config.close_button !== undefined && this._config.close_button.show) {
            this._elements.push(this.createCloseButton(this._config.close_button));
          }
        }

        if (this._config.toggle_area_elements && this._toggleAreaElements.length === 0) {
          this._config.toggle_area_elements.map(elementConfig => {
            var element = createStyledHuiElement(elementConfig, this.parentElement);

            this._toggleAreaElements.push(element);
          });
        }

        var container = this._container ? this._container : this;

        if (container !== this) {
          if (this._visible) {
            if (!this._container.parentElement) {
              this.parentElement.appendChild(this._container);
            }
          } else if (this._container.parentElement) {
            this._container.parentElement.removeChild(this._container);
          }
        }

        this._elements.map(el => {
          if (this._visible) {
            el.hass = this._hass;

            if (!el.parentElement) {
              container.appendChild(el);
            }
          } else if (el.parentElement) {
            el.parentElement.removeChild(el);
          }
        });

        this._toggleAreaElements.map(el => {
          el.hass = this._hass;

          if (!el.parentElement) {
            this.appendChild(el);
          }
        });

        this.setVisibilityStyle(this._visible);
      }

      removeAllElements() {
        if (this._container) {
          if (this._container.parentElement) {
            this._container.parentElement.removeChild(this._container);
          }

          this._container = undefined;
        }

        this._elements.map(el => {
          if (el.parentElement) {
            el.parentElement.removeChild(el);
          }
        });

        this._elements = [];

        this._toggleAreaElements.map(el => {
          if (el.parentElement) {
            el.parentElement.removeChild(el);
          }
        });

        this._toggleAreaElements = [];
      }

      toggleVisibility(userClicked, hide) {
        if (!this._toggleTap) {
          return;
        }

        if (userClicked && this._noToggleHide && this._visible) {
          return;
        }

        this._visible = !this._visible;
        this.updateElements();

        if (this._visible && this.attributes.groupingCode) {
          this.parentElement.querySelectorAll("group-element").forEach(el => {
            if (el !== this && el.attributes.groupingCode !== undefined && el.attributes.groupingCode === this.attributes.groupingCode) {
              if (el._visible) {
                el.toggleVisibility();
              }

              if (hide !== undefined) {
                el.style.display = hide ? "none" : "block";
              }
            }
          });
        } else if (hide !== undefined) {
          this.parentElement.querySelectorAll("group-element").forEach(el => {
            el.style.display = hide ? "none" : "block";
          });
        }
      }

      createElementsContainer(elementsPosConfig) {
        var element = document.createElement("div");
        element.className = "element";
        Object.keys(elementsPosConfig).forEach(prop => {
          element.style.setProperty(prop, elementsPosConfig[prop]);
        });
        return element;
      }

      createCloseButton(buttonConfig) {
        var element = document.createElement("div");

        if (buttonConfig.style) {
          Object.keys(buttonConfig.style).forEach(prop => {
            element.style.setProperty(prop, buttonConfig.style[prop]);
          });
        }

        element.className = "element";
        element.style.display = "flex";
        element.style.flexDirection = "column";
        element.style.justifyContent = "center";
        element.style.alignItems = "center";
        element.style.cursor = "pointer";
        var elementIcon = document.createElement("ha-icon");
        elementIcon.group = this;
        elementIcon.style.transform = buttonConfig.style["--icon-transform"];
        elementIcon.icon = buttonConfig.icon !== undefined ? buttonConfig.icon : "hass:close";
        elementIcon.addEventListener("click", ev => {
          if (ev.target !== elementIcon) {
            ev.stopPropagation();
            return;
          }

          if (elementIcon.group) {
            elementIcon.group.toggleVisibility(false, false);
          }
        });
        element.appendChild(elementIcon);
        return element;
      }

      setVisibilityStyle(visible) {
        if (!this._config.visible_style) {
          return;
        }

        if (visible) {
          this.classList.add("visibleOn");
        } else {
          this.classList.remove("visibleOn");
        }
      }

    });
  });
})();
