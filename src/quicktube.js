const KEY_CODES = {
    ENTER: 13,
};

// Mobile Safari exhibits a number of documented bugs with the
// youtube player API
// https://groups.google.com/forum/#!topic/youtube-api-gdata/vPgKhCu4Vng
const isMobileSafari = () => (/Apple.*Mobile.*Safari/).test(navigator.userAgent);

const numberOfSegments = 4;

const trackEvent = (event) => {
    const settings = Object.assign({
        eventCategory: 'Youtube Videos',
        eventAction: 'GTM',
        eventLabel: '',
    }, event);

    if (typeof window.ga === 'function') {
        window.ga('send', 'event', settings.eventCategory, settings.eventAction, settings.eventLabel);
    }
};

const getCurrentSegment = (currentPosition, duration) => {
    const percentage = (currentPosition / duration);
    return (Math.floor(percentage * numberOfSegments) / numberOfSegments).toFixed(2);
};

class Quicktube {

    constructor(videoId, options = {}) {
        this._domain = 'https://www.youtube.com/embed/';
        this.options = Object.assign({
            trackAnalytics: false,
            activeClass: 'quicktube--playing',
            pausedClass: 'quicktube--paused',
            posterFrameHiddenClass: 'quicktube__poster--hidden',
            showInfo: 0,
            autohide: 1,
            color: 'white',
            wmode: 'transparent',
        }, options);

        // Concatenate in a more readable way :D
        this._settings = `?autoplay=1\
&showinfo=${this.options.showInfo}\
&autohide=${this.options.autohide}\
&color=${this.options.color}\
&enablejsapi=1\
&playerapiid=ytplayer\
&wmode=${this.options.wmode}`;

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
            this.quicktubePlayer = new YT.Player(this.videoId, {
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
            if (this.quicktubePlayer.playVideo) {
                this.quicktubePlayer.playVideo();
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

        this.quicktubePlayer.stopVideo();
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
        iframe.src = this._domain + this.videoId + this._settings;
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

// This is a requirement of the YouTube Player API for iframe embeds
// https://developers.google.com/youtube/iframe_api_reference#Requirements
window.onYouTubeIframeAPIReady = () => {
    console.log('onYouTubeIframeAPIReady');
};

const quicktubeInit = () => {
    // Inject the YouTube API onto the page.
    if (!window.YT) {
        const newScriptTag = document.createElement('script');
        newScriptTag.src = 'https://www.youtube.com/iframe_api';

        const firstDocumentScript = document.getElementsByTagName('script')[0];
        firstDocumentScript.parentNode.insertBefore(newScriptTag, firstDocumentScript);
    }

    const videos = Array.prototype.slice.call(document.querySelectorAll('[data-quicktube]'));
    videos.forEach((video) => {
        const videoId = video.getAttribute('data-quicktube');
        const options = JSON.parse(video.getAttribute('data-quicktube-options'));
        const player = new Quicktube(videoId, options);
        return player;
    });
};

// Need to figure out the best way to export these to use inside tests as well as projects
module.exports = {
    init: quicktubeInit,
    Quicktube: Quicktube,
};
