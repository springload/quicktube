const KEY_CODES = {
    ENTER: 13,
};

const YOUTUBE_API = 'https://www.youtube.com/iframe_api';
const YOUTUBE_EMBED = 'https://www.youtube.com/embed/';
const VIMEO_API = 'https://player.vimeo.com/api/player.js';
const VIMEO_EMBED = 'https://player.vimeo.com/video/';
const FIRST_SCRIPT_TAG = document.getElementsByTagName('script')[0];

// Mobile Safari exhibits a number of documented bugs with the
// youtube player API
// https://groups.google.com/forum/#!topic/youtube-api-gdata/vPgKhCu4Vng
const isMobileSafari = () => (/Apple.*Mobile.*Safari/).test(navigator.userAgent);

const trackEvent = (event) => {
    const settings = Object.assign({
        eventCategory: 'Videos',
        eventAction: 'GTM',
        eventLabel: '',
    }, event);

    if (typeof window.ga === 'function') {
        window.ga('send', 'event', settings.eventCategory, settings.eventAction, settings.eventLabel);
    }
};

const createPlayerUrl = (playerEmbedUrl, playerId, options) => {
    let url = `${playerEmbedUrl}${playerId}?autoplay=1`;
    const optionKeys = Object.keys(options);
    optionKeys.forEach((key) => {
        url += `&${key}=${options[key]}`;
    });
    return url;
};

const numberOfSegments = 4;
const getCurrentSegment = (currentPosition, duration) => {
    const percentage = (currentPosition / duration);
    // Ensure value is rounded to nearest whole segment eg. 1, 2, 3 , 4
    return (Math.floor(percentage * numberOfSegments) / numberOfSegments).toFixed(2);
};

class Quicktube {

    constructor(videoId, videoEmbedUrl, options = {}) {
        this.options = Object.assign({
            trackAnalytics: false,
            activeClass: 'quicktube--playing',
            pausedClass: 'quicktube--paused',
            posterFrameHiddenClass: 'quicktube__poster--hidden',
        }, options);

        this.iframeClass = 'quicktube__iframe';
        this.videoId = videoId;
        this.videoEl = document.querySelector(`[data-quicktube="${videoId}"]`);
        this.poster = this.videoEl.querySelector('[data-quicktube-poster]');
        this.isMobileSafari = isMobileSafari();
        this.onClick = this.onClick.bind(this);
        this.stopVideo = this.stopVideo.bind(this);
        this.onPlayerReady = this.onPlayerReady.bind(this);
        this.onPlayerStateChange = this.onPlayerStateChange.bind(this);
        this.onPlayerError = this.onPlayerError.bind(this);
        this.isVimeo = this.videoEl.hasAttribute('data-quicktube-vimeo');

        const playerOptions = !this.isVimeo ? {
            showInfo: 0,
            autohide: 1,
            color: 'white',
            playerapi: 'ytplayer',
            enablejsapi: 1,
            wmode: 'transparent',
        } : {};

        this._playerUrl = createPlayerUrl(videoEmbedUrl, this.videoId, playerOptions);

        const playButton = document.querySelector(`[data-quicktube-play="${videoId}"]`);
        const stopButton = document.querySelector(`[data-quicktube-stop="${videoId}"]`);

        playButton.addEventListener('click', this.onClick);

        playButton.addEventListener('keydown', (e) => {
            if (e.keyCode === KEY_CODES.ENTER) {
                this.onClick();
            }
        });

        stopButton.addEventListener('click', () => {
            this.stopVideo();
        });
    }

    onClick() {
        const iframeContainer = this.videoEl.querySelector('[data-quicktube-video]');
        const videoIframes = iframeContainer.getElementsByTagName('iframe');

        // defines whether video has already been loaded and you want to play again
        let iframe = false;
        if (videoIframes.length > 0) {
            iframe = videoIframes[0];
        }

        if (!iframe) {
            iframe = this.createIframePlayer();
            iframeContainer.appendChild(iframe);
            this.quicktubePlayer = this.isVimeo ? new Vimeo.Player(this.videoEl) : new YT.Player(this.videoId, {
                events: {
                    onStateChange: this.onPlayerStateChange,
                    onReady: this.onPlayerReady,
                    onError: this.onPlayerError,
                },
            });
            YT.gaLastAction = 'p';
        }

        // Only trigger force video play if not Mobile safari as playVideo function not supported
        if (!this.isMobileSafari) {
            if (this.quicktubePlayer) {
                if (this.isVimeo) {
                    this.quicktubePlayer.play();
                } else {
                    // It doesn't have playVideo function in the initial state. Is added after video is ready
                    const isLoaded = this.quicktubePlayer.playVideo;

                    if (isLoaded) {
                        this.quicktubePlayer.playVideo();
                    }
                }
            }
        }

        // Check if video isn't already playing
        if (!this.videoEl.getAttribute('data-video-playing')) {
            this.hidePosterFrame();
            this.addActiveState();
        }
    }

    addActiveState() {
        this.videoEl.classList.add(this.options.activeClass);
        this.videoEl.classList.remove(this.options.pausedClass);
    }

    removeActiveState() {
        this.videoEl.classList.remove(this.options.activeClass);
        this.videoEl.classList.add(this.options.pausedClass);
        this.videoEl.removeAttribute('data-video-playing');
    }

    stopVideo() {
        if (!this.quicktubePlayer) {
            return;
        }

        if (this.isVimeo) {
            this.quicktubePlayer.unload();
        } else {
            this.quicktubePlayer.stopVideo();
        }

        this.removeActiveState();
        this.showPosterFrame();
    }

    hidePosterFrame() {
        this.poster.classList.add(this.options.posterFrameHiddenClass);
    }

    showPosterFrame() {
        this.poster.classList.remove(this.options.posterFrameHiddenClass);
    }

    createIframePlayer() {
        const iframe = document.createElement('iframe');
        iframe.src = this._playerUrl;
        iframe.width = '100%';
        iframe.id = this.videoId;
        iframe.className = this.iframeClass;
        return iframe;
    }

    onPlayerReady(event) {
        const isPlaying = this.videoEl.getAttribute('data-video-playing');
        if (!this.isMobileSafari) {
            if (isPlaying) {
                // TODO evaluate if this is needed
                // Not sure it ever gets to this point
                this.stopVideo();
            } else {
                this.videoEl.setAttribute('data-video-playing', true);
                event.target.playVideo();
            }
        }
    }

    // listen for play, pause, percentage play, and end states
    onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            this.videoEl.setAttribute('data-video-playing', true);
            this.addActiveState();
            // Report % played every second
            setTimeout(this.onPlayerPercent.bind(this, event.target), 1000);
        }

        if (event.data === YT.PlayerState.PAUSED) {
            this.removeActiveState();
        }

        const videoData = event.target.getVideoData();
        let label = videoData.title;
        // Get title of the current page
        const pageTitle = document.title;

        // TODO figure out what this is all doing and test it
        if (this.options.trackAnalytics) {
            if (event.data === YT.PlayerState.PLAYING && YT.gaLastAction === 'p') {
                label = `Video Played - ${videoData.title}`;
                trackEvent({
                    event: 'youtube',
                    eventAction: pageTitle,
                    eventLabel: label,
                });
                YT.gaLastAction = '';
            }

            if (event.data === YT.PlayerState.PAUSED) {
                label = `Video Paused - ${videoData.title}`;
                trackEvent({
                    event: 'youtube',
                    eventAction: pageTitle,
                    eventLabel: label,
                });
                YT.gaLastAction = 'p';
            }
        }

        if (event.data === YT.PlayerState.ENDED) {
            this.stopVideo();
        }
    }

    // report the % played if it matches 0%, 25%, 50%, 75% or completed
    onPlayerPercent(originalEvent) {
        const event = originalEvent;

        if (this.options.trackAnalytics) {
            if (event.getPlayerState() === YT.PlayerState.PLAYING) {
                const videoDuration = event.getDuration();
                const videoProgress = event.getCurrentTime();
                let currentSegment;

                // If less than 1.5 seconds from the end of the video
                if (videoDuration - videoProgress <= 1.5) {
                    currentSegment = 1;
                } else {
                    currentSegment = getCurrentSegment(videoProgress, videoDuration);
                }

                // Only fire tracking event at 0, .25, .50, .75 or 1 segment mark
                if (!event.previousSegment || currentSegment > event.previousSegment) {
                    const videoData = event.getVideoData();
                    const pageTitle = document.title;
                    event.previousSegment = currentSegment;
                    const label = `${currentSegment * 100}% Video played - ${videoData.title}`;
                    trackEvent({
                        event: 'youtube',
                        eventAction: pageTitle,
                        eventLabel: label,
                    });
                }

                if (event.previousSegment !== 1) {
                    setTimeout(this.onPlayerPercent.bind(this, event), 1000);
                }
            }
        }
    }

    // catch all to report errors through the GTM data layer
    // once the error is exposed to GTM, it can be tracked in UA as an event!
    onPlayerError(event) {
        if (this.options.trackAnalytics) {
            trackEvent({
                event: 'error',
                eventAction: 'GTM',
                eventLabel: `youtube:${event.target.src}-${event.data}`,
            });
        }
    }

}

// This seems to be a requirement of the YouTube Player API for iframe embeds
// https://developers.google.com/youtube/iframe_api_reference#Requirements
window.onYouTubeIframeAPIReady = () => {
    // TODO investigate whether this is a set requirement
};

const insertApiScript = (url, hasBeenCreated) => {
    if (!hasBeenCreated) {
        const newScriptTag = document.createElement('script');
        newScriptTag.src = url;
        FIRST_SCRIPT_TAG.parentNode.insertBefore(newScriptTag, FIRST_SCRIPT_TAG);
    }
};

const quicktubeInit = () => {
    const videos = Array.prototype.slice.call(document.querySelectorAll('[data-quicktube]'));
    videos.forEach((video) => {
        let videoDomain;
        if (video.hasAttribute('data-quicktube-vimeo')) {
            // Inject the Vimeo Player API
            insertApiScript(VIMEO_API, window.Vimeo);
            videoDomain = VIMEO_EMBED;
        } else {
            // Inject the YouTube API
            insertApiScript(YOUTUBE_API, window.YT);
            videoDomain = YOUTUBE_EMBED;
        }
        const videoId = video.getAttribute('data-quicktube');
        const options = JSON.parse(video.getAttribute('data-quicktube-options'));
        const player = new Quicktube(videoId, videoDomain, options);
        return player;
    });
};

// Need to figure out the best way to export these to use inside tests as well as projects
module.exports = {
    init: quicktubeInit,
    Quicktube: Quicktube,
};
