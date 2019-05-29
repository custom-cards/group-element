(function(){"use strict";(function(a,b){"object"==typeof exports&&"undefined"!=typeof module?b():"function"==typeof define&&define.amd?define(b):b()})(this,function(){function a(b){if(!b||"object"!=typeof b)return b;if("[object Date]"==Object.prototype.toString.call(b))return new Date(b.getTime());if(Array.isArray(b))return b.map(a);var c={};return Object.keys(b).forEach(function(d){c[d]=a(b[d])}),c}function b(a){return a.style.display="None",window.setTimeout(()=>{a.style.display=""},f)}function c(a,b){const c=g(a,b);return"HUI-CONDITIONAL-ELEMENT"!==c.tagName&&c.classList.add("element"),a.style&&Object.keys(a.style).forEach(b=>{c.style.setProperty(b,a.style[b])}),c}const d=(a,b,c)=>{c=null===c||void 0===c?{}:c;const d=new Event(b,{bubbles:!0,cancelable:!1,composed:!0});return d.detail=c,a.dispatchEvent(d),d},e="custom:",f=2e3,g=(a,c)=>{if(!a||"object"!=typeof a||!a.type)return i("No element type configured.",a);if(a.type.startsWith(e)){const f=a.type.substr(e.length);if(customElements.get(f))return h(f,a);const g=i("Custom element doesn't exist: ".concat(f,"."),a),j=b(g);return customElements.whenDefined(f).then(()=>{clearTimeout(j),c&&d(c,"ll-rebuild")}),g}return h("hui-".concat(a.type,"-element"),a)},h=(b,c)=>{const d=document.createElement(b);try{d.setConfig(a(c))}catch(a){return i(a.message,c)}return d},i=(a,b)=>{const c=document.createElement("hui-error-card");return c.setConfig({type:"error",error:a,config:b}),c};customElements.define("group-element",class extends HTMLElement{constructor(){super(),this._hass={},this._config={},this._elements=[],this._toggleAreaElements=[],this._visible=!0,this._toggleTap=!1,this._noToggleHide=!1,this._container=void 0,this.fullyHideOtherGroupsOnShow=void 0,this.addEventListener("click",a=>a.target!==this&&0===this._toggleAreaElements.length?void a.stopPropagation():void this.toggleVisibility(!0,void 0!==this.fullyHideOtherGroupsOnShow&&this.fullyHideOtherGroupsOnShow))}setConfig(a){if(!a.elements||!Array.isArray(a.elements))throw new Error("Error in card configuration.");if(0<this._elements.length&&(this._elements.map(a=>{a.parentElement&&a.parentElement.removeChild(a)}),this._elements=[]),0<this._toggleAreaElements.length&&(this._toggleAreaElements.map(a=>{a.parentElement&&a.parentElement.removeChild(a)}),this._toggleAreaElements=[]),this._config=a,this.style.transform="none",void 0!==a.visible&&(this._visible=a.visible),void 0!==a.toggle_tap&&(this._toggleTap=a.toggle_tap),void 0!==a.no_toggle_hide&&(this._noToggleHide=a.no_toggle_hide),void 0!==a.grouping_code&&(this.attributes.groupingCode=a.grouping_code),void 0!==a.fully_hide_other_groups_on_show&&(this.fullyHideOtherGroupsOnShow=a.fully_hide_other_groups_on_show),a.visible_style){var b="";Object.keys(a.visible_style).forEach(c=>{b+=c+": "+a.visible_style[c]+" !important;\n"});const c=document.createElement("style");c.innerHTML="\n          .visibleOn {\n           "+b+"\n          }\n        ",this.appendChild(c)}this.updateElements()}set hass(a){this._hass=a,this.updateElements()}connectedCallback(){this.updateElements()}disconnectedCallback(){this.removeAllElements()}updateElements(){if(!this._hass||!this._config||!this.parentElement)return;0===this._elements.length&&(this._config.elements.map(a=>{const b=c(a,this.parentElement);this._elements.push(b)}),this._config.elements_pos!==void 0&&(this._container=this.createElementsContainer(this._config.elements_pos)),this._config.close_button!==void 0&&this._config.close_button.show&&this._elements.push(this.createCloseButton(this._config.close_button))),this._config.toggle_area_elements&&0===this._toggleAreaElements.length&&this._config.toggle_area_elements.map(a=>{const b=c(a,this.parentElement);this._toggleAreaElements.push(b)});const a=this._container?this._container:this;a!==this&&(this._visible?!this._container.parentElement&&this.parentElement.appendChild(this._container):this._container.parentElement&&this._container.parentElement.removeChild(this._container)),this._elements.map(b=>{this._visible?(b.hass=this._hass,!b.parentElement&&a.appendChild(b)):b.parentElement&&b.parentElement.removeChild(b)}),this._toggleAreaElements.map(a=>{a.parentElement||(a.hass=this._hass,this.appendChild(a))}),this.setVisibilityStyle(this._visible)}removeAllElements(){this._container&&(this._container.parentElement&&this._container.parentElement.removeChild(this._container),this._container=void 0),this._elements.map(a=>{a.parentElement&&a.parentElement.removeChild(a)}),this._elements=[],this._toggleAreaElements.map(a=>{a.parentElement&&a.parentElement.removeChild(a)}),this._toggleAreaElements=[]}toggleVisibility(a,b){!this._toggleTap||a&&this._noToggleHide&&this._visible||(this._visible=!this._visible,this.updateElements(),this._visible&&this.attributes.groupingCode?this.parentElement.querySelectorAll("group-element").forEach(a=>{a!==this&&a.attributes.groupingCode!==void 0&&a.attributes.groupingCode===this.attributes.groupingCode&&(a._visible&&a.toggleVisibility(),b!==void 0&&(a.style.display=b?"none":"block"))}):b!==void 0&&this.parentElement.querySelectorAll("group-element").forEach(a=>{a.style.display=b?"none":"block"}))}createElementsContainer(a){const b=document.createElement("div");return b.className="element",Object.keys(a).forEach(c=>{b.style.setProperty(c,a[c])}),b}createCloseButton(a){const b=document.createElement("ha-icon");return b.group=this,b.icon=void 0===a.icon?"hass:close":a.icon,b.className="element",a.style&&Object.keys(a.style).forEach(c=>{b.style.setProperty(c,a.style[c])}),b.addEventListener("click",a=>a.target===b?void(b.group&&b.group.toggleVisibility(!1,!1)):void a.stopPropagation()),b}setVisibilityStyle(a){this._config.visible_style&&(a?this.classList.add("visibleOn"):this.classList.remove("visibleOn"))}})})})();
