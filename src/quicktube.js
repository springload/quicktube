const KEY_CODES = {
    ENTER: 13,
};

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

        // Bound functions
        this.onClick = this.onClick.bind(this);
        this.stopVideo = this.stopVideo.bind(this);
        this.onPlayerReady = this.onPlayerReady.bind(this);
        this.onPlayerStateChange = this.onPlayerStateChange.bind(this);
        this.onPlayerError = this.onPlayerError.bind(this);

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

            // TODO Figure out what this is doing and why!
            YT.gaLastAction = 'p';
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
        this.videoPoster.classList.add(this.options.posterFrameHiddenClass);
    }

    showPosterFrame() {
        this.videoPoster.classList.remove(this.options.posterFrameHiddenClass);
    }

    createIframePlayer(iframeContainer) {
        const iframe = document.createElement('iframe');
        iframe.src = this.playerURL;
        iframe.width = '100%';
        iframe.className = IFRAME_CLASS;
        iframeContainer.appendChild(iframe);

        if (this.isVimeo) {
            this.quicktubePlayer = new Vimeo.Player(iframe);

            this.quicktubePlayer.on('play', () => {
                console.log(this.playerId, ': Vimeo played!');
            });

            this.quicktubePlayer.on('pause', () => {
                console.log(this.playerId, ': Vimeo paused!');
            });
            // this.quicktubePlayer.on('timeupdate', () => {
            //     console.log(this.playerId, ': Vimeo time update!');
            // });
            this.quicktubePlayer.on('loaded', () => {
                console.log(this.playerId, ': Vimeo Video loaded!');
            });
            this.quicktubePlayer.on('error', () => {
                console.log(this.playerId, ': Vimeo Error!');
            });

            // Might wanna check this functionality, may want to leave stopped player
            // state so user can nav to other related videos?
            this.quicktubePlayer.on('ended', () => {
                this.stopVideo();
            });
        } else {
            this.quicktubePlayer = new YT.Player(iframe, {
                events: {
                    onReady: this.onPlayerReady,
                    onStateChange: this.onPlayerStateChange,
                    onError: this.onPlayerError,
                },
            });
        }
    }

    onPlayerReady(event) {
        const isPlaying = this.videoEl.getAttribute('data-video-playing');
        if (!isMobileSafari()) {
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

    onPlayerPlay() {

    }

    onPlayerPause() {

    }

    onPlayerEnd() {

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
            console.log('youtube ended');
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

const insertScript = (url) => {
    const isAlreadyInserted = document.querySelector(`[src="${url}"]`);

    if (!isAlreadyInserted) {
        const firstScript = document.querySelector('script');
        const newScript = document.createElement('script');
        newScript.src = url;
        firstScript.parentNode.insertBefore(newScript, firstScript);
    }
};

const quicktubeInit = () => {
    const videos = Array.prototype.slice.call(document.querySelectorAll('[data-quicktube]'));
    videos.forEach((video, i) => {
        const isVimeo = video.getAttribute('data-quicktube-platform') === 'vimeo';
        const videoId = video.getAttribute('data-quicktube');
        const playerId = video.getAttribute('data-quicktube-quid') || `quicktube-${i}`;
        const options = JSON.parse(video.getAttribute('data-quicktube-options'));
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

        const player = new Quicktube(videoId, playerId, video, videoDomain, options);
        return player;
    });
};

// Need to figure out the best way to export these to use inside tests as well as projects
module.exports = {
    init: quicktubeInit,
    Quicktube: Quicktube,
};
