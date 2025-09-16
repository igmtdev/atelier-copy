/*! Copyright (c) Safe As Milk. All rights reserved. */
import Player, { YoutubeProvider, VimeoProvider } from "vlite";

const VIDEO_TYPES = [ "html5", "youtube", "vimeo" ];

Player.registerProvider("youtube", YoutubeProvider);

Player.registerProvider("vimeo", VimeoProvider);

class VideoPlayer extends HTMLElement {
    #boundPlay;
    #isReady=false;
    #isPlaying=false;
    #loading=false;
    #loadingIndicator;
    #player=null;
    #posterElement;
    #posterUrl;
    #isPlayScheduled=false;
    #type;
    #videoElementContainer;
    constructor() {
        super();
        this.#boundPlay = this.play.bind(this);
    }
    connectedCallback() {
        this.#type = this.dataset.type;
        if (!this.#type || !VIDEO_TYPES.includes(this.#type)) throw new Error('Video type must be provided and one of: "html5", "Youtube", "Vimeo"');
        this.#videoElementContainer = this.querySelector("video-element");
        this.#loadingIndicator = this.querySelector("video-loading-indicator");
        this.#posterUrl = this.dataset.poster;
        this.#posterElement = this.querySelector("video-poster");
        if (this.#posterElement) {
            this.#posterElement.addEventListener("click", this.loadContent.bind(this), {
                once: true
            });
            if (this.#type === "vimeo") this.#updateVimeoPoster();
        }
    }
    disconnectedCallback() {
        this.#loading = false;
        if (this.#player) {
            this.#player.destroy();
            this.#player = null;
            this.#isReady = false;
            this.#videoElementContainer.innerHTML = "";
            this.removeAttribute("loaded");
        }
        if (this.#isPlayScheduled) {
            this.removeEventListener("on:video-player:play", this.#isPlayScheduled);
            this.#isPlayScheduled = null;
        }
        if (this.#loadingIndicator) this.#loadingIndicator.setAttribute("hidden", "");
    }
    get ready() {
        return this.#isReady;
    }
    loadContent() {
        if (this.hasAttribute("loaded") || this.#loading) return this;
        this.#videoElementContainer.appendChild(this.querySelector("template").content.firstElementChild.cloneNode(true));
        const videoElement = this.querySelector("[video-element]");
        if (!videoElement) throw new Error("Video element not found");
        if (this.#loadingIndicator) this.#loadingIndicator.removeAttribute("hidden", "");
        const createPlayer = () => {
            new Player(videoElement, {
                options: {
                    autoHide: true,
                    ...this.#posterUrl ? {
                        poster: this.#posterUrl
                    } : {}
                },
                provider: this.#type,
                onReady: player => {
                    this.#player = player;
                    this.#isReady = true;
                    this.#loading = false;
                    this.setAttribute("loaded", "");
                    if (this.#loadingIndicator) this.#loadingIndicator.setAttribute("hidden", "");
                    const playButton = this.querySelector(".v-bigPlay");
                    if (playButton) {
                        const playIcon = document.getElementById("template-icon-play").content;
                        playButton.innerHTML = "";
                        playButton.appendChild(playIcon.cloneNode(true));
                    }
                    this.#player.on("play", (() => {
                        this.#isPlaying = true;
                        this.classList.add("is-playing");
                        if (this.#posterElement) this.#posterElement.classList.add("is-hidden");
                        this.dispatchEvent(new CustomEvent("on:video-player:playing"));
                    }));
                    this.#player.on("pause", (() => {
                        this.#isPlaying = false;
                        this.classList.remove("is-playing");
                        this.dispatchEvent(new CustomEvent("on:video-player:paused"));
                    }));
                    this.#player.on("ended", (() => {
                        this.#isPlaying = false;
                        this.classList.remove("is-playing");
                        this.dispatchEvent(new CustomEvent("on:video-player:ended"));
                    }));
                    this.dispatchEvent(new CustomEvent("on:video-player:ready"));
                }
            });
        };
        if (this.#type === "vimeo" && this.#posterElement.dataset.videoId && this.#posterElement.children.length === 0 && this.#posterUrl === undefined) {
            const interval = setInterval((() => {
                if (typeof this.#posterUrl === "string") {
                    createPlayer();
                    clearInterval(interval);
                }
            }), 50);
        } else {
            createPlayer();
        }
        return this;
    }
    play() {
        if (this.#isPlaying) return this;
        if (this.#player) {
            this.#isPlayScheduled = false;
            this.#player.play();
        } else if (!this.#isPlayScheduled) {
            this.#isPlayScheduled = true;
            this.addEventListener("on:video-player:ready", this.#boundPlay, {
                once: true
            });
        }
        return this;
    }
    pause() {
        if (!this.#isPlaying) return this;
        if (this.#player) {
            this.#player.pause();
        } else if (this.#isPlayScheduled) {
            this.#isPlayScheduled = false;
            this.removeEventListener("on:video-player:ready", this.#boundPlay);
        }
        return this;
    }
    on(type, handler, options) {
        this.addEventListener(type, handler, options);
        return this;
    }
    off(type, handler, options) {
        this.removeEventListener(type, handler, options);
        return this;
    }
    async #updateVimeoPoster() {
        if (!this.#posterElement) return;
        if (this.#posterElement.dataset.videoId && this.#posterElement.children.length === 0) {
            try {
                const data = await fetch(`https://vimeo.com/api/v2/video/${this.#posterElement.dataset.videoId}.json`);
                const [videoData] = await data.json();
                const {thumbnail_large: thumbnail} = videoData;
                this.#posterUrl = thumbnail;
                this.#posterElement.innerHTML = `<img src="${thumbnail}">`;
            } catch (e) {
                this.#posterUrl = "";
                console.error(`Could not load Vimeo poster: ${e}`);
            }
        }
    }
}

customElements.define("video-player", VideoPlayer);
//# sourceMappingURL=video-player.js.map
