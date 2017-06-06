import throttle from 'lodash/throttle';

const KEY_CODES = {
    ENTER: 13,
};
const TIMEOUT_DELAY = 10000;
const YOUTUBE_API = 'https://www.youtube.com/iframe_api';
const YOUTUBE_EMBED = 'https://www.youtube.com/embed/';
const VIMEO_API = 'https://player.vimeo.com/api/player.js';
const VIMEO_EMBED = 'https://player.vimeo.com/video/';
const IFRAME_CLASS = 'quicktube__iframe';

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

const createPlayerURL = (playerEmbedUrl, videoId, options) => {
    let url = `${playerEmbedUrl}${videoId}?autoplay=1`;
    const optionKeys = Object.keys(options);
    optionKeys.forEach((key) => {
        url += `&${encodeURIComponent(key)}=${encodeURIComponent(options[key])}`;
    });
    return url;
};

const getCurrentSegment = (currentPosition, duration, numberOfSegments = 4) => {
    const percentage = (currentPosition / duration);
    // Ensure value is rounded to nearest whole segment eg. 1, 2, 3 , 4
    return (Math.floor(percentage * numberOfSegments) / numberOfSegments).toFixed(2);
};

class Quicktube {
    constructor(videoId, playerId, videoEl, videoEmbedUrl, options = {}) {
        this.videoId = videoId;
        this.videoEl = videoEl;
        this.playerId = playerId;
        this.videoPoster = this.videoEl.querySelector('[data-quicktube-poster]');
        this.videoPlatform = this.videoEl.getAttribute('data-quicktube-platform');
        this.videoTitle = undefined;
        this.pageTitle = document.title;
        this.segment = undefined;

        // Bound functions
        this.onClick = this.onClick.bind(this);
        this.onPlayerReady = this.onPlayerReady.bind(this);
        this.onYoutubePlayerStateChange = this.onYoutubePlayerStateChange.bind(this);
        this.onPlayerPlay = this.onPlayerPlay.bind(this);
        this.onPlayerPause = this.onPlayerPause.bind(this);
        this.onPlayerEnded = this.onPlayerEnded.bind(this);
        this.onPlayerError = this.onPlayerError.bind(this);
        this.onPlayerPercent = this.onPlayerPercent.bind(this);
        this.throttleOnPlayerPercent = throttle(() => {
            this.onPlayerPercent(this.quicktubePlayer);
        }, TIMEOUT_DELAY);

        // Booleans
        this.isVimeo = this.videoEl.getAttribute('data-quicktube-platform') === 'vimeo';

        // Settings
        this.options = Object.assign({
            trackAnalytics: false,
            activeClass: 'quicktube--playing',
            pausedClass: 'quicktube--paused',
            posterFrameHiddenClass: 'quicktube__poster--hidden',
        }, options);

        const playerOptions = this.isVimeo ? {
            autopause: 0,
        } : {
            showInfo: 0,
            autohide: 1,
            color: 'white',
            playerapi: 'ytplayer',
            enablejsapi: 1,
            wmode: 'transparent',
        };

        this.playerURL = createPlayerURL(videoEmbedUrl, this.videoId, playerOptions);

        // Initial actions
        // Need to have unique id's so that multiple of the same video can exist on a page without breaking
        const playEl = this.videoEl.querySelector('[data-quicktube-play]');
        playEl.setAttribute('data-play-guid', this.playerId);

        playEl.addEventListener('click', this.onClick);

        playEl.addEventListener('keydown', (event) => {
            if (event.keyCode === KEY_CODES.ENTER) {
                this.onClick();
            }
        });
    }

    onClick() {
        const iframeContainer = this.videoEl.querySelector('[data-quicktube-video]');
        const hasPlayer = !!iframeContainer.querySelector('iframe');

        if (!hasPlayer) {
            this.createIframePlayer(iframeContainer);
        }

        // Only trigger force video play if not Mobile safari as playVideo function not supported
        if (!isMobileSafari()) {
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

    hidePosterFrame() {
        this.videoPoster.classList.add(this.options.posterFrameHiddenClass);
    }

    onPlayerPause() {
        this.removeActiveState();

        if (this.options.trackAnalytics) {
            const label = `Video Paused - ${this.videoTitle}`;
            trackEvent({
                eventCategory: this.videoPlatform,
                eventAction: this.pageTitle,
                eventLabel: label,
            });
        }
    }

    onPlayerPlay() {
        this.videoEl.setAttribute('data-video-playing', true);
        this.addActiveState();

        if (this.options.trackAnalytics) {
            const label = `Video Played - ${this.videoTitle}`;
            trackEvent({
                eventCategory: this.videoPlatform,
                eventAction: this.pageTitle,
                eventLabel: label,
            });
        }
    }

    onPlayerEnded() {
        if (this.options.trackAnalytics) {
            const label = `Video Ended - ${this.videoTitle}`;
            trackEvent({
                eventCategory: this.videoPlatform,
                eventAction: this.pageTitle,
                eventLabel: label,
            });
        }
    }

    // report the % played if it matches 0%, 25%, 50%, 75% or completed
    onPlayerPercent(originalEvent) {
        if (this.options.trackAnalytics) {
            const event = originalEvent;

            if (this.isVimeo) {
                event.getCurrentTime().then((seconds) => {
                    event.getDuration().then((duration) => {
                        this.trackSegment(event, duration, seconds);
                    });
                });
            } else if (event.getPlayerState() === YT.PlayerState.PLAYING) {
                // Do we need this if? It may already be testing this before we even call the PlayerPercent function
                // Yes, it fires twice without this?
                const videoDuration = event.getDuration();
                const videoProgress = event.getCurrentTime();

                this.trackSegment(event, videoDuration, videoProgress);
            }
        }
    }

    createIframePlayer(iframeContainer) {
        const iframe = document.createElement('iframe');
        iframe.src = this.playerURL;
        iframe.width = '100%';
        iframe.className = IFRAME_CLASS;
        iframeContainer.appendChild(iframe);

        if (this.isVimeo) {
            this.quicktubePlayer = new Vimeo.Player(iframe);

            this.quicktubePlayer.on('loaded', () => {
                this.onPlayerReady();
            });

            // TODO Vimeo returns title with a promise, sigh! Figure out what best option is for
            // writing a fail case since we'll still wanna track the events, just provide a default title as an alternative
            this.quicktubePlayer.getVideoTitle().then((title) => {
                this.videoTitle = title;

                this.quicktubePlayer.on('play', () => {
                    this.onPlayerPlay();
                });

                this.quicktubePlayer.on('pause', () => {
                    this.onPlayerPause();
                });

                this.quicktubePlayer.on('timeupdate', this.throttleOnPlayerPercent);

                this.quicktubePlayer.on('error', () => {
                    console.log(this.playerId, ': Vimeo Error!');
                });
            });
        } else {
            this.quicktubePlayer = new YT.Player(iframe, {
                events: {
                    onReady: this.onPlayerReady,
                    onStateChange: this.onYoutubePlayerStateChange,
                    onError: this.onPlayerError,
                },
            });
        }
    }

    onPlayerReady() {
        const isPlaying = this.videoEl.getAttribute('data-video-playing');
        if (!isMobileSafari() && !isPlaying) {
            this.videoEl.setAttribute('data-video-playing', true);
        }
    }

    // listen for play, pause, percentage play, and end states
    onYoutubePlayerStateChange(event) {
        const videoData = event.target.getVideoData();
        this.videoTitle = videoData.title;

        if (event.data === YT.PlayerState.PLAYING) {
            // Report % played every second
            setTimeout(this.onPlayerPercent(event.target), TIMEOUT_DELAY);
            this.onPlayerPlay();
        }

        if (event.data === YT.PlayerState.PAUSED) {
            this.onPlayerPause();
        }

        if (event.data === YT.PlayerState.ENDED) {
            this.onPlayerEnded();
        }
    }

    trackSegment(event, videoDuration, videoProgress) {
        let currentSegment;
        // If less than 1.5 seconds from the end of the video
        if (videoDuration - videoProgress <= 1.5) {
            currentSegment = 1;
        } else {
            currentSegment = getCurrentSegment(videoProgress, videoDuration);
        }

        // Only fire tracking event at 0, .25, .50, .75 or 1 segment mark
        if (!this.segment || currentSegment > this.segment) {
            this.segment = currentSegment;
            const label = `${currentSegment * 100}% Video played - ${this.videoTitle}`;
            trackEvent({
                eventCategory: this.videoPlatform,
                eventAction: this.pageTitle,
                eventLabel: label,
            });
        }

        if (this.segment !== 1 && this.videoPlatform === 'youtube') {
            setTimeout(this.onPlayerPercent.bind(this, event), 1000);
        }
    }

    // catch all to report errors through the GTM data layer
    // once the error is exposed to GTM, it can be tracked in UA as an event!
    onPlayerError(event) {
        if (this.options.trackAnalytics) {
            trackEvent({
                eventCategory: 'Video error',
                eventAction: 'GTM',
                eventLabel: `youtube:${event.target.src}-${event.data}`,
            });
        }
    }

}

const insertScript = (url) => {
    const isAlreadyInserted = document.querySelector(`[src="${url}"]`);

    if (!isAlreadyInserted) {
        const firstScript = document.querySelector('script');
        const newScript = document.createElement('script');
        newScript.src = url;
        firstScript.parentNode.insertBefore(newScript, firstScript);
    }
};

Quicktube.init = () => {
    const players = Array.prototype.slice.call(document.querySelectorAll('[data-quicktube]'));

    return players.map((player, i) => {
        const isVimeo = player.getAttribute('data-quicktube-platform') === 'vimeo';
        const videoId = player.getAttribute('data-quicktube');
        const playerId = player.getAttribute('data-quicktube-quid') || `quicktube-${i}`;
        const options = JSON.parse(player.getAttribute('data-quicktube-options'));
        let videoDomain;

        if (isVimeo) {
            // Inject the Vimeo Player API
            insertScript(VIMEO_API);
            videoDomain = VIMEO_EMBED;
        } else {
            // Inject the YouTube API
            insertScript(YOUTUBE_API);
            videoDomain = YOUTUBE_EMBED;
        }

        return new Quicktube(videoId, playerId, player, videoDomain, options);
    });
};

module.exports = Quicktube;
