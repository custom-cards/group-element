const LABELS = {
  grouping_code:
    "When toggled and shown, hide the toggled contents of other sibling groups with the same grouping code:",
  fully_hide_other_groups_on_show:
    "When shown, also hide the always shown elements of the other groups.",
  entity: "Entity",
  state: "State",
  show: "Show close button",
  icon: "Icon"
};

const HELP = {
  title: "A management name saved in YAML. It does not change what the group displays.",
  mode: "Choose an empty toggle hotspot, a toggle area with always-shown elements, or a fixed group with no toggling.",
  toggle: "This is set and locked by the selected mode.",
  visible: "Whether the main group contents are visible when the element is first created.",
  noToggle: "This is useful for a tab like UI – once a tab is shown clicking it again does not hide it.",
  style: "CSS positioning and styling for the group, hotspot, or always-shown toggle area.",
  elementsPos: "CSS for the separate toggled-elements container. Coordinates are relative to the picture-elements card.",
  elements: "The main picture-elements children. Toggle modes show and hide them together.",
  toggleElements: "Elements inside the toggle area. They remain visible when the main contents are hidden.",
  visibleStyle: "Extra CSS applied to the group container only while its contents are visible.",
  grouping: "When this group opens, sibling toggle groups with the same code close.",
  fullHide: "Also hides matching sibling group hosts, including their always-shown toggle-area elements. Requires a grouping code.",
  hideWhen: "Hides the group when the selected entity exactly matches the state. It does not automatically show it again.",
  close: "Adds a close control to the toggled contents. Available only in a toggle mode.",
  closeStyle: "CSS for positioning and styling the close-button container.",
  template: "Insert a useful positioning template. This is disabled if the group already contains any CSS, so existing styles are never changed."
};

const MODES = {
  HOTSPOT: "hotspot",
  TOGGLE_AREA: "toggle-area",
  NO_TOGGLE: "no-toggle"
};

const POSITION_TEMPLATE = {
  left: "50%",
  top: "52%",
  width: "55%",
  height: "55%",
  transform: "none"
};

const clone = config => JSON.parse(JSON.stringify(config));
const owns = (object, property) =>
  Object.prototype.hasOwnProperty.call(object, property);

class GroupElementEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = undefined;
    this._hass = undefined;
    this._editing = undefined;
    this._lastEmittedConfig = undefined;
    this._openSections = new Set();
    this._previewState = {};
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  setConfig(config) {
    if (!config || !Array.isArray(config.elements)) {
      throw new Error("Group element requires an elements array.");
    }
    const serialized = JSON.stringify(config);
    if (serialized === this._lastEmittedConfig) {
      this._config = clone(config);
      this._lastEmittedConfig = undefined;
      return;
    }
    this._config = clone(config);
    this._editing = undefined;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    Object.keys(this._previewState).forEach(target =>
      this.setPreview(target, false)
    );
  }

  getMode() {
    if (!this._config.toggle_tap) return MODES.NO_TOGGLE;
    return owns(this._config, "toggle_area_elements")
      ? MODES.TOGGLE_AREA
      : MODES.HOTSPOT;
  }

  render() {
    if (!this.shadowRoot || !this._config || !this._hass) return;
    this.shadowRoot.replaceChildren(this.createStyles());
    if (this._editing) {
      this.renderSubElementEditor();
      return;
    }

    const mode = this.getMode();
    this.renderTitle();
    this.renderMode(mode);
    this.renderBehavior(mode);

    const titles = {
      [MODES.HOTSPOT]: "Hotspot CSS",
      [MODES.TOGGLE_AREA]: "Toggle area CSS (always shown)",
      [MODES.NO_TOGGLE]: "Group CSS"
    };
    this.renderCssEditor(titles[mode], "style", HELP.style, true, undefined, {
      preview: "toggle-area",
      previewLabel:
        mode === MODES.NO_TOGGLE ? "Show group" : "Show toggle area"
    });

    if (mode === MODES.TOGGLE_AREA) {
      this.renderElementsSection(
        "Toggle area elements (always shown)",
        "toggle_area_elements",
        HELP.toggleElements
      );
    }
    if (mode !== MODES.NO_TOGGLE) {
      this.renderCssEditor(
        "Elements container CSS (toggled elements)",
        "elements_pos",
        HELP.elementsPos,
        true,
        undefined,
        {
          preview: "elements-container",
          previewLabel: "Show elements container and its elements"
        }
      );
    }
    this.renderElementsSection(
      "Elements - group content",
      "elements",
      HELP.elements
    );
    this.renderAdvanced(mode);
  }

  renderTitle() {
    const field = document.createElement("label");
    field.className = "standalone-field";
    const label = this.createLabel(
      "Title (description for information only)",
      HELP.title
    );
    label.appendChild(
      this.createPreviewButton("whole-group", "Show complete group")
    );
    field.appendChild(label);
    const input = document.createElement("input");
    input.className = "text-input";
    input.value = this._config.title || "";
    input.addEventListener("input", event =>
      this.updateConfig({ title: event.target.value })
    );
    field.appendChild(input);
    this.shadowRoot.appendChild(field);
  }

  renderMode(mode) {
    const section = this.createSection("mode-section");
    section.appendChild(this.createHeading("Mode", HELP.mode));
    const group = document.createElement("div");
    group.className = "radio-group";
    [
      [MODES.HOTSPOT, "Toggle hotspot"],
      [MODES.TOGGLE_AREA, "Toggle area including elements"],
      [MODES.NO_TOGGLE, "No toggle"]
    ].forEach(choice => {
      const row = document.createElement("label");
      row.className = "radio-row";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "group-element-mode";
      radio.checked = mode === choice[0];
      radio.addEventListener("change", () => this.setMode(choice[0]));
      row.append(radio, choice[1]);
      group.appendChild(row);
    });
    section.appendChild(group);
    this.shadowRoot.appendChild(section);
  }

  setMode(mode) {
    const config = { ...this._config };
    if (mode === MODES.NO_TOGGLE) {
      config.toggle_tap = false;
      delete config.elements_pos;
      delete config.toggle_area_elements;
    } else {
      config.toggle_tap = true;
      if (!owns(config, "elements_pos")) config.elements_pos = {};
      if (mode === MODES.TOGGLE_AREA) {
        if (!owns(config, "toggle_area_elements")) {
          config.toggle_area_elements = [];
        }
      } else {
        delete config.toggle_area_elements;
      }
    }
    this._config = config;
    this.emit();
    this.render();
  }

  renderBehavior(mode) {
    const grid = document.createElement("div");
    grid.className = "switch-grid";
    grid.append(
      this.createSwitch(
        "Toggle when tapped",
        "toggle_tap",
        mode !== MODES.NO_TOGGLE,
        HELP.toggle,
        true
      ),
      this.createSwitch(
        "Initially visible",
        "visible",
        this._config.visible !== false,
        HELP.visible
      )
    );
    if (mode !== MODES.NO_TOGGLE) {
      grid.appendChild(
        this.createSwitch(
          "Tap shows but does not hide (tabs)",
          "no_toggle_hide",
          Boolean(this._config.no_toggle_hide),
          HELP.noToggle
        )
      );
    }
    this.shadowRoot.appendChild(grid);
  }

  renderCssEditor(title, property, help, template, parent, options = {}) {
    const section = this.createSection("css-section");
    const heading = this.createHeading(title, help);
    if (options.preview) {
      heading.appendChild(
        this.createPreviewButton(options.preview, options.previewLabel)
      );
    }
    if (template) heading.appendChild(this.createTemplateButton(property));
    section.appendChild(heading);
    const editor = document.createElement("ha-yaml-editor");
    editor.defaultValue = this.getNested(property) || {};
    editor.addEventListener("value-changed", event => {
      event.stopPropagation();
      const value = event.detail.value;
      if (value !== undefined && value !== null && typeof value !== "object") {
        return;
      }
      this.setNested(property, value || {});
      this.emit();
    });
    section.appendChild(editor);
    (parent || this.shadowRoot).appendChild(section);
  }

  createPreviewButton(target, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preview-button";
    button.title = `${label}. Hover for a temporary preview or click to keep it shown.`;
    button.setAttribute("aria-label", button.title);
    const icon = document.createElement("ha-icon");
    icon.icon = "mdi:selection";
    button.appendChild(icon);

    const state = this._previewState[target] || {
      hovered: false,
      pinned: false
    };
    this._previewState[target] = state;
    state.button = button;
    button.classList.toggle("active", state.pinned);

    button.addEventListener("mouseenter", () => {
      state.hovered = true;
      if (!state.pinned) this.setPreview(target, true);
    });
    button.addEventListener("mouseleave", () => {
      state.hovered = false;
      if (!state.pinned) this.setPreview(target, false);
    });
    button.addEventListener("click", () => {
      Object.keys(this._previewState).forEach(otherTarget => {
        const other = this._previewState[otherTarget];
        if (otherTarget !== target && other.pinned) {
          other.pinned = false;
          if (other.button) other.button.classList.remove("active");
          this.setPreview(otherTarget, false);
        }
      });
      state.pinned = !state.pinned;
      button.classList.toggle("active", state.pinned);
      this.setPreview(target, state.pinned);
    });
    return button;
  }

  setPreview(target, show) {
    if (show) {
      window.__groupElementEditorPreview = {
        config: clone(this._config),
        target
      };
    } else if (
      window.__groupElementEditorPreview &&
      window.__groupElementEditorPreview.target === target
    ) {
      window.__groupElementEditorPreview = undefined;
    }
    window.dispatchEvent(
      new CustomEvent("group-element-editor-preview", {
        detail: {
          config: clone(this._config),
          target,
          show
        }
      })
    );
  }

  createTemplateButton(property) {
    const button = document.createElement("button");
    button.className = "template-button";
    button.type = "button";
    button.title = HELP.template;
    button.setAttribute("aria-label", HELP.template);
    button.disabled = this.hasAnyCss();
    const icon = document.createElement("ha-icon");
    icon.icon = "mdi:file-code-outline";
    button.appendChild(icon);
    button.addEventListener("click", () => {
      if (this.hasAnyCss()) return;
      this.setNested(property, { ...POSITION_TEMPLATE });
      this.emit();
      this.render();
    });
    return button;
  }

  hasAnyCss() {
    const styles = [
      this._config.style,
      this._config.elements_pos,
      this._config.visible_style,
      this._config.close_button && this._config.close_button.style
    ];
    return styles.some(
      style => style && typeof style === "object" && Object.keys(style).length
    );
  }

  renderElementsSection(title, collection, help) {
    const section = this.createSection("contents-section");
    section.appendChild(this.createHeading(title, help));
    const editor = document.createElement(
      "hui-picture-elements-card-row-editor"
    );
    editor.hass = this._hass;
    editor.elements = this._config[collection] || [];
    Promise.resolve(editor.updateComplete).then(() => {
      if (!editor.shadowRoot) return;
      const style = document.createElement("style");
      style.textContent = "h3 { display: none !important; }";
      editor.shadowRoot.appendChild(style);
    });
    editor.addEventListener("elements-changed", event => {
      event.stopPropagation();
      this._config = {
        ...this._config,
        [collection]: event.detail.elements
      };
      this.emit();
      this.render();
    });
    editor.addEventListener("edit-detail-element", event => {
      event.stopPropagation();
      this._editing = { ...event.detail.subElementConfig, collection };
      this.render();
    });
    section.appendChild(editor);
    this.shadowRoot.appendChild(section);
  }

  renderAdvanced(mode) {
    const visible = this.createDetails(
      "Visible-state CSS",
      "Styles applied only while the group contents are visible."
    );
    this.renderCssEditor(
      "CSS applied while visible",
      "visible_style",
      HELP.visibleStyle,
      false,
      visible
    );
    this.shadowRoot.appendChild(visible);

    if (mode !== MODES.NO_TOGGLE) this.renderGrouping();
    this.renderStateHiding();
    if (mode !== MODES.NO_TOGGLE) this.renderCloseButton();
  }

  renderGrouping() {
    const details = this.createDetails(
      "Group coordination",
      "Defines how toggling affects other groups on the picture-elements card."
    );

    const field = document.createElement("label");
    field.className = "standalone-field grouping-field";
    field.appendChild(
      this.createLabel(LABELS.grouping_code, HELP.grouping)
    );
    const input = document.createElement("input");
    input.className = "text-input";
    input.value = this._config.grouping_code || "";
    field.appendChild(input);
    details.appendChild(field);

    const fullHide = this.createSwitch(
      LABELS.fully_hide_other_groups_on_show,
      "fully_hide_other_groups_on_show",
      Boolean(this._config.fully_hide_other_groups_on_show),
      HELP.fullHide,
      !this.hasGroupingCode()
    );
    details.appendChild(fullHide);
    const fullHideSwitch = fullHide.querySelector("ha-switch");

    input.addEventListener("input", event => {
      const value = event.target.value;
      const config = { ...this._config };
      if (value === "") {
        delete config.grouping_code;
        delete config.fully_hide_other_groups_on_show;
        fullHideSwitch.checked = false;
      } else {
        config.grouping_code = value;
      }
      this._config = config;
      this.emit();
      const disabled = !this.hasGroupingCode();
      fullHideSwitch.disabled = disabled;
      fullHide.classList.toggle("disabled", disabled);
    });

    this.shadowRoot.appendChild(details);
  }

  hasGroupingCode() {
    const value = this._config.grouping_code;
    return value !== undefined && value !== null && String(value).trim() !== "";
  }

  renderStateHiding() {
    const details = this.createDetails(
      "State-based hiding",
      "Hides the group when an entity reaches the configured state."
    );
    this.renderForm(
      [
        {
          type: "grid",
          schema: [
            { name: "entity", selector: { entity: {} } },
            { name: "state", selector: { text: {} } }
          ]
        }
      ],
      this._config.hide_when || {},
      value => {
        const config = { ...this._config };
        if (value.entity || value.state !== undefined) config.hide_when = value;
        else delete config.hide_when;
        this._config = config;
        this.emit();
      },
      details
    );
    const helper = document.createElement("p");
    helper.className = "description";
    helper.textContent =
      "A matching state hides the group. A later non-matching state does not show it automatically.";
    details.appendChild(helper);
    this.shadowRoot.appendChild(details);
  }

  renderCloseButton() {
    const details = this.createDetails(
      "Close button",
      "Configures an optional close control for the toggled contents."
    );
    this.renderForm(
      [
        {
          type: "grid",
          schema: [
            { name: "show", selector: { boolean: {} } },
            { name: "icon", selector: { icon: {} } }
          ]
        }
      ],
      this._config.close_button || {},
      value => {
        this._config = { ...this._config, close_button: value };
        this.emit();
      },
      details
    );
    this.renderCssEditor(
      "Close-button CSS",
      "close_button.style",
      HELP.closeStyle,
      false,
      details
    );
    this.shadowRoot.appendChild(details);
  }

  renderForm(schema, data, changed, parent) {
    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = data;
    form.schema = schema;
    form.computeLabel = field => LABELS[field.name] || field.name;
    form.computeHelper = field => {
      if (field.name === "grouping_code") return HELP.grouping;
      if (field.name === "fully_hide_other_groups_on_show") {
        return HELP.fullHide;
      }
      return undefined;
    };
    form.addEventListener("value-changed", event => {
      event.stopPropagation();
      changed(event.detail.value);
    });
    parent.appendChild(form);
  }

  renderSubElementEditor() {
    const editor = document.createElement("hui-sub-element-editor");
    editor.hass = this._hass;
    editor.config = this._editing;
    editor.addEventListener("go-back", event => {
      event.stopPropagation();
      this._editing = undefined;
      this.render();
    });
    editor.addEventListener("config-changed", event => {
      event.stopPropagation();
      this.updateEditedElement(event.detail.config);
    });
    this.shadowRoot.appendChild(editor);
  }

  updateEditedElement(elementConfig) {
    const { collection, index } = this._editing;
    const elements = [...(this._config[collection] || [])];
    if (elementConfig) {
      elements[index] = elementConfig;
      this._editing = { ...this._editing, elementConfig };
    } else {
      elements.splice(index, 1);
      this._editing = undefined;
    }
    this._config = { ...this._config, [collection]: elements };
    this.emit();
    if (!this._editing) this.render();
  }

  updateConfig(value) {
    this._config = { ...this._config, ...value };
    this.emit();
  }

  createSwitch(label, property, checked, help, disabled = false) {
    const row = document.createElement("label");
    row.className = `toggle-row${disabled ? " disabled" : ""}`;
    const toggle = document.createElement("ha-switch");
    toggle.checked = checked;
    toggle.disabled = disabled;
    toggle.addEventListener("change", event =>
      this.updateConfig({ [property]: event.target.checked })
    );
    const text = document.createElement("span");
    text.textContent = label;
    row.append(toggle, text, this.createInfo(help));
    return row;
  }

  createHeading(text, help) {
    const heading = document.createElement("h3");
    heading.append(text, this.createInfo(help));
    return heading;
  }

  createLabel(text, help) {
    const label = document.createElement("div");
    label.className = "field-label";
    label.append(text, this.createInfo(help));
    return label;
  }

  createInfo(help) {
    const info = document.createElement("span");
    info.className = "info-icon";
    info.textContent = "i";
    info.title = help || "";
    info.setAttribute("role", "img");
    info.setAttribute("aria-label", help || "More information");
    info.tabIndex = 0;
    return info;
  }

  getNested(path) {
    return path
      .split(".")
      .reduce((value, key) => value && value[key], this._config);
  }

  setNested(path, value) {
    const keys = path.split(".");
    const config = { ...this._config };
    let target = config;
    let source = this._config;
    keys.slice(0, -1).forEach(key => {
      target[key] = { ...((source && source[key]) || {}) };
      target = target[key];
      source = source && source[key];
    });
    target[keys[keys.length - 1]] = value;
    this._config = config;
  }

  emit() {
    const config = clone(this._config);
    this._lastEmittedConfig = JSON.stringify(config);
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config }
      })
    );
    Object.keys(this._previewState).forEach(target => {
      const state = this._previewState[target];
      if (state.hovered || state.pinned) {
        this.setPreview(target, true);
      }
    });
  }

  createSection(className) {
    const section = document.createElement("section");
    if (className) section.className = className;
    return section;
  }

  createDetails(title, help) {
    const details = document.createElement("details");
    details.open = this._openSections.has(title);
    const summary = document.createElement("summary");
    const chevron = document.createElement("ha-icon");
    chevron.className = "section-chevron";
    chevron.icon = details.open ? "mdi:chevron-up" : "mdi:chevron-down";
    details.addEventListener("toggle", () => {
      if (details.open) this._openSections.add(title);
      else this._openSections.delete(title);
      chevron.icon = details.open ? "mdi:chevron-up" : "mdi:chevron-down";
    });
    summary.append(title, this.createInfo(help), chevron);
    details.appendChild(summary);
    return details;
  }

  createStyles() {
    const style = document.createElement("style");
    style.textContent = `
      :host { display: block; }
      section { border-top: 1px solid var(--divider-color); margin-top: 20px; padding-top: 8px; }
      h3 { align-items: center; display: flex; font-size: 16px; font-weight: 500; gap: 7px; margin: 12px 0; }
      .standalone-field { display: block; margin-bottom: 16px; }
      .field-label { align-items: center; display: flex; font-size: 14px; font-weight: 500; gap: 7px; margin: 8px 0; }
      .radio-group { display: flex; flex-wrap: wrap; gap: 8px 24px; }
      .radio-row { align-items: center; cursor: pointer; display: flex; gap: 8px; min-height: 40px; }
      .radio-row input { accent-color: var(--primary-color); height: 18px; width: 18px; }
      .switch-grid { display: grid; gap: 0 20px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .toggle-row { align-items: center; cursor: pointer; display: flex; gap: 12px; min-height: 48px; }
      .toggle-row.disabled { color: var(--disabled-text-color); cursor: default; }
      .toggle-row .info-icon { margin-left: auto; }
      .info-icon { align-items: center; border: 1px solid var(--secondary-text-color); border-radius: 50%; color: var(--secondary-text-color); cursor: help; display: inline-flex; flex: 0 0 auto; font-family: serif; font-size: 11px; font-weight: 700; height: 16px; justify-content: center; line-height: 16px; width: 16px; }
      .template-button { align-items: center; background: transparent; border: 0; color: var(--primary-color); cursor: pointer; display: inline-flex; margin-left: auto; padding: 4px; }
      .template-button:disabled { color: var(--disabled-text-color); cursor: not-allowed; }
      .template-button ha-icon { --mdc-icon-size: 20px; }
      .preview-button { align-items: center; background: transparent; border: 0; border-radius: 50%; color: var(--secondary-text-color); cursor: pointer; display: inline-flex; margin-left: auto; padding: 7px; }
      .preview-button + .template-button { margin-left: 0; }
      .preview-button:hover, .preview-button.active { background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.12); color: var(--primary-color); }
      .preview-button ha-icon { --mdc-icon-size: 22px; }
      .text-input { background: transparent; border: 1px solid var(--input-idle-line-color, var(--divider-color)); border-radius: 4px; box-sizing: border-box; color: var(--primary-text-color); font: inherit; min-height: 44px; outline: none; padding: 0 12px; width: 100%; }
      .text-input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 1px var(--primary-color); }
      ha-yaml-editor { display: block; min-height: 100px; width: 100%; }
      .contents-section { border-top: 0; }
      details { border-top: 1px solid var(--divider-color); margin-top: 20px; padding-top: 4px; }
      details > summary { align-items: center; cursor: pointer; display: flex; font-size: 16px; font-weight: 500; gap: 7px; list-style: none; padding: 12px 0; }
      details > summary::-webkit-details-marker { display: none; }
      .section-chevron { margin-left: auto; --mdc-icon-size: 22px; }
      details .css-section { border-top: 0; margin-top: 0; }
      .description { color: var(--secondary-text-color); font-size: 13px; }
      @media (max-width: 450px) {
        .switch-grid { grid-template-columns: 1fr; }
        .radio-group { display: grid; grid-template-columns: 1fr; }
      }
    `;
    return style;
  }
}

if (!customElements.get("group-element-editor")) {
  customElements.define("group-element-editor", GroupElementEditor);
}
