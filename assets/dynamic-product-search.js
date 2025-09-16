/*! Copyright (c) Safe As Milk. All rights reserved. */
import Animations from "animations";

class DynamicProductSearch extends HTMLElement {
    #boundLinksHandler;
    #boundLinksHandlerWithScroll;
    #boundPopStateHandler;
    constructor() {
        super();
        this.#boundLinksHandler = this.#linksHandler.bind(this);
        this.#boundLinksHandlerWithScroll = this.#linksHandlerWithScroll.bind(this);
        this.#boundPopStateHandler = this.#popStateListener.bind(this);
    }
    connectedCallback() {
        this.abortController = null;
        this.listeners = [];
        this.section = this.closest(".section");
        this.updateLoading();
        this.#setUpListeners();
        window.addEventListener("popstate", this.#boundPopStateHandler);
    }
    disconnectedCallback() {
        this.#removeListeners();
        window.removeEventListener("popstate", this.#boundPopStateHandler);
    }
    renderError(e = window.theme.localize("ERROR_PRODUCTS")) {
        if (this.previousElementSibling && this.previousElementSibling.classList.contains("error")) {
            this.previousElementSibling.remove();
        }
        const error = document.createElement("div");
        error.classList.add("error");
        error.innerHTML = e;
        this.section.prepend(error);
    }
    renderCollection(params) {
        const {query: query, updateURL: updateURL, scrollUp: scrollUp} = {
            query: "",
            updateURL: true,
            scrollUp: false,
            ...params
        };
        const currentFocusElementId = document.activeElement && document.activeElement.getAttribute("id");
        const sectionClass = `.section--${this.dataset.section}`;
        this.abortController = new AbortController;
        this.updateLoading(true);
        fetch(`${this.dataset.url}?${query}&section_id=${this.dataset.section}`, {
            signal: this.abortController.signal
        }).then((response => {
            if (response.ok) return response.text();
            throw new Error(window.theme.localize("ERROR_PRODUCTS"));
        })).then((responseText => {
            this.dispatchEvent(new CustomEvent("on:dynamic-product-search:loading"));
            let sidebarContentOffset = 0;
            const predictiveSearch = this.querySelector("predictive-search");
            if (predictiveSearch) predictiveSearch.close();
            const openFiltersModal = this.querySelector('.modal--filters:not([aria-hidden="true"])');
            if (openFiltersModal) {
                const content = openFiltersModal.querySelector(".collection-sidebar__wrapper");
                if (content) {
                    sidebarContentOffset = content.scrollTop;
                }
            }
            const html = (new DOMParser).parseFromString(responseText, "text/html");
            const destination = document.querySelector(sectionClass);
            const source = html.querySelector(sectionClass);
            if (source && destination) {
                this.#removeListeners();
                const destinationMainContainer = destination.querySelector(".js-main-content");
                const sourceMainContainer = source.querySelector(".js-main-content");
                if (destinationMainContainer.children.length > 0 && sourceMainContainer.children.length > 0) {
                    const destinationResultsTotal = destination.querySelector(`.js-results-total`);
                    const destinationSortForm = destination.querySelector(`.js-sort-form`);
                    const destinationActiveFilters = destination.querySelector(`.js-active-filters`);
                    const destinationFilters = destination.querySelector(`.js-filters`);
                    const destinationActions = destination.querySelector(`.js-actions`);
                    const destinationResultsContainer = destination.querySelector(`.js-results-container`);
                    const destinationResults = destination.querySelector(`.js-results`);
                    const destinationPagination = destination.querySelector(`.js-pagination`);
                    const sourceResultsTotal = source.querySelector(`.js-results-total`);
                    const sourceSortForm = source.querySelector(`.js-sort-form`);
                    const sourceActiveFilters = source.querySelector(`.js-active-filters`);
                    const sourceFilters = source.querySelector(`.js-filters`);
                    const sourceActions = source.querySelector(`.js-actions`);
                    const sourceResultsContainer = source.querySelector(`.js-results-container`);
                    const sourceResults = source.querySelector(`.js-results`);
                    const sourcePagination = source.querySelector(`.js-pagination`);
                    if (destinationResultsTotal && sourceResultsTotal) {
                        destinationResultsTotal.innerHTML = sourceResultsTotal.innerHTML;
                    }
                    if (destinationResultsContainer && sourceResultsContainer) {
                        if (destinationSortForm && sourceSortForm) destinationSortForm.innerHTML = sourceSortForm.innerHTML;
                        if (destinationActiveFilters && sourceActiveFilters) destinationActiveFilters.innerHTML = sourceActiveFilters.innerHTML;
                        if (destinationFilters && sourceFilters) destinationFilters.innerHTML = sourceFilters.innerHTML;
                        if (destinationActions && sourceActions) destinationActions.innerHTML = sourceActions.innerHTML;
                        if (destinationResults && sourceResults) destinationResults.innerHTML = sourceResults.innerHTML;
                    } else if (destinationResultsContainer) {
                        destinationResultsContainer.remove();
                    } else {
                        destinationMainContainer.appendChild(sourceResultsContainer);
                    }
                    if (destinationPagination && sourcePagination) {
                        destinationPagination.innerHTML = sourcePagination.innerHTML;
                    } else if (destinationPagination) {
                        destinationPagination.remove();
                    } else if (sourcePagination) {
                        destination.querySelector(".js-main-content").appendChild(sourcePagination);
                    }
                } else {
                    const destinationSectionTitle = destination.querySelector(".js-section-title");
                    const sourceSectionTitle = source.querySelector(".js-section-title");
                    if (destinationSectionTitle && sourceSectionTitle) destinationSectionTitle.innerHTML = sourceSectionTitle.innerHTML;
                    if (destinationMainContainer && sourceMainContainer) destinationMainContainer.innerHTML = sourceMainContainer.innerHTML;
                }
                this.#setUpListeners();
            }
            Animations.setup(document.querySelector(sectionClass));
            if (openFiltersModal) {
                const content = openFiltersModal.querySelector(".collection-sidebar__wrapper");
                if (content && sidebarContentOffset !== 0) {
                    content.scrollTop = sidebarContentOffset;
                }
            }
            if (scrollUp) this.scrollUp();
            const newPageTitle = document.querySelector(`${sectionClass} dynamic-product-search`).dataset.pageTitle;
            if (updateURL) this.updateURL(query, newPageTitle);
            document.title = newPageTitle;
            this.updateLoading(false);
            if (this.dataset.quickShopDynamicCheckout === "true" && window.Shopify && window.Shopify.PaymentButton) window.Shopify.PaymentButton.init();
            const currentlyFocusedElement = document.getElementById(currentFocusElementId);
            if (currentlyFocusedElement) {
                currentlyFocusedElement.focus();
            }
            this.dispatchEvent(new CustomEvent("on:dynamic-product-search:loaded"));
        })).catch((async error => {
            if (error.name && error.name === "AbortError") return;
            this.updateLoading(false);
            this.renderError(error);
            const openFiltersModal = this.querySelector('.modal--filters:not([aria-hidden="true"])');
            if (openFiltersModal) await openFiltersModal.close();
            this.scrollUp();
            this.dispatchEvent(new CustomEvent("on:dynamic-product-search:failed"));
        }));
    }
    scrollUp() {
        const {top: top} = this.section.getBoundingClientRect();
        window.scrollBy({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
            top: top
        });
    }
    updateLoading(isLoading = false) {
        this.loading = isLoading;
        if (isLoading) {
            this.section.classList.add("is-loading");
        } else {
            this.section.classList.remove("is-loading");
        }
    }
    updateURL(query, title = "") {
        if (this.dataset.updateUrl === "false") return;
        window.history.pushState({}, title, `${this.dataset.url}${query ? `?${query}` : ""}`);
    }
    #popStateListener() {
        const query = window.location.search.slice(1);
        this.renderCollection({
            updateURL: false,
            query: query
        });
    }
    #linksHandler(e, scrollUp = false) {
        e.preventDefault();
        if (!e.target.getAttribute("href") && !e.target.dataset.url) return;
        const url = e.target.getAttribute("href") || e.target.dataset.url;
        const query = url.split("?").length > 0 ? url.split("?")[1] : "";
        this.renderCollection({
            query: query,
            scrollUp: scrollUp
        });
    }
    #linksHandlerWithScroll(e) {
        this.#linksHandler(e, true);
    }
    #filtersControl() {
        const filters = this.querySelectorAll(".js-filter-trigger");
        filters.forEach((filter => {
            filter.addEventListener("click", this.#boundLinksHandler);
            this.listeners.push({
                element: filter,
                event: "click",
                handler: this.#boundLinksHandler
            });
        }));
    }
    #paginationControl() {
        const paginationLinks = this.querySelectorAll(".pagination a");
        paginationLinks.forEach((paginationLink => {
            paginationLink.addEventListener("click", this.#boundLinksHandlerWithScroll);
            this.listeners.push({
                element: paginationLink,
                event: "click",
                handler: this.#boundLinksHandlerWithScroll
            });
        }));
    }
    #setUpListeners() {
        this.forms = [ this.querySelector(".js-search-form"), this.querySelector(".js-sort-form"), this.querySelector(".js-filters-form") ].filter((f => f));
        if (this.querySelector(".js-search-form") && this.querySelector(".js-filters-form")) {
            this.querySelector('.js-filters-form input[name="q"]').remove();
        }
        this.forms.forEach((form => {
            if (form.dataset.submitOnChange === "true") {
                form.addEventListener("change", (() => {
                    form.requestSubmit();
                }));
            }
            form.addEventListener("submit", (e => {
                e.preventDefault();
                if (this.abortController) this.abortController.abort();
                let query = "";
                if (e.target.classList.contains("js-search-form")) {
                    const paramsToKeep = [ "type", "q", "sort_by" ];
                    query = this.forms.reduce(((qs, f) => {
                        const thisFormData = new FormData(f);
                        for (const [paramName] of thisFormData.entries()) {
                            if (!paramsToKeep.includes(paramName)) thisFormData.delete(paramName);
                        }
                        const thisQueryString = new URLSearchParams(thisFormData).toString();
                        return `${qs}${thisQueryString ? `${qs ? "&" : ""}${thisQueryString}` : ""}`;
                    }), "");
                } else {
                    query = this.forms.reduce(((qs, f) => {
                        const thisFormData = new FormData(f);
                        const thisQueryString = new URLSearchParams(thisFormData).toString();
                        return `${qs}${thisQueryString ? `${qs ? "&" : ""}${thisQueryString}` : ""}`;
                    }), "");
                }
                this.renderCollection({
                    query: query
                });
            }));
        }));
        this.#filtersControl();
        this.#paginationControl();
    }
    #removeListeners() {
        this.listeners.forEach((({element: element, event: event, handler: handler}) => {
            element.removeEventListener(event, handler);
        }));
    }
}

customElements.define("dynamic-product-search", DynamicProductSearch);
//# sourceMappingURL=dynamic-product-search.js.map
