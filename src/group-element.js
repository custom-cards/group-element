import { createStyledHuiElement } from "./hass/createStyledHuiElement.js";
import "./group-element-editor.js";

const DRAG_THRESHOLD = 4;
const PERCENT_POSITION = /^([+-]?(\d+(\.\d*)?|\.\d+)%|0)$/;
const clampPercent = value => Math.min(100, Math.max(0, value));
const comparableConfig = value => {
  if (Array.isArray(value)) return value.map(item => comparableConfig(item));
  if (!value || typeof value !== "object") return value;
  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = comparableConfig(value[key]);
      return result;
    }, {});
};

customElements.define(
  "group-element",
  class HuiGroupElement extends HTMLElement {
    static getConfigElement() {
      return document.createElement("group-element-editor");
    }

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
      this._visibleStyleNode = undefined;
      this._editorPreviewRestore = undefined;
      this._editorListenersActive = false;
      this._runtimeSyncFrame = undefined;
      this._editorPreviewHandler = event => this.handleEditorPreview(event);
      this._dragEditorSession = undefined;
      this._nestedDragPress = undefined;
      this._suppressNestedClick = false;
      this._dragEditorStateHandler = event =>
        this.handleDragEditorState(event);
      this._nestedPointerDown = event => this.handleNestedPointerDown(event);
      this._nestedPointerMove = event => this.handleNestedPointerMove(event);
      this._nestedPointerUp = event => this.handleNestedPointerUp(event);
      this._nestedPointerCancel = event =>
        this.handleNestedPointerCancel(event);
      this._nestedBlockedAction = event => this.blockNestedAction(event);
      // handle both tap and click since it's inconsistent in picture-element
      this.addEventListener("click", () => this.toggleVisibility(
        true,
        this.fullyHideOtherGroupsOnShow !== undefined &&
          this.fullyHideOtherGroupsOnShow
      ));
    }

    setConfig(config) {
      if (!config.elements || !Array.isArray(config.elements)) {
        throw new Error("Error in card configuration.");
      }

      if (this._editorPreviewRestore) {
        this.restoreEditorPreview();
      }
      this.clearNestedEditingMarks();
      this.removeAllElements();

      this._config = config;

      this.style.transform = "none";
      this._visible = config.visible !== undefined ? config.visible : true;
      this._toggleTap = Boolean(config.toggle_tap);
      if (this._toggleTap) {
        this.style.cursor = "pointer";
      } else if (config.style && config.style.cursor !== undefined) {
        this.style.setProperty("cursor", config.style.cursor);
      } else {
        this.style.removeProperty("cursor");
      }

      this._noToggleHide = Boolean(config.no_toggle_hide);

      if (config.grouping_code !== undefined) {
        this.attributes.groupingCode = config.grouping_code;
      } else {
        this.removeAttribute("groupingCode");
      }

      this.fullyHideOtherGroupsOnShow =
        config.fully_hide_other_groups_on_show;

      if (config.visible_style) {
        let dynamicStyle = "";
        Object.keys(config.visible_style).forEach((prop) => {
          dynamicStyle +=
            prop + ": " + config.visible_style[prop] + " !important;\n";
        });

        if (!this._visibleStyleNode) {
          this._visibleStyleNode = document.createElement("style");
          this.appendChild(this._visibleStyleNode);
        }
        this._visibleStyleNode.textContent =
          `
          .visibleOn {
           ` +
          dynamicStyle +
          `
          }
        `;
      } else if (this._visibleStyleNode) {
        this._visibleStyleNode.remove();
        this._visibleStyleNode = undefined;
      }

      this.updateElements();
      this.scheduleEditorRuntimeSync();
    }

    set hass(hass) {
      this._hass = hass;

      if (this._visible && this.shouldHideForEntityState()) {
        this._visible = false;
      }

      this.updateElements();
      this.scheduleEditorRuntimeSync();
    }

    shouldHideForEntityState() {
      const condition = this._config.hide_when;
      if (!condition || !condition.entity || condition.state === undefined) {
        return false;
      }

      return (
        this._hass.states &&
        this._hass.states[condition.entity] &&
        this._hass.states[condition.entity].state === condition.state
      );
    }

    show() {
      if (!this._visible) {
        this._visible = true;
        this.updateElements();
      }
    }

    hide() {
      if (this._visible) {
        this._visible = false;
        this.updateElements();
      }
    }

    // required since otherwise if child custom elements are loaded later then event fired (ll-rebuild) will not be handled
    // because this element does not yet have a parent. If this is ever added as a non custom element remove this + remove also: || !this.parentElement) {
    // from updateElements
    connectedCallback() {
      if (!this._editorListenersActive) {
        window.addEventListener(
          "group-element-editor-preview",
          this._editorPreviewHandler
        );
        window.addEventListener(
          "group-element-editor-drag-state",
          this._dragEditorStateHandler
        );
        this._editorListenersActive = true;
      }
      this.updateElements();
      this.scheduleEditorRuntimeSync();
    }

    disconnectedCallback() {
      if (this._editorPreviewRestore) {
        this.restoreEditorPreview();
      }
      this.deactivateNestedEditing();
      if (this._editorListenersActive) {
        window.removeEventListener(
          "group-element-editor-preview",
          this._editorPreviewHandler
        );
        window.removeEventListener(
          "group-element-editor-drag-state",
          this._dragEditorStateHandler
        );
        this._editorListenersActive = false;
      }
      if (this._runtimeSyncFrame !== undefined) {
        window.cancelAnimationFrame(this._runtimeSyncFrame);
        this._runtimeSyncFrame = undefined;
      }
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

          if (element.tagName === "GROUP-ELEMENT") {
            element._groupElementParent = this;
          }

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

      this._toggleAreaElements.map((el) => {
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
      element._groupElementOwner = this;

      Object.keys(elementsPosConfig).forEach((prop) => {
        element.style.setProperty(prop, elementsPosConfig[prop]);
      });

      return element;
    }

    handleEditorPreview(event) {
      const detail = event.detail || {};
      if (!detail.config || !this.hasMatchingConfig(detail.config)) {
        return;
      }

      if (detail.show) {
        this.showEditorPreview(detail.target);
      } else {
        this.hideEditorPreview(detail.target);
      }
    }

    hasMatchingConfig(config) {
      return (
        JSON.stringify(comparableConfig(this._config)) ===
        JSON.stringify(comparableConfig(config))
      );
    }

    scheduleEditorRuntimeSync() {
      if (this._runtimeSyncFrame !== undefined) {
        return;
      }
      this._runtimeSyncFrame = window.requestAnimationFrame(() => {
        this._runtimeSyncFrame = undefined;
        if (!this.isConnected) {
          return;
        }
        const preview = window.__groupElementEditorPreview;
        if (preview && this.hasMatchingConfig(preview.config)) {
          this.showEditorPreview(preview.target);
        }
        const dragEditors =
          window.__groupElementDragEditors instanceof Map
            ? Array.from(window.__groupElementDragEditors.values())
            : [window.__groupElementDragEditor].filter(Boolean);
        const dragEditor = dragEditors.find(
          editor =>
            editor &&
            editor.active &&
            editor.config &&
            this.hasMatchingConfig(editor.config)
        );
        if (
          dragEditor &&
          dragEditor.active
        ) {
          this.activateNestedEditing(dragEditor);
        } else if (this._dragEditorSession) {
          this.deactivateNestedEditing();
        }
      });
    }

    handleDragEditorState(event) {
      const detail = event.detail || {};
      if (!detail.active) {
        if (detail.sessionId === this._dragEditorSession) {
          this.deactivateNestedEditing();
        }
        return;
      }
      if (detail.config && this.hasMatchingConfig(detail.config)) {
        this.activateNestedEditing(detail);
      }
    }

    activateNestedEditing(detail) {
      const wasActive = Boolean(this._dragEditorSession);
      this._dragEditorSession = detail.sessionId;
      this._nestedSelected = detail.selected;
      if (!wasActive) {
        window.addEventListener("pointerdown", this._nestedPointerDown, true);
        window.addEventListener("pointermove", this._nestedPointerMove, true);
        window.addEventListener("pointerup", this._nestedPointerUp, true);
        window.addEventListener(
          "pointercancel",
          this._nestedPointerCancel,
          true
        );
        [
          "mousedown",
          "click",
          "dblclick",
          "contextmenu",
          "dragstart",
          "touchstart",
          "touchend"
        ].forEach(type =>
          window.addEventListener(type, this._nestedBlockedAction, true)
        );
      }
      this.updateNestedEditingMarks();
    }

    deactivateNestedEditing() {
      if (!this._dragEditorSession) {
        return;
      }
      window.removeEventListener("pointerdown", this._nestedPointerDown, true);
      window.removeEventListener("pointermove", this._nestedPointerMove, true);
      window.removeEventListener("pointerup", this._nestedPointerUp, true);
      window.removeEventListener(
        "pointercancel",
        this._nestedPointerCancel,
        true
      );
      [
        "mousedown",
        "click",
        "dblclick",
        "contextmenu",
        "dragstart",
        "touchstart",
        "touchend"
      ].forEach(type =>
        window.removeEventListener(type, this._nestedBlockedAction, true)
      );
      this.restoreNestedDragPosition();
      this._nestedDragPress = undefined;
      this._dragEditorSession = undefined;
      this._nestedSelected = undefined;
      this._suppressNestedClick = false;
      this.clearNestedEditingMarks();
    }

    updateNestedEditingMarks() {
      this.clearNestedEditingMarks();
      this.classList.add("group-element-nested-editing");
      const style = document.createElement("style");
      style.className = "group-element-nested-editor-style";
      style.textContent = `
        .group-element-nested-editing .element {
          outline: none !important;
        }
        .group-element-editing-child {
          cursor: pointer !important;
        }
        .group-element-editing-child.group-element-movable {
          cursor: grab !important;
          touch-action: none !important;
        }
        .group-element-editing-child.group-element-dragging {
          cursor: grabbing !important;
        }
        .group-element-editing-child.group-element-selected {
          outline: 2px solid var(--primary-color) !important;
          outline-offset: 2px !important;
        }
        @media (hover: hover) {
          .group-element-editing-child:hover {
            outline: 1px dashed var(--primary-color) !important;
          }
          .group-element-editing-child.group-element-selected:hover {
            outline: 2px solid var(--primary-color) !important;
          }
        }
      `;
      this._nestedEditorStyleNode = style;
      this.appendChild(style);

      this.getNestedTargets().forEach(target => {
        target.element.classList.add("group-element-editing-child");
        target.element.classList.toggle(
          "group-element-movable",
          Boolean(this.getDragAxes(target.config))
        );
        target.element.classList.toggle(
          "group-element-selected",
          Boolean(
            this._nestedSelected &&
              this._nestedSelected.collection === target.collection &&
              this._nestedSelected.index === target.index
          )
        );
      });
    }

    clearNestedEditingMarks() {
      this.classList.remove("group-element-nested-editing");
      this.getNestedTargets().forEach(target => {
        target.element.classList.remove(
          "group-element-editing-child",
          "group-element-movable",
          "group-element-dragging",
          "group-element-selected"
        );
      });
      if (this._nestedEditorStyleNode) {
        this._nestedEditorStyleNode.remove();
        this._nestedEditorStyleNode = undefined;
      }
    }

    getNestedTargets() {
      const groupConfig = this._config || {};
      const targets = (groupConfig.elements || []).map((config, index) => ({
        collection: "elements",
        index,
        config,
        element: this._elements[index],
        root: this._container || this
      }));
      (groupConfig.toggle_area_elements || []).forEach((config, index) => {
        targets.push({
          collection: "toggle_area_elements",
          index,
          config,
          element: this._toggleAreaElements[index],
          root: this
        });
      });
      if (
        this._container &&
        this._editorPreviewRestore &&
        ["elements-container", "whole-group"].includes(
          this._editorPreviewRestore.target
        )
      ) {
        targets.push({
          collection: "elements_pos",
          config: { style: groupConfig.elements_pos || {} },
          element: this._container,
          root: this._container.parentElement || this.parentElement || this
        });
      }
      return targets.filter(target => target.element);
    }

    findNestedTarget(event) {
      const targets = this.getNestedTargets();
      for (const node of event.composedPath()) {
        const target = targets.find(item => item.element === node);
        if (target) {
          return target;
        }
      }
      return undefined;
    }

    isOwnElementsContainerEvent(event) {
      const container = event
        .composedPath()
        .find(node => node && node._groupElementOwner);
      return Boolean(container && container._groupElementOwner === this);
    }

    shouldDeferToNestedGroup(event, target) {
      const path = event.composedPath();
      const targetIndex = path.indexOf(target.element);
      if (targetIndex < 0) {
        return false;
      }
      return path.slice(0, targetIndex + 1).some(node =>
        node &&
        node !== this &&
        node.tagName === "GROUP-ELEMENT" &&
        node._dragEditorSession &&
        typeof node.findNestedTarget === "function" &&
        node.findNestedTarget(event)
      );
    }

    getDragAxes(config) {
      if (config.type === "conditional") {
        return undefined;
      }
      const style = config.style || {};
      if (!style || typeof style !== "object" || Array.isArray(style)) {
        return undefined;
      }
      const value = property => {
        const raw = style[property];
        return raw === undefined || raw === null ? "" : String(raw).trim();
      };
      if (value("position") && value("position").toLowerCase() !== "absolute") {
        return undefined;
      }
      if (
        Object.keys(style).some(
          key => key.toLowerCase().startsWith("inset") && value(key)
        )
      ) {
        return undefined;
      }
      const left = value("left");
      const right = value("right");
      const top = value("top");
      const bottom = value("bottom");
      if ((left && right) || (top && bottom)) {
        return undefined;
      }
      const horizontal = right ? "right" : "left";
      const vertical = bottom ? "bottom" : "top";
      if (
        (value(horizontal) && !PERCENT_POSITION.test(value(horizontal))) ||
        (value(vertical) && !PERCENT_POSITION.test(value(vertical)))
      ) {
        return undefined;
      }
      return { horizontal, vertical };
    }

    getStartPosition(target, axes) {
      const rootWidth = target.root.offsetWidth;
      const rootHeight = target.root.offsetHeight;
      if (!rootWidth || !rootHeight) {
        return undefined;
      }
      const style = target.config.style || {};
      const computed = getComputedStyle(target.element);
      const percent = (property, size) => {
        const configured = style[property];
        if (configured !== undefined && configured !== null) {
          const text = String(configured).trim();
          if (text === "0") return 0;
          if (text.endsWith("%")) return parseFloat(text);
        }
        return (parseFloat(computed[property]) / size) * 100;
      };
      const horizontal = percent(axes.horizontal, rootWidth);
      const vertical = percent(axes.vertical, rootHeight);
      if (!Number.isFinite(horizontal) || !Number.isFinite(vertical)) {
        return undefined;
      }
      return { horizontal, vertical, rootWidth, rootHeight };
    }

    handleNestedPointerDown(event) {
      if (
        !this._dragEditorSession ||
        !event.isPrimary ||
        event.button !== 0 ||
        event.ctrlKey
      ) {
        return;
      }
      const target = this.findNestedTarget(event);
      if (!target) {
        if (this.isOwnElementsContainerEvent(event)) {
          event.stopImmediatePropagation();
          event.preventDefault();
        }
        return;
      }
      if (this.shouldDeferToNestedGroup(event, target)) {
        return;
      }
      event.stopImmediatePropagation();
      event.preventDefault();
      const axes = this.getDragAxes(target.config);
      const start = axes ? this.getStartPosition(target, axes) : undefined;
      this._nestedDragPress = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        target,
        axes,
        start,
        dragged: false,
        moved: undefined,
        original: ["left", "right", "top", "bottom"].reduce(
          (result, property) => {
            result[property] = {
              value: target.element.style.getPropertyValue(property),
              priority: target.element.style.getPropertyPriority(property)
            };
            return result;
          },
          {}
        )
      };
      try {
        target.root.setPointerCapture(event.pointerId);
      } catch (err) {
        // Window capture still keeps the drag working when capture is absent.
        this._pointerCaptureUnavailable = Boolean(err);
      }
    }

    handleNestedPointerMove(event) {
      const press = this._nestedDragPress;
      if (!press || event.pointerId !== press.pointerId) {
        return;
      }
      event.stopImmediatePropagation();
      event.preventDefault();
      if (!event.buttons) {
        this.handleNestedPointerCancel(event);
        return;
      }
      const dx = event.clientX - press.clientX;
      const dy = event.clientY - press.clientY;
      if (!press.dragged && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
        return;
      }
      press.dragged = true;
      if (!press.axes || !press.start) {
        return;
      }
      const horizontalDirection = press.axes.horizontal === "right" ? -1 : 1;
      const verticalDirection = press.axes.vertical === "bottom" ? -1 : 1;
      const horizontal = clampPercent(
        press.start.horizontal +
          horizontalDirection * (dx / press.start.rootWidth) * 100
      );
      const vertical = clampPercent(
        press.start.vertical +
          verticalDirection * (dy / press.start.rootHeight) * 100
      );
      press.moved = { horizontal, vertical };
      press.target.element.style.setProperty(
        press.axes.horizontal,
        `${horizontal}%`
      );
      press.target.element.style.setProperty(
        press.axes.vertical,
        `${vertical}%`
      );
      press.target.element.classList.add("group-element-dragging");
    }

    handleNestedPointerUp(event) {
      const press = this._nestedDragPress;
      if (!press || event.pointerId !== press.pointerId) {
        return;
      }
      event.stopImmediatePropagation();
      event.preventDefault();
      this._suppressNestedClick = true;
      window.setTimeout(() => {
        this._suppressNestedClick = false;
      }, 0);
      press.target.element.classList.remove("group-element-dragging");
      if (press.moved && press.axes) {
        const round = value => Math.round(value * 10) / 10;
        this.dispatchNestedDragAction("move", press.target, {
          [press.axes.horizontal]: `${round(press.moved.horizontal)}%`,
          [press.axes.vertical]: `${round(press.moved.vertical)}%`
        });
      } else if (!press.dragged) {
        this.dispatchNestedDragAction("select", press.target);
      } else {
        this.restoreNestedDragPosition();
      }
      this._nestedDragPress = undefined;
    }

    handleNestedPointerCancel(event) {
      const press = this._nestedDragPress;
      if (!press || event.pointerId !== press.pointerId) {
        return;
      }
      event.stopImmediatePropagation();
      event.preventDefault();
      this.restoreNestedDragPosition();
      press.target.element.classList.remove("group-element-dragging");
      this._nestedDragPress = undefined;
    }

    restoreNestedDragPosition() {
      const press = this._nestedDragPress;
      if (!press || !press.original) {
        return;
      }
      Object.keys(press.original).forEach(property => {
        const original = press.original[property];
        if (original.value) {
          press.target.element.style.setProperty(
            property,
            original.value,
            original.priority
          );
        } else {
          press.target.element.style.removeProperty(property);
        }
      });
    }

    blockNestedAction(event) {
      const target = this.findNestedTarget(event);
      if (!target) {
        if (this.isOwnElementsContainerEvent(event)) {
          event.stopImmediatePropagation();
          event.preventDefault();
        }
        return;
      }
      if (this.shouldDeferToNestedGroup(event, target)) {
        return;
      }
      event.stopImmediatePropagation();
      event.preventDefault();
      if (event.type === "click") {
        const followsPointer = this._suppressNestedClick;
        this._suppressNestedClick = false;
        if (target && !this._nestedDragPress && !followsPointer) {
          this.dispatchNestedDragAction("select", target);
        }
      }
    }

    dispatchNestedDragAction(action, target, position) {
      window.dispatchEvent(
        new CustomEvent("group-element-editor-drag-action", {
          detail: {
            sessionId: this._dragEditorSession,
            action,
            collection: target.collection,
            index: target.index,
            position
          }
        })
      );
    }

    getParentGroup() {
      if (this._groupElementParent) {
        return this._groupElementParent;
      }

      let parent = this.parentElement;
      while (parent) {
        if (parent.tagName === "GROUP-ELEMENT") {
          return parent;
        }
        if (parent._groupElementOwner) {
          return parent._groupElementOwner;
        }
        parent = parent.parentElement;
      }
      return undefined;
    }

    showEditorPreview(target) {
      if (
        this._editorPreviewRestore &&
        this._editorPreviewRestore.target === target
      ) {
        return;
      }
      if (this._editorPreviewRestore) {
        this.restoreEditorPreview();
      }

      const chain = [];
      let group = this;
      while (group) {
        chain.push({
          group,
          visible: group._visible,
          display: group.style.display
        });
        group = group.getParentGroup();
      }

      chain
        .slice()
        .reverse()
        .forEach(item => {
          item.group.style.display = "block";
          item.group._visible = !(
            target === "toggle-area" &&
            item.group === this &&
            this._toggleTap
          );
          item.group.updateElements();
        });

      const highlighted = [];
      if (target === "elements-container") {
        if (this._container) {
          highlighted.push(this._container);
        }
      } else if (target === "whole-group") {
        highlighted.push(this);
        if (this._container) {
          highlighted.push(this._container);
        }
      } else {
        highlighted.push(this);
      }

      if (highlighted.length === 0) {
        chain.forEach(item => {
          item.group._visible = item.visible;
          item.group.style.display = item.display;
          item.group.updateElements();
        });
        return;
      }

      this._editorPreviewRestore = {
        target,
        chain,
        highlighted: highlighted.map(element => ({
          element,
          border: element.style.getPropertyValue("border"),
          borderPriority: element.style.getPropertyPriority("border"),
          boxSizing: element.style.getPropertyValue("box-sizing"),
          boxSizingPriority: element.style.getPropertyPriority("box-sizing")
        }))
      };
      highlighted.forEach(element => {
        element.style.setProperty("border", "2px solid red", "important");
        element.style.setProperty("box-sizing", "border-box", "important");
      });
      if (this._dragEditorSession) {
        this.updateNestedEditingMarks();
      }
    }

    hideEditorPreview(target) {
      if (
        !this._editorPreviewRestore ||
        this._editorPreviewRestore.target !== target
      ) {
        return;
      }
      this.restoreEditorPreview();
    }

    restoreEditorPreview() {
      const restore = this._editorPreviewRestore;
      if (!restore) {
        return;
      }
      if (this._dragEditorSession) {
        this.clearNestedEditingMarks();
      }

      restore.highlighted.forEach(item => {
        if (item.border) {
          item.element.style.setProperty(
            "border",
            item.border,
            item.borderPriority
          );
        } else {
          item.element.style.removeProperty("border");
        }
        if (item.boxSizing) {
          item.element.style.setProperty(
            "box-sizing",
            item.boxSizing,
            item.boxSizingPriority
          );
        } else {
          item.element.style.removeProperty("box-sizing");
        }
      });

      restore.chain.forEach(item => {
        item.group._visible = item.visible;
        item.group.style.display = item.display;
        item.group.updateElements();
      });
      this._editorPreviewRestore = undefined;
      if (this._dragEditorSession) {
        this.updateNestedEditingMarks();
      }
    }

    createCloseButton(buttonConfig) {
      const element = document.createElement("div");
      const buttonStyle = buttonConfig.style || {};

      Object.keys(buttonStyle).forEach((prop) => {
        element.style.setProperty(prop, buttonStyle[prop]);
      });

      element.className = "element";
      element.style.display = "flex";
      element.style.flexDirection = "column";
      element.style.justifyContent = "center";
      element.style.alignItems = "center";
      element.style.cursor = "pointer";

      const elementIcon = document.createElement("ha-icon");

      elementIcon.group = this;

      elementIcon.style.transform = buttonStyle["--icon-transform"] || "";

      elementIcon.icon =
        buttonConfig.icon !== undefined ? buttonConfig.icon : "hass:close";

      elementIcon.addEventListener("click", (ev) => {
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
        this.classList.remove("visibleOn");
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
