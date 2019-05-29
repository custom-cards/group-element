import { createStyledHuiElement } from "./hass/createStyledHuiElement";

customElements.define(
  "group-element",
  class HuiGroupElement extends HTMLElement {
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

      this.addEventListener("click", (ev) => {
        // if click is on internal element and there are no elements in toggle area user asked to show - get out
        // if there are - handle tap/toggle visibility
        if (ev.target !== this && this._toggleAreaElements.length === 0) {
          ev.stopPropagation();
          return;
        }
        this.toggleVisibility(
          true,
          this.fullyHideOtherGroupsOnShow !== undefined &&
            this.fullyHideOtherGroupsOnShow
        );
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

      if (this._toggleAreaElements.length > 0) {
        this._toggleAreaElements.map((el) => {
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

      if (config.no_toggle_hide !== undefined) {
        this._noToggleHide = config.no_toggle_hide;
      }

      if (config.grouping_code !== undefined) {
        this.attributes.groupingCode = config.grouping_code;
      }

      if (config.fully_hide_other_groups_on_show !== undefined) {
        this.fullyHideOtherGroupsOnShow =
          config.fully_hide_other_groups_on_show;
      }

      if (config.visible_style) {
        var dynamicStyle = "";
        Object.keys(config.visible_style).forEach((prop) => {
          dynamicStyle +=
            prop + ": " + config.visible_style[prop] + " !important;\n";
        });

        const visibleStyleNode = document.createElement("style");
        visibleStyleNode.innerHTML =
          `
          .visibleOn {
           ` +
          dynamicStyle +
          `
          }
        `;

        this.appendChild(visibleStyleNode);
      }

      this.updateElements();
    }

    set hass(hass) {
      this._hass = hass;

      this.updateElements();
    }

    // required since otherwise if child custom elements are loaded later then event fired (ll-rebuild) will not be handled
    // because this element does not yet have a parent. If this is ever added as a non custom element remove this + remove also: || !this.parentElement) {
    // from updateElements
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
        this._config.elements.map((elementConfig) => {
          const element = createStyledHuiElement(
            elementConfig,
            this.parentElement
          );

          this._elements.push(element);
        });

        if (this._config.elements_pos !== undefined) {
          this._container = this.createElementsContainer(
            this._config.elements_pos
          );
        }

        if (
          this._config.close_button !== undefined &&
          this._config.close_button.show
        ) {
          this._elements.push(
            this.createCloseButton(this._config.close_button)
          );
        }
      }

      if (
        this._config.toggle_area_elements &&
        this._toggleAreaElements.length === 0
      ) {
        this._config.toggle_area_elements.map((elementConfig) => {
          const element = createStyledHuiElement(
            elementConfig,
            this.parentElement
          );

          this._toggleAreaElements.push(element);
        });
      }

      const container = this._container ? this._container : this;

      if (container !== this) {
        if (this._visible) {
          if (!this._container.parentElement) {
            // append the element container to the group's parent for same level positioning
            this.parentElement.appendChild(this._container);
          }
        } else if (this._container.parentElement) {
          this._container.parentElement.removeChild(this._container);
        }
      }

      this._elements.map((el) => {
        if (this._visible) {
          el.hass = this._hass;
          if (!el.parentElement) {
            container.appendChild(el);
          }
        } else if (el.parentElement) {
          el.parentElement.removeChild(el);
        }
      });

      this._toggleAreaElements.map((element) => {
        if (!element.parentElement) {
          element.hass = this._hass;
          this.appendChild(element);
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

      this._elements.map((el) => {
        if (el.parentElement) {
          el.parentElement.removeChild(el);
        }
      });

      this._elements = [];

      this._toggleAreaElements.map((el) => {
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
        this.parentElement.querySelectorAll("group-element").forEach((el) => {
          if (
            el !== this &&
            el.attributes.groupingCode !== undefined &&
            el.attributes.groupingCode === this.attributes.groupingCode
          ) {
            if (el._visible) {
              el.toggleVisibility();
            }

            if (hide !== undefined) {
              el.style.display = hide ? "none" : "block";
            }
          }
        });
      } else if (hide !== undefined) {
        this.parentElement.querySelectorAll("group-element").forEach((el) => {
          el.style.display = hide ? "none" : "block";
        });
      }
    }

    createElementsContainer(elementsPosConfig) {
      const element = document.createElement("div");

      element.className = "element";

      Object.keys(elementsPosConfig).forEach((prop) => {
        element.style.setProperty(prop, elementsPosConfig[prop]);
      });

      return element;
    }

    createCloseButton(buttonConfig) {
      const element = document.createElement("ha-icon");

      element.group = this;

      element.icon =
        buttonConfig.icon !== undefined ? buttonConfig.icon : "hass:close";

      element.className = "element";

      if (buttonConfig.style) {
        Object.keys(buttonConfig.style).forEach((prop) => {
          element.style.setProperty(prop, buttonConfig.style[prop]);
        });
      }

      element.addEventListener("click", (ev) => {
        if (ev.target !== element) {
          ev.stopPropagation();
          return;
        }

        if (element.group) {
          element.group.toggleVisibility(false, false);
        }
      });

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
  }
);
