const Quicktube = require('./quicktube');

// Mocks for YouTube iframe API.
let playerEvents;
const mockPlayer = {
    playVideo: jest.fn(),
    pauseVideo: jest.fn(),
};

const mockVimeoPlayer = {
    play: jest.fn(),
    getVideoTitle: jest.fn(),
};

window.YT = {
    PlayerState: {
        BUFFERING: 3,
        CUED: 5,
        ENDED: 0,
        PAUSED: 2,
        PLAYING: 1,
        UNSTARTED: -1,
    },
    // Mock the YT.Player API, return a mock player object and store events.
    Player: jest.fn((playerId, config) => {
        playerEvents = config.events;
        return mockPlayer;
    }),
};

window.Vimeo = {
    // Mock the Vimeo.Player API, return a mock player object and store events.
    Player: jest.fn((playerId) => {
        return mockVimeoPlayer;
    }),
};

// Mock for Google Analytics.
window.ga = jest.fn();

const mockHTML = `
<script></script>
<div class="quicktube" data-quicktube="k6QanQUaDOo" data-quicktube-platform="youtube">
    <div class="quicktube__video" data-quicktube-video></div>
    <div data-quicktube-play="k6QanQUaDOo" class="quicktube__poster" data-quicktube-poster>
        <button class="quicktube__play quicktube__btn">
            Play
        </button>
    </div>
</div>
`;

const mockAnalyticsHtml = `
<script></script>
<div class="quicktube" data-quicktube="k6QanQUaDOo" data-quicktube-platform="youtube" data-quicktube-options='{"trackAnalytics": true}'>
    <div class="quicktube__video" data-quicktube-video></div>
    <div data-quicktube-play="k6QanQUaDOo" class="quicktube__poster" data-quicktube-poster>
        <button class="quicktube__play quicktube__btn">
            Play
        </button>
    </div>
</div>
`;

const mockVimeoHTML = `
<script></script>
<div class="quicktube" data-quicktube="76979871" data-quicktube-platform="vimeo">
    <div class="quicktube__video" data-quicktube-video></div>
    <div data-quicktube-play="76979871" class="quicktube__poster" data-quicktube-poster>
        <button class="quicktube__play quicktube__btn">
            Play
        </button>
    </div>
</div>
`;

const simulateEvent = (selector, type, data = {}) => {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    const event = document.createEvent('Events');
    event.initEvent(type, true, false);

    el.dispatchEvent(Object.assign(event, data));
};

describe('Quicktube', () => {
    document.body.innerHTML = mockHTML;
    const loadedHTML = document.body.innerHTML;

    describe.skip('onYouTubeIframeAPIReady', () => {
        it('exists', () => {
            expect(window.onYouTubeIframeAPIReady).toBeDefined();
        });

        it('initialises on page ready', () => {
            document.body.innerHTML = loadedHTML;
            window.onYouTubeIframeAPIReady();
            simulateEvent(document, 'DOMContentLoaded');
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    });

    describe('init', () => {
        beforeEach(() => {
            document.body.innerHTML = loadedHTML;
        });

        it('default options', () => {
            const players = Quicktube.init();
            expect(players[0].options).toMatchSnapshot();
        });

        it('Analytics on', () => {
            document.body.innerHTML = mockAnalyticsHtml;
            const players = Quicktube.init();
            expect(players[0].options).toMatchSnapshot();
        });

        it('Custom state classes', () => {
            document.body.innerHTML = `
            <script></script>
            <div class="quicktube" data-quicktube="k6QanQUaDOo" data-quicktube-platform="youtube" data-quicktube-options='{"trackAnalytics": true, "activeClass": "is-playing", "pausedClass": "is-paused", "posterFrameHiddenClass": "is-hidden"}'>
                <div class="quicktube__video" data-quicktube-video></div>
                <div data-quicktube-play="k6QanQUaDOo" class="quicktube__poster" data-quicktube-poster>
                    <button class="quicktube__play quicktube__btn">
                        Play
                    </button>
                </div>
            </div>
            `;
            const players = Quicktube.init();
            expect(players[0].options).toMatchSnapshot();
        });

        it('Is vimeo', () => {
            document.body.innerHTML = mockVimeoHTML;
            const players = Quicktube.init();
            expect(players[0].options).toMatchSnapshot();
        });
    });

    describe('play', () => {
        beforeEach(() => {
            document.body.innerHTML = loadedHTML;
        });

        it('click', () => {
            const players = Quicktube.init();
            simulateEvent('[data-quicktube-play]', 'click');
            expect(document.body.innerHTML).toMatchSnapshot();
            expect(players[0].quicktubePlayer).toBe(mockPlayer);
        });

        it('click and isVimeo', () => {
            document.body.innerHTML = mockVimeoHTML;
            const players = Quicktube.init();
            simulateEvent('[data-quicktube-play]', 'click');
            expect(document.body.innerHTML).toMatchSnapshot();
            expect(players[0].quicktubePlayer).toBe(mockVimeoPlayer);
        });

        it('Click but already has iframe', () => {
            document.body.innerHTML = `
            <script src="https://www.youtube.com/iframe_api"></script><script></script>
            <div class="quicktube" data-quicktube="k6QanQUaDOo" data-quicktube-platform="youtube">
                <div class="quicktube__video" data-quicktube-video="">
                    <iframe src="https://www.youtube.com/embed/k6QanQUaDOo?autoplay=1&amp;showInfo=0&amp;autohide=1&amp;color=white&amp;playerapi=ytplayer&amp;enablejsapi=1&amp;wmode=transparent" width="100%" class="quicktube__iframe"></iframe>
                </div>
                <div data-quicktube-play="k6QanQUaDOo" class="quicktube__poster" data-quicktube-poster="">
                    <button class="quicktube__play quicktube__btn">
                        Play
                    </button>
                </div>
            </div>
            `;
            Quicktube.init();
            simulateEvent('[data-quicktube-play]', 'click');
            expect(document.body.innerHTML).toMatchSnapshot();
        });

        it('keydown wrong key', () => {
            Quicktube.init();
            simulateEvent('[data-quicktube-play]', 'keydown', { keyCode: 50 });
            expect(document.body.innerHTML).toMatchSnapshot();
        });

        it('keydown correct key', () => {
            const players = Quicktube.init();
            simulateEvent('[data-quicktube-play]', 'keydown', { keyCode: 13 });
            expect(document.body.innerHTML).toMatchSnapshot();
            expect(players[0].quicktubePlayer).toBe(mockPlayer);
        });
    });

    describe.skip('play iOS', () => {
        beforeEach(() => {
            document.body.innerHTML = loadedHTML;
            navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1';
            Quicktube.init();
        });

        it('click', () => {
            simulateEvent('[data-quicktube-play]', 'click');
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    });

    describe.skip('YT Player events', () => {
        beforeEach(() => {
            document.body.innerHTML = loadedHTML;
            simulateEvent('[data-quicktube-play]', 'click');
            ga.mockClear();
            mockPlayer.pauseVideo.mockClear();
        });

        describe('onReady', () => {
            it('not playing - resume video', () => {
                const playVideo = jest.fn();
                playerEvents.onReady({ target: { playVideo } });
                expect(playVideo).toHaveBeenCalled();
            });

            it('playing - stop video', () => {
                const playVideo = jest.fn();
                playerEvents.onReady({ target: { playVideo } });
                expect(playVideo).toHaveBeenCalled();
                Quicktube.stopVideo('kittens');
                expect(mockPlayer.pauseVideo).toHaveBeenCalled();
            });
        });

        describe('onStateChange', () => {
            it('PLAYING', () => {
                playerEvents.onStateChange({
                    target: {
                        getVideoData: jest.fn(() => ({ title: 'test title' })),
                    },
                    data: YT.PlayerState.PLAYING,
                });
                expect(document.body.innerHTML).toMatchSnapshot();
                expect(ga.mock.calls[0]).toMatchSnapshot();
            });

            describe('PLAYING monitoring', () => {
                it('still PLAYING 0%', () => {
                    jest.useFakeTimers();
                    playerEvents.onStateChange({
                        target: {
                            getVideoData: jest.fn(() => ({ title: 'test title' })),
                            getPlayerState: jest.fn(() => YT.PlayerState.PLAYING),
                            getDuration: jest.fn(() => 100),
                            getCurrentTime: jest.fn(() => 0),
                        },
                        data: YT.PlayerState.PLAYING,
                    });
                    jest.runOnlyPendingTimers();
                    expect(ga.mock.calls[1]).toMatchSnapshot();
                });

                it('still PLAYING 25%', () => {
                    jest.useFakeTimers();
                    playerEvents.onStateChange({
                        target: {
                            getVideoData: jest.fn(() => ({ title: 'test title' })),
                            getPlayerState: jest.fn(() => YT.PlayerState.PLAYING),
                            getDuration: jest.fn(() => 100),
                            getCurrentTime: jest.fn(() => 25),
                        },
                        data: YT.PlayerState.PLAYING,
                    });
                    jest.runOnlyPendingTimers();
                    expect(ga.mock.calls[1]).toMatchSnapshot();
                });

                it('still PLAYING 50%', () => {
                    jest.useFakeTimers();
                    playerEvents.onStateChange({
                        target: {
                            getVideoData: jest.fn(() => ({ title: 'test title' })),
                            getPlayerState: jest.fn(() => YT.PlayerState.PLAYING),
                            getDuration: jest.fn(() => 100),
                            getCurrentTime: jest.fn(() => 50),
                        },
                        data: YT.PlayerState.PLAYING,
                    });
                    jest.runOnlyPendingTimers();
                    expect(ga.mock.calls[1]).toMatchSnapshot();
                });

                it('still PLAYING 100%', () => {
                    jest.useFakeTimers();
                    playerEvents.onStateChange({
                        target: {
                            getVideoData: jest.fn(() => ({ title: 'test title' })),
                            getPlayerState: jest.fn(() => YT.PlayerState.PLAYING),
                            getDuration: jest.fn(() => 100),
                            getCurrentTime: jest.fn(() => 50),
                        },
                        data: YT.PlayerState.PLAYING,
                    });
                    jest.runOnlyPendingTimers();
                    expect(ga.mock.calls[1]).toMatchSnapshot();
                });
            });

            it('PAUSED', () => {
                playerEvents.onStateChange({
                    target: {
                        getVideoData: jest.fn(() => ({ title: 'test title' })),
                    },
                    data: YT.PlayerState.PAUSED,
                });
                expect(document.body.innerHTML).toMatchSnapshot();
                expect(ga.mock.calls[0]).toMatchSnapshot();
            });

            it('ENDED', () => {
                playerEvents.onStateChange({
                    target: {
                        getVideoData: jest.fn(() => ({ title: 'test title' })),
                    },
                    data: YT.PlayerState.ENDED,
                });
                expect(document.body.innerHTML).toMatchSnapshot();
                expect(mockPlayer.pauseVideo).toHaveBeenCalled();
            });
        });

        it('onError', () => {
            playerEvents.onError({ target: { src: 'test src' }, data: 'test data' });
            expect(ga.mock.calls[0]).toMatchSnapshot();
        });
    });
});
