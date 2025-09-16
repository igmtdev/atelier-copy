/*! Copyright (c) Safe As Milk. All rights reserved. */
class LazyVideoSwitcher extends HTMLElement {
    constructor() {
        super();
        this.mediaQuery = window.matchMedia("(min-width: 767px)");
        this.isScreenDesktop = this.mediaQuery.matches;
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    }
    connectedCallback() {
        this.videos = Array.from(this.children).filter((child => child.tagName === "LAZY-VIDEO" && child.dataset.screenSize));
        if (!this.videos.length) return;
        this.#updateVisibility();
        this.mediaQuery.addEventListener("change", this.handleVisibilityChange);
    }
    disconnectedCallback() {
        this.mediaQuery.removeEventListener("change", this.handleVisibilityChange);
    }
    handleVisibilityChange() {
        const newIsDesktop = this.mediaQuery.matches;
        if (newIsDesktop !== this.isScreenDesktop) {
            this.isScreenDesktop = newIsDesktop;
            this.#updateVisibility();
        }
    }
    #updateVisibility() {
        this.videos.forEach((video => {
            const isVisible = video.dataset.screenSize === (this.isScreenDesktop ? "desktop" : "mobile");
            video.toggleAttribute("hidden", !isVisible);
        }));
    }
}

customElements.define("lazy-video-switcher", LazyVideoSwitcher);
//# sourceMappingURL=lazy-video-switcher.js.map
