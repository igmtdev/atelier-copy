/*! Copyright (c) Safe As Milk. All rights reserved. */
import { formatMoney } from "utils";

class VariantSelects extends HTMLElement {
    #addToCartText;
    connectedCallback() {
        this.productAvailable = this.getVariantData().some((variant => variant.available));
        this.uniqueId = this.dataset.card || this.dataset.section;
        this.#addToCartText = this.dataset.addToCartText || window.theme.localize("ADD_TO_CART");
        this.addEventListener("change", this.onVariantChange);
    }
    disconnectedCallback() {
        this.removeEventListener("change", this.onVariantChange);
    }
    onVariantChange() {
        this.updateOptions();
        this.updateMasterId();
        this.updatePickupAvailability();
        this.removeErrorMessage();
        if (!this.currentVariant) {
            this.toggleAddButton(true, "");
            this.setUnavailable();
        } else {
            this.updateURL();
            this.updateVariantInput();
            this.renderProductInfo();
            this.updateLabelsBlock();
        }
        this.dispatchEvent(new CustomEvent("on:variant:change", {
            detail: {
                variant: this.currentVariant
            }
        }));
    }
    updateOptions() {
        this.options = Array.from(this.querySelectorAll("select"), (select => select.value));
    }
    updateMasterId() {
        this.currentVariant = this.getVariantData().find((variant => !variant.options.map(((option, index) => this.options[index] === option)).includes(false)));
    }
    updateURL() {
        if (!this.currentVariant || this.dataset.updateUrl === "false") return;
        window.history.replaceState({}, "", `${this.dataset.url}?variant=${this.currentVariant.id}`);
    }
    updateVariantInput() {
        const productForms = document.querySelectorAll(`#product-form-${this.uniqueId}, #product-form-installment-${this.uniqueId}`);
        productForms.forEach((productForm => {
            const input = productForm.querySelector('input[name="id"]');
            input.value = this.currentVariant.id;
            input.dispatchEvent(new Event("change", {
                bubbles: true
            }));
        }));
        const productSingle = this.closest("product-single");
        if (productSingle) {
            productSingle.variant = this.currentVariant;
        }
    }
    updatePickupAvailability() {
        const pickupAvailability = document.querySelector(`pickup-availability`);
        if (!pickupAvailability) return;
        pickupAvailability.fetchAvailability(this.currentVariant.id);
    }
    removeErrorMessage() {
        const section = this.closest("section");
        if (!section) return;
        section.querySelector(".qty-error")?.remove();
    }
    renderProductInfo() {
        const priceContainer = document.getElementById(`price-${this.uniqueId}`);
        if (priceContainer) {
            const variantPrice = `\n        <span class="u-hidden-visually">${window.theme.localize("REGULAR_PRICE")}</span>\n          <span class="price__number ${this.currentVariant.compare_at_price > this.currentVariant.price ? "price__number--sale" : ""}">\n          <span class="money">${formatMoney(this.currentVariant.price, window.theme.money_product_price_format)}\n          </span>\n        </span>\n        ${this.currentVariant.compare_at_price > this.currentVariant.price ? `\n          <span class="u-hidden-visually">${window.theme.localize("SALE_PRICE")}</span>\n          <s class="price__compare">\n            <span class="money">${formatMoney(this.currentVariant.compare_at_price, window.theme.money_format)}\n            </span>\n          </s>\n        ` : ""}\n      `;
            priceContainer.innerHTML = variantPrice;
        }
        const unitPriceContainer = document.getElementById(`unit-price-${this.uniqueId}`);
        if (unitPriceContainer) {
            const unitPrice = this.currentVariant.unit_price ? `\n        <span class="u-hidden-visually">${window.theme.localize("UNIT_PRICE_LABEL")}</span>\n        <span class="money">${formatMoney(this.currentVariant.unit_price, window.theme.money_format)}</span>\n        <span aria-hidden="true">/</span>\n        <span class="u-hidden-visually">${window.theme.localize("UNIT_PRICE_SEPARATOR")}&nbsp;</span>\n        <span>\n          ${this.productAvailable && this.currentVariant.unit_price_measurement ? `\n            ${this.currentVariant.unit_price_measurement.reference_value !== 1 ? this.currentVariant.unit_price_measurement.reference_value : ""}\n            ${this.currentVariant.unit_price_measurement.reference_unit}\n          ` : ""}\n        </span>\n      ` : "";
            unitPriceContainer.innerHTML = unitPrice;
        }
        const labelContainer = document.getElementById(`label-${this.uniqueId}`);
        if (labelContainer) {
            if (this.currentVariant.compare_at_price > this.currentVariant.price) {
                const labelType = labelContainer.dataset.type;
                let text;
                switch (labelType) {
                  case "currency":
                    {
                        const discountInCurrency = formatMoney(Math.round(this.currentVariant.compare_at_price - this.currentVariant.price), window.theme.money_format);
                        text = window.theme.localize("DISCOUNT_CURRENCY", discountInCurrency);
                        break;
                    }

                  case "percentage":
                    {
                        const discountInPercentage = Math.round((this.currentVariant.compare_at_price - this.currentVariant.price) * 100 / this.currentVariant.compare_at_price);
                        text = window.theme.localize("DISCOUNT_PERCENTAGE", discountInPercentage);
                        break;
                    }

                  case "text":
                  default:
                    text = window.theme.localize("DISCOUNT_TEXT");
                }
                const label = `\n          <div class="label">\n            <div class="label__text">${text}</div>\n          </div>\n        `;
                labelContainer.innerHTML = label;
            } else {
                labelContainer.innerHTML = "";
            }
        }
        const inventoryNoticeContainer = document.getElementById(`inventory-notice-${this.uniqueId}`);
        if (inventoryNoticeContainer) {
            const inventoryNoticeWrapperContainer = inventoryNoticeContainer.querySelector(".stock-note");
            const inventoryNoticeTextContainer = inventoryNoticeContainer.querySelector(".stock-note__text");
            const inventoryShowQty = inventoryNoticeContainer.dataset.showQty;
            const inventoryLimit = Number(inventoryNoticeContainer.dataset.inventoryLimit);
            const currentVariantQuantity = Number(document.getElementById(`quantity-${this.uniqueId}-${this.currentVariant.id}`).dataset.qty);
            const soldClass = "stock-note--sold";
            const inStockClass = "stock-note--in-stock";
            const lowStockClass = "stock-note--low";
            const continueSelling = this.currentVariant.available && currentVariantQuantity <= 0;
            const shopifyManaged = this.currentVariant.inventory_management === "shopify";
            if (!this.currentVariant.available) {
                inventoryNoticeWrapperContainer.classList.remove(inStockClass, lowStockClass);
                inventoryNoticeWrapperContainer.classList.add(soldClass);
                inventoryNoticeTextContainer.innerHTML = window.theme.localize("QTY_NOTICE_SOLD_OUT");
            } else if (shopifyManaged && inventoryShowQty === "true") {
                inventoryNoticeWrapperContainer.classList.remove(soldClass, lowStockClass);
                inventoryNoticeWrapperContainer.classList.add(inStockClass);
                if (!continueSelling && currentVariantQuantity > 0) {
                    if (currentVariantQuantity <= inventoryLimit) {
                        inventoryNoticeWrapperContainer.classList.add(lowStockClass);
                        inventoryNoticeTextContainer.innerHTML = window.theme.localize("QTY_NOTICE_NUMBER_LOW_STOCK_HTML", currentVariantQuantity);
                    } else {
                        inventoryNoticeTextContainer.innerHTML = window.theme.localize("QTY_NOTICE_NUMBER_IN_STOCK_HTML", currentVariantQuantity);
                    }
                } else if (continueSelling) {
                    inventoryNoticeTextContainer.innerHTML = window.theme.localize("QTY_NOTICE_CONTINUE_SELLING");
                } else {
                    inventoryNoticeTextContainer.innerHTML = window.theme.localize("QTY_NOTICE_IN_STOCK");
                }
            } else if (shopifyManaged && inventoryShowQty === "false") {
                inventoryNoticeWrapperContainer.classList.remove(soldClass, lowStockClass);
                inventoryNoticeWrapperContainer.classList.add(inStockClass);
                if (!continueSelling && currentVariantQuantity > 0) {
                    if (currentVariantQuantity <= inventoryLimit) {
                        inventoryNoticeWrapperContainer.classList.add(lowStockClass);
                        inventoryNoticeTextContainer.innerHTML = window.theme.localize("QTY_NOTICE_LOW_STOCK");
                    } else {
                        inventoryNoticeTextContainer.innerHTML = window.theme.localize("QTY_NOTICE_IN_STOCK");
                    }
                } else if (continueSelling) {
                    inventoryNoticeTextContainer.innerHTML = window.theme.localize("QTY_NOTICE_CONTINUE_SELLING");
                } else {
                    inventoryNoticeTextContainer.innerHTML = window.theme.localize("QTY_NOTICE_IN_STOCK");
                }
            } else {
                inventoryNoticeWrapperContainer.classList.remove(soldClass, lowStockClass);
                inventoryNoticeWrapperContainer.classList.add(inStockClass);
                inventoryNoticeTextContainer.innerHTML = window.theme.localize("QTY_NOTICE_IN_STOCK");
            }
        }
        const skuContainer = document.getElementById(`sku-${this.uniqueId}`);
        if (skuContainer) {
            const sku = this.currentVariant.sku ? `\n        <div class="product-form__swatch__title u-small">${skuContainer.dataset.skuLabel ? `${skuContainer.dataset.skuLabel}&nbsp;` : ""}<span class="product-form__swatch__sub-title">${this.currentVariant.sku}</span></div>\n      ` : "";
            skuContainer.innerHTML = sku;
        }
        this.toggleAddButton(!this.currentVariant.available, window.theme.localize("SOLD_OUT"));
    }
    updateLabelsBlock() {
        const soldOutLabel = document.getElementById(`label-${this.uniqueId}-sold_out`);
        const discountLabel = document.getElementById(`label-${this.uniqueId}-discount`);
        const newLabel = document.getElementById(`label-${this.uniqueId}-new`);
        const customLabel1 = document.getElementById(`label-${this.uniqueId}-custom_1`);
        const customLabel2 = document.getElementById(`label-${this.uniqueId}-custom_2`);
        if (soldOutLabel) {
            if (!this.currentVariant.available) {
                soldOutLabel.removeAttribute("hidden");
            } else {
                soldOutLabel.setAttribute("hidden", "");
            }
        }
        if (discountLabel) {
            if (this.currentVariant.compare_at_price > this.currentVariant.price) {
                const textElement = discountLabel.querySelector(".label__text");
                let text = "";
                const discountType = discountLabel.dataset.type;
                const hideIfSoldOut = discountLabel.dataset.hide === "true" && !this.currentVariant.available;
                switch (discountType) {
                  case "currency":
                    text = window.theme.localize("DISCOUNT_CURRENCY", formatMoney(Math.round(this.currentVariant.compare_at_price - this.currentVariant.price), window.theme.money_format));
                    break;

                  case "percentage":
                    text = window.theme.localize("DISCOUNT_PERCENTAGE", Math.round((this.currentVariant.compare_at_price - this.currentVariant.price) * 100 / this.currentVariant.compare_at_price));
                    break;

                  case "text":
                  default:
                    text = window.theme.localize("DISCOUNT_TEXT");
                }
                if (text && !hideIfSoldOut) {
                    textElement.textContent = text;
                    discountLabel.removeAttribute("hidden");
                } else {
                    discountLabel.setAttribute("hidden", "");
                }
            } else {
                discountLabel.setAttribute("hidden", "");
            }
        }
        [ newLabel, customLabel1, customLabel2 ].forEach((label => {
            if (label && label.dataset.hide === "true" && !this.currentVariant.available) {
                label.setAttribute("hidden", "");
            } else if (label) {
                label.removeAttribute("hidden");
            }
        }));
    }
    toggleAddButton(disable = true, text = "") {
        const productForm = document.getElementById(`product-form-${this.uniqueId}`);
        if (!productForm) return;
        const buttonsContainer = productForm.querySelector(".js-product-buttons");
        const addButton = productForm.querySelector('[name="add"]');
        const addButtonText = productForm.querySelector('[name="add"] staged-action-text');
        if (!addButton) return;
        if (disable) {
            addButton.setAttribute("disabled", "disabled");
            if (text) addButtonText.textContent = text;
            buttonsContainer.classList.add("is-disabled");
        } else {
            addButton.removeAttribute("disabled");
            addButtonText.textContent = this.#addToCartText;
            buttonsContainer.classList.remove("is-disabled");
        }
    }
    setUnavailable() {
        const productForm = document.getElementById(`product-form-${this.uniqueId}`);
        const addButton = productForm.querySelector('[name="add"]');
        const addButtonText = productForm.querySelector('[name="add"] > span');
        const price = document.getElementById(`price-${this.uniqueId}`);
        if (!addButton) return;
        addButtonText.textContent = window.theme.localize("UNAVAILABLE");
        if (price) price.classList.add("visibility-hidden");
    }
    getVariantData() {
        this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
        return this.variantData;
    }
}

customElements.define("variant-selects", VariantSelects);

class VariantRadios extends VariantSelects {
    updateOptions() {
        const fieldsets = Array.from(this.querySelectorAll("fieldset"));
        this.options = fieldsets.map((fieldset => Array.from(fieldset.querySelectorAll("input")).find((radio => radio.checked)).value));
    }
}

customElements.define("variant-radios", VariantRadios);

class VariantSwatches extends HTMLElement {
    connectedCallback() {
        this.currentSelection = this.querySelector("input:checked").value;
        const form = document.getElementById(this.dataset.formId);
        if (form) {
            form.addEventListener("change", (() => {
                this.updateLabel();
            }));
        } else {
            this.addEventListener("change", (() => {
                this.updateLabel();
            }));
        }
    }
    updateLabel() {
        const currentSelection = this.querySelector("input:checked").value;
        if (currentSelection !== this.currentSelection) {
            const labelOptionElement = this.querySelector(".js-option-title");
            labelOptionElement.innerHTML = currentSelection;
            this.currentSelection = currentSelection;
        }
    }
}

customElements.define("variant-swatches", VariantSwatches);

class VariantMixedInputs extends VariantSelects {
    updateOptions() {
        this.options = Array.from(this.querySelectorAll("input:checked, select"), (element => element.value));
    }
}

customElements.define("variant-mixed-inputs", VariantMixedInputs);
//# sourceMappingURL=variant-select-components.js.map
