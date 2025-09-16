/*! Copyright (c) Safe As Milk. All rights reserved. */
class ProductSingle extends HTMLElement {
    #variant;
    connectedCallback() {
        this.mediaGallery = this.querySelector("media-gallery");
        this.#moveModalsFromStickyScrollContainer();
    }
    updateMedia() {
        if (!this.mediaGallery || !this.#variant.featured_media) return;
        const mediaId = this.#variant.featured_media.id;
        this.mediaGallery.goToSlide(mediaId);
    }
    set variant(variant) {
        this.#variant = variant;
        this.updateMedia();
    }
    get variant() {
        return this.#variant;
    }
    #moveModalsFromStickyScrollContainer() {
        const modals = this.querySelectorAll("sticky-scroll modal-dialog, sticky-scroll popup-dialog");
        modals.forEach((modal => {
            this.append(modal);
        }));
    }
}

customElements.define("product-single", ProductSingle);
//# sourceMappingURL=product-single.js.map
