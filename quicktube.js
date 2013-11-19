var QuickTube = (function(){

    var tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Export this to window directly.
    window.onYouTubeIframeAPIReady = function() {
        $(document).ready(function() {
            QuickTube.init();
        });
    };

    var QT = {
        _settings: "?autoplay=1&showinfo=0&autohide=1&color=white&enablejsapi=1&playerapiid=ytplayer&wmode=transparent",
        _domain: "http://www.youtube.com/embed/",
        _players: {},
        className: "quicktube__iframe",
        activeClass: "quicktube--playing",
        pausedClass: "quicktube--paused",
        posterFrameHiddenClass: "quicktube__poster--hidden",
        supportsTransitions: ('transition' in document.body.style || 'webkitTransition' in document.body.style || 'MozTransition' in document.body.style || 'msTransition' in document.body.style || 'OTransition' in document.body.style),
        setExplicitFrameHeight: false,
        init: function() {
            var self = this;
            $("[data-quicktube-play]").on("click", function() {
                self.onClick.call(self, $(this));
            });
            $("[data-quicktube-stop]").on("click", function() {
                var videoId = $(this).data("quicktube-stop");
                self.stopVideo.call(self, videoId);
            });
            return this;
        },
        onClick: function($el) {
            var self = this;
            var parentId = $el.data("quicktube-play");
            var $parent = $("[data-quicktube=\"" + parentId + "\"]");
            var $videoContainer = $parent.find("[data-quicktube-video]");
            var $video = $("iframe." + self.className, $videoContainer);
            var videoId = $videoContainer.data("quicktube-video");
            var $poster = $parent.find("[data-quicktube-poster]");

            var onPlayerStateChange = function(e) {
                if (e.data == YT.PlayerState.ENDED) {
                    self.stopVideo.call(self, parentId);
                }
            };

            var onPlayerReady = function(e) {
                if ($parent.data("video-playing")) {
                    self.stopVideo.call(self, parentId);
                } else {
                    $parent.data("video-playing", true);
                   e.target.playVideo();
                }
            };

            if (!$video.length) {
                $video = self.getIframePlayer(videoId, $parent, parentId);
                $videoContainer.html($video);
                this.jamesPlayer = new YT.Player(parentId, {
                    events: {
                        'onStateChange': onPlayerStateChange,
                        'onReady': onPlayerReady,
                    }
                });
            }

            if (this.jamesPlayer.playVideo) {
                this.jamesPlayer.playVideo();
            }

            if (self.setExplicitFrameHeight) {
                $video.height($parent.outerHeight());
            }

            if (!$parent.data("video-playing")) {
                self.hidePosterFrame($poster);
                self._players[parentId] = $parent;
                $parent.addClass(self.activeClass).removeClass(self.pausedClass);
                $(window).trigger("quicktube:play", parentId, $parent);
            }
        },

        hidePosterFrame: function($poster) {
            var self = this;
            $poster.addClass(self.posterFrameHiddenClass);
            if (!self.supportsTransitions) {
                $poster.fadeOut(300);
            }
        },

        showPosterFrame: function($poster) {
            var self = this;
            $poster.removeClass(self.posterFrameHiddenClass);
            if (!self.supportsTransitions) {
                $poster.fadeIn(300);
            }
        },

        getIframePlayer: function(id, parent, parentId) {
            var self = this;
            var src = self._domain + src + self._settings;
            var iframe = document.createElement("iframe");
            iframe.src = self._domain + id + self._settings;
            iframe.width = "100%";
            iframe.id = parentId;
            iframe.className = this.className;
            return $(iframe);
        },

        stopVideo: function(parentId) {
            var self = this;
            var $parent = $("[data-quicktube=\"" + parentId + "\"]");
            var frame = $parent.find("iframe");
            var func = "pauseVideo";

            this.jamesPlayer.pauseVideo();
            $parent.removeClass(self.activeClass).addClass(self.pausedClass);
            self.showPosterFrame($parent.find("[data-quicktube-poster]"));
            $parent.data("video-playing", false);
            self._players[parentId] = false;
            $(window).trigger("quicktube:pause", parentId, $parent);
        }
    };
    return QT;
})();