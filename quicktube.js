'use strict';

// TODO has youtube api improved since this was written in 2015?
// Mobile Safari exhibits a number of documented bugs with the
// youtube player API. User agent detection, but you'll live, my boy!
// https://groups.google.com/forum/#!topic/youtube-api-gdata/vPgKhCu4Vng
const isMobileSafari = () => (/Apple.*Mobile.*Safari/).test(navigator.userAgent);

const quicktubeController = () => {
    // Inject the YouTube API onto the page.
    if(!window.YT) {
        const newScriptTag = document.createElement('script');
        newScriptTag.src = 'https://www.youtube.com/iframe_api';

        const documentScripts = document.getElementsByTagName('script');
        if (documentScripts.length > 0) {
            const firstScriptTag = documentScripts[0];
            firstScriptTag.parentNode.insertBefore(newScriptTag, firstScriptTag);
        }
    }

    const videos = document.querySelectorAll('[data-quicktube]');
    const stopButtons = document.querySelectorAll('[data-quicktube-stop]');

    videos.forEach((video) => {
        const videoId = video.getAttribute('data-quicktube');
        const options = video.getAttribute('data-quicktube-options');
        new Quicktube(videoId, options);
    });
}

class Quicktube {

    constructor(videoId, options = {}) {
        this._settings = '?autoplay=1&showinfo=0&autohide=1&color=white&enablejsapi=1&playerapiid=ytplayer&wmode=transparent';
        this._domain = 'https://www.youtube.com/embed/';
        // TODO Decide which settings you want to be able to configure from site init
        this.options = Object.assign({
            trackAnalytics: false,
            activeClass: 'quicktube--playing',
            pausedClass: 'quicktube--paused',
            posterFrameHiddenClass: 'quicktube__poster--hidden',
            autoplay: 1,
            showInfo: 0,
            autohide: 1,
            color: 'white',
            enablejsapi: 1,
            wmode: 'transparent',
        }, options);
        this.iframeClass = 'quicktube__iframe';
        this.activeClass = 'quicktube--playing';
        this.pausedClass = 'quicktube--paused';
        this.posterFrameHiddenClass = 'quicktube__poster--hidden';
        this.videoId = videoId;

        const videoEl = document.querySelector(`[data-quicktube="${videoId}"]`);
        const playButton = videoEl.querySelector('[data-quicktube-play]');
        const stopButton = document.querySelector(`[data-quicktube-stop="${videoId}"]`);

        playButton.addEventListener('click', this.onClick.bind(this, videoEl), false);

        playButton.addEventListener('keydown', (e) => {
            if(e.keyCode == 13) {
                this.onClick.call(this, videoEl);
            }
        }, false);

        stopButton.addEventListener('click', () => {
            this.stopVideo.call(this, this.videoId);
        }, false);
    }


    onClick(videoEl) {
        let iframeContainer = videoEl.querySelector('[data-quicktube-video]');

        // defines whether video has already been loaded and you want to play again
        const videoIframes = iframeContainer.getElementsByTagName('iframe');
        let iframe = false;
        if (videoIframes.length > 0) {
            iframe = videoIframes[0];
        }

        const poster = videoEl.querySelector('[data-quicktube-poster]');

        const onPlayerReady = (e) => {
            if (!isMobileSafari()) {
                if (videoEl.getAttribute('data-video-playing')) {
                    this.stopVideo.call(this, this.videoId);
                } else {
                    videoEl.getAttribute('data-video-playing');
                    e.target.playVideo();
                }
            }
        };

        // listen for play, pause and end states
        // also report % played every second
        const onPlayerStateChange = (e) => {
            e.data == YT.PlayerState.PLAYING && setTimeout(onPlayerPercent, 1000, e.target);
            const video_data = e.target.getVideoData();
            let label = video_data.title;
            // Get title of the current page
            const pageTitle = document.title;

            if(this.options.trackAnalytics) {
                if (e.data == YT.PlayerState.PLAYING && YT.gaLastAction == 'p') {
                    label = `Video Played - ${video_data.title}`;
                    this.trackEvent({
                        'event': 'youtube',
                        'eventCategory': 'Youtube Videos',
                        'eventAction': pageTitle,
                        'eventLabel': label
                    });
                    YT.gaLastAction = "";
                }

                if (e.data == YT.PlayerState.PAUSED) {
                    label = `Video Paused - ${video_data.title}`;
                    this.trackEvent({
                        'event': 'youtube',
                        'eventCategory': 'Youtube Videos',
                        'eventAction': pageTitle,
                        'eventLabel': label
                    });
                    YT.gaLastAction = 'p';
                }
            }

            if (e.data == YT.PlayerState.ENDED) {
                this.stopVideo.call(this, parentId);
            }
        }

        // catch all to report errors through the GTM data layer
        // once the error is exposed to GTM, it can be tracked in UA as an event!
        const onPlayerError = (e) => {
            if(this.options.trackAnalytics) {
                this.trackEvent({
                    'event': 'error',
                    'eventCategory': 'Youtube Videos',
                    'eventAction': 'GTM',
                    'eventLabel': `youtube:${e.target.src}-${e.data}`
                })
            };
        };

        // report the % played if it matches 0%, 25%, 50%, 75% or completed
        const onPlayerPercent = (e) => {
            if (e.getPlayerState() == YT.PlayerState.PLAYING) {
                if(this.options.trackAnalytics) {
                    const time = e.getDuration() - e.getCurrentTime() <= 1.5 ? 1 : (Math.floor(e.getCurrentTime() / e.getDuration() * 4) / 4).toFixed(2);
                    if (!e.lastP || time > e.lastP) {
                        const video_data = e.getVideoData();
                        let label = video_data.title;
                        // Get title of the current page
                        const pageTitle = document.title;
                        e.lastP = time;
                        label = `${time * 100}% Video played - ${video_data.title}`;
                        this.trackEvent({
                            'event': 'youtube',
                            'eventCategory': 'Youtube Videos',
                            'eventAction': pageTitle,
                            'eventLabel': label
                        })
                    }
                    e.lastP != 1 && setTimeout(onPlayerPercent, 1000, e);
                }
            }
        }

        if (!iframe) {
            iframe = this.getIframePlayer(this.videoId, videoEl);
            iframeContainer.appendChild(iframe);
            this.quicktubePlayer = new YT.Player(this.videoId, {
                events: {
                    'onStateChange': onPlayerStateChange,
                    'onReady': onPlayerReady,
                    'onError': onPlayerError
                }
            });
            YT.gaLastAction = 'p';
        }

        if (!isMobileSafari()) {
            if (this.quicktubePlayer.playVideo) {
                this.quicktubePlayer.playVideo();
            }
        }

        if (!videoEl.getAttribute('data-video-playing')) {
            this.hidePosterFrame(poster);
            videoEl.classList.add(this.activeClass);
            videoEl.classList.remove(this.pausedClass);
            window.dispatchEvent(new Event('quicktube:play'));
        }
    }

    hidePosterFrame(poster) {
        poster.classList.add(this.posterFrameHiddenClass);
    }

    showPosterFrame(poster) {
        poster.classList.remove(this.posterFrameHiddenClass);
    }

    getIframePlayer(id, parent) {
        let iframe = document.createElement('iframe');
        iframe.src = this._domain + id + this._settings;
        iframe.width = '100%';
        iframe.id = id;
        iframe.className = this.iframeClass;
        return iframe;
    }

    stopVideo(videoId) {
        let videoEl = document.querySelector(`[data-quicktube='${videoId}']`);

        if(!this.quicktubePlayer) {
            return;
        }

        this.quicktubePlayer.pauseVideo();
        videoEl.classList.remove(this.activeClass);
        videoEl.classList.add(this.pausedClass);
        this.showPosterFrame(videoEl.querySelector('[data-quicktube-poster]'));
        videoEl.getAttribute('data-video-playing');
        window.dispatchEvent(new Event('quicktube:pause'));
    }

    trackEvent(event) {
        if (typeof window.ga === 'function') {
            window.ga('send', 'event', event.eventCategory, event.eventAction, event.eventLabel);
        }
    }

}

module.exports = {
    quicktubeController: quicktubeController,
    Quicktube: Quicktube
}
