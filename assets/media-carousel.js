/*! Copyright (c) Safe As Milk. All rights reserved. */
import Swiper, { A11y, Autoplay, EffectFade, Navigation, Pagination, Virtual } from "swiper";

import { BREAKPOINTS } from "utils";

class MediaCarousel extends HTMLElement {
    #boundHandleMediaQueryChange;
    #indexProp;
    #isVirtual;
    #mediaQuery=null;
    #navigationElement;
    #paginationElement;
    #slideElements;
    #sliderElement;
    #swiper=null;
    #wrapperElement;
    static #MEDIA_CAROUSEL_CLASS="swiper";
    static #MEDIA_CAROUSEL_WRAPPER_CLASS="swiper-wrapper";
    static #MEDIA_CAROUSEL_SLIDE_CLASS="swiper-slide";
    constructor() {
        super();
        this.#boundHandleMediaQueryChange = this.#handleMediaQueryChange.bind(this);
    }
    connectedCallback() {
        this.#sliderElement = this.querySelector("media-carousel-slider");
        this.#wrapperElement = this.querySelector("media-carousel-wrapper");
        this.#slideElements = this.querySelectorAll("media-carousel-slide");
        this.#paginationElement = this.querySelector("media-carousel-pagination");
        this.#navigationElement = this.querySelector("media-carousel-navigation");
        this.#indexProp = this.dataset.loop ? "realIndex" : "activeIndex";
        this.#isVirtual = Boolean(this.dataset.virtual && this.querySelector(".js-slides"));
        this.breakpointMin = Object.keys(BREAKPOINTS).includes(this.dataset.breakpointMin) ? BREAKPOINTS[this.dataset.breakpointMin] : Number(this.dataset.breakpointMin || "0");
        this.breakpointMax = Object.keys(BREAKPOINTS).includes(this.dataset.breakpointMax) ? BREAKPOINTS[this.dataset.breakpointMax] : Number(this.dataset.breakpointMax || "0");
        const handleIntersection = (entries, observer) => {
            entries.forEach((entry => {
                if (entry.isIntersecting) {
                    observer.unobserve(this);
                    if (this.breakpointMin || this.breakpointMax) {
                        this.#mediaQuery = window.matchMedia(`(${this.breakpointMin ? `min-width: ${this.breakpointMin}px${this.breakpointMax ? " and " : ""}` : ""}${this.breakpointMax ? `max-width: ${this.breakpointMax - 1}px` : ""})`);
                        if (this.#mediaQuery.matches) {
                            this.#init();
                        }
                        this.#mediaQuery.addEventListener("change", this.#boundHandleMediaQueryChange);
                    } else {
                        this.#init();
                    }
                }
            }));
        };
        new IntersectionObserver(handleIntersection.bind(this)).observe(this);
    }
    disconnectedCallback() {
        if (this.#swiper) {
            this.#swiper.destroy();
            this.#swiper = null;
        }
        if (this.#mediaQuery) this.#mediaQuery.removeEventListener("change", this.#boundHandleMediaQueryChange);
    }
    get initialized() {
        return Boolean(this.#swiper ? this.#isVirtual ? this.#swiper.virtual.cache[this.#swiper[this.#indexProp]] : this.#swiper.slides[this.#swiper[this.#indexProp]] : false);
    }
    get index() {
        return this.#swiper ? this.#swiper[this.#indexProp] : undefined;
    }
    get currentSlide() {
        return this.#swiper ? this.#isVirtual ? this.#swiper.virtual.cache[this.#swiper[this.#indexProp]] : this.#swiper.slides[this.#swiper[this.#indexProp]] : undefined;
    }
    slideTo(index, speed = 0) {
        if (!(typeof index === "number" && index >= 0)) throw new Error("Invalid slide index");
        if (this.dataset.loop) {
            this.#swiper.slideToLoop(index, speed);
        } else {
            this.#swiper.slideTo(index, speed);
        }
        this.#swiper.update();
        return this.#swiper;
    }
    stop() {
        if (!this.#swiper?.autoplay) return this.#swiper;
        this.#swiper.autoplay.stop();
        return this.#swiper;
    }
    start() {
        if (!this.#swiper?.autoplay) return this.#swiper;
        this.#swiper.autoplay.start();
        return this.#swiper;
    }
    on(type, handler, options) {
        this.addEventListener(type, handler, options);
        return this;
    }
    off(type, handler, options) {
        this.removeEventListener(type, handler, options);
        return this;
    }
    #init() {
        if (this.#swiper) return;
        this.#sliderElement.classList.add(MediaCarousel.#MEDIA_CAROUSEL_CLASS);
        if (this.#wrapperElement) {
            this.#wrapperElement.classList.add(MediaCarousel.#MEDIA_CAROUSEL_WRAPPER_CLASS);
        }
        if (this.#slideElements.length > 0) {
            this.#slideElements.forEach((el => el.classList.add(MediaCarousel.#MEDIA_CAROUSEL_SLIDE_CLASS)));
        }
        if (this.#paginationElement) this.#paginationElement.removeAttribute("hidden");
        if (this.#navigationElement) this.#navigationElement.removeAttribute("hidden");
        this.#swiper = new Swiper(this.#sliderElement, {
            autoHeight: Boolean(this.dataset.autoHeight),
            initialSlide: Number(this.dataset.initialSlide || 0),
            loop: Boolean(this.dataset.loop),
            modules: [ A11y, ...this.dataset.autoplay ? [ Autoplay ] : [], ...this.dataset.fade ? [ EffectFade ] : [], ...this.dataset.navigation ? [ Navigation ] : [], ...this.dataset.pagination ? [ Pagination ] : [], ...this.#isVirtual ? [ Virtual ] : [] ],
            observer: true,
            observeParents: true,
            slidesPerGroup: Number(this.dataset.slidesPerGroup || 1),
            slidesPerView: Number(this.dataset.slidesPerView || 1),
            spaceBetween: Number(this.dataset.spaceBetween || 30),
            speed: Number(this.dataset.speed || 200),
            ...this.dataset.autoplay ? {
                autoplay: {
                    delay: Number(this.dataset.autoplay || 3e3)
                }
            } : {},
            ...this.dataset.fade ? {
                effect: "fade",
                fadeEffect: {
                    crossFade: true
                }
            } : {},
            ...this.dataset.navigation ? {
                navigation: {
                    nextEl: this.querySelector(".js-carousel-next"),
                    prevEl: this.querySelector(".js-carousel-prev")
                }
            } : {},
            ...this.dataset.pagination ? {
                pagination: {
                    clickable: true,
                    el: this.querySelector(".js-carousel-pagination")
                }
            } : {},
            ...this.#isVirtual ? {
                virtual: {
                    slides: (() => Array.from(this.querySelector(".js-slides").children).map((el => el.innerHTML)))()
                }
            } : {},
            on: {
                afterInit: swiper => {
                    const previewImage = this.querySelector("media-carousel-preview-image");
                    if (previewImage) previewImage.setAttribute("hidden", "");
                    const interval = setInterval((() => {
                        const currentSlide = this.#isVirtual ? swiper.virtual.cache[swiper[this.#indexProp]] : swiper.el?.querySelector(".swiper-slide-active");
                        const dispatch = () => {
                            this.dispatchEvent(new CustomEvent("on:media-carousel:init", {
                                detail: {
                                    currentSlide: currentSlide,
                                    activeIndex: swiper[this.#indexProp]
                                }
                            }));
                            this.classList.remove("is-loading");
                            this.classList.add("is-initialized");
                            currentSlide.classList.add("is-visible");
                        };
                        if (currentSlide) {
                            dispatch();
                            clearInterval(interval);
                        }
                    }), 5);
                },
                slideChange: swiper => {
                    const interval = setInterval((() => {
                        const currentSlide = this.#isVirtual ? swiper.virtual.cache[swiper[this.#indexProp]] : swiper.el?.querySelector(".swiper-slide-active");
                        const dispatch = () => {
                            this.dispatchEvent(new CustomEvent("on:media-carousel:slide-change", {
                                detail: {
                                    currentSlide: currentSlide,
                                    activeIndex: swiper[this.#indexProp],
                                    previousIndex: swiper.previousIndex,
                                    previousSlide: this.#isVirtual ? swiper.virtual.cache[swiper.previousIndex] : swiper.el?.querySelector(".swiper-slide-prev")
                                }
                            }));
                        };
                        if (currentSlide) {
                            dispatch();
                            clearInterval(interval);
                        }
                    }), 5);
                },
                slideChangeTransitionStart: swiper => {
                    const interval = setInterval((() => {
                        const currentSlide = this.#isVirtual ? swiper.virtual.cache[swiper[this.#indexProp]] : swiper.el?.querySelector(".swiper-slide-active");
                        const previousSlide = this.#isVirtual ? swiper.virtual.cache[swiper.previousIndex] : swiper.el?.querySelector(".swiper-slide-prev");
                        const dispatch = () => {
                            this.dispatchEvent(new CustomEvent("on:media-carousel:before-slide-change", {
                                detail: {
                                    currentSlide: currentSlide,
                                    previousSlide: previousSlide,
                                    activeIndex: swiper[this.#indexProp],
                                    previousIndex: swiper.previousIndex
                                }
                            }));
                            currentSlide.classList.add("is-visible");
                        };
                        if (currentSlide) {
                            dispatch();
                            clearInterval(interval);
                        }
                    }), 5);
                },
                transitionEnd: swiper => {
                    const currentSlide = this.#isVirtual ? swiper.virtual.cache[swiper[this.#indexProp]] : swiper.el?.querySelector(".swiper-slide-active");
                    const previousSlide = this.#isVirtual ? swiper.virtual.cache[swiper.previousIndex] : swiper.el?.querySelector(".swiper-slide-prev");
                    previousSlide?.classList.remove("is-visible");
                    this.dispatchEvent(new CustomEvent("on:media-carousel:slide-transition-end", {
                        detail: {
                            currentSlide: currentSlide,
                            previousSlide: previousSlide,
                            activeIndex: swiper[this.#indexProp],
                            previousIndex: swiper.previousIndex
                        }
                    }));
                }
            }
        });
    }
    #destroy() {
        if (!this.#swiper) return;
        this.#swiper.destroy();
        this.#swiper = null;
        this.#sliderElement.classList.remove(MediaCarousel.#MEDIA_CAROUSEL_CLASS);
        this.querySelector("is-visible")?.classList.remove("is-visible");
        if (this.#wrapperElement) {
            this.#wrapperElement.classList.remove(MediaCarousel.#MEDIA_CAROUSEL_WRAPPER_CLASS);
        }
        if (this.#slideElements.length > 0) {
            this.#slideElements.forEach((el => el.classList.remove(MediaCarousel.#MEDIA_CAROUSEL_SLIDE_CLASS)));
        }
        if (this.#paginationElement) this.#paginationElement.setAttribute("hidden", "");
        if (this.#navigationElement) this.#navigationElement.setAttribute("hidden", "");
    }
    #handleMediaQueryChange(e) {
        if (e.matches && !this.#swiper) {
            this.#init();
        } else if (this.#swiper) {
            this.#destroy();
        }
    }
}

customElements.define("media-carousel", MediaCarousel);
//# sourceMappingURL=media-carousel.js.map
