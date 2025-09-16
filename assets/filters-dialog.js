/*! Copyright (c) Safe As Milk. All rights reserved. */
import ModalDialog from "modal-dialog";

class FiltersDialog extends ModalDialog {
    #boundHandleMediaQueryChange;
    #initiated;
    constructor() {
        super();
        this.#boundHandleMediaQueryChange = this.#handleMediaQueryChange.bind(this);
    }
    connectedCallback() {
        this.disableOnDesktop = this.hasAttribute("data-disable-modal-on-desktop");
        if (this.disableOnDesktop) {
            this.mediaQuery = window.matchMedia("(max-width: 980px)");
            this.#initiated = false;
            if (this.mediaQuery.matches) {
                this.init();
            }
            this.mediaQuery.addEventListener("change", this.#boundHandleMediaQueryChange);
        } else {
            this.init();
        }
    }
    disconnectedCallback() {
        if (this.#initiated) {
            this.destroy();
        }
        if (this.disableOnDesktop) {
            this.mediaQuery.removeEventListener("change", this.#boundHandleMediaQueryChange);
        }
    }
    init() {
        this.querySelector("aside").setAttribute("role", "document");
        this.setAttribute("aria-hidden", "true");
        this.classList.add("modal", "modal--filters");
        this.#initiated = true;
        super.init();
    }
    destroy() {
        this.querySelector("aside").removeAttribute("role");
        this.removeAttribute("aria-hidden");
        this.classList.remove("modal", "modal--filters");
        this.#initiated = false;
        super.destroy();
    }
    async #handleMediaQueryChange(e) {
        if (e.matches && !this.#initiated) {
            this.init();
        } else if (this.#initiated) {
            await this.close();
            this.destroy();
        }
    }
}

customElements.define("filters-dialog", FiltersDialog);
//# sourceMappingURL=filters-dialog.js.map
