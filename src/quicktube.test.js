// Mock for Google Analytics.
const ga = jest.fn();

// Mocks for YouTube iframe API.
let playerEvents;
const mockPlayer = {
    playVideo: jest.fn(),
    pauseVideo: jest.fn(),
};

const YT = {
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

// Mock for
window.ga = ga;
window.YT = YT;

const mockHTML = `
<script></script>
<div class="quicktube" data-quicktube="k6QanQUaDOo">
    <div class="quicktube__video quicktube__video--paused" data-quicktube-video></div>
    <div data-quicktube-play="k6QanQUaDOo" class="quicktube__poster" data-quicktube-poster>
        <div class="quicktube__play quicktube__btn" tabindex="0">
            Play
        </div>
    </div>
</div>
<div data-quicktube-stop="k6QanQUaDOo">Stop button</div>
`;

const simulateEvent = (selector, type, data = {}) => {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    const event = document.createEvent('Events');
    event.initEvent(type, true, false);

    el.dispatchEvent(Object.assign(event, data));
};

describe('Quicktube', () => {
    document.body.innerHTML = mockHTML;
    const Quicktube = require('./quicktube');
    const loadedHTML = document.body.innerHTML;

    it('exists', () => {
        expect(Quicktube).toBeDefined();
    });

    it('loaded', () => {
        expect(document.body.innerHTML).toMatchSnapshot();
    });

    describe('onYouTubeIframeAPIReady', () => {
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
        it('default options', () => {
            Quicktube.init();
            expect(Quicktube.options).toEqual({
                trackAnalytics: false,
                activeClass: 'quicktube--playing',
                pausedClass: 'quicktube--paused',
                posterFrameHiddenClass: 'quicktube__poster--hidden',
                showInfo: 0,
                autohide: 1,
                color: 'white',
                wmode: 'transparent',
            });
        });

        it('custom options', () => {
            Quicktube.init({ trackAnalytics: true });
            expect(Quicktube.options).toEqual({
                trackAnalytics: true,
                activeClass: 'quicktube--playing',
                pausedClass: 'quicktube--paused',
                posterFrameHiddenClass: 'quicktube__poster--hidden',
                showInfo: 0,
                autohide: 1,
                color: 'white',
                wmode: 'transparent',
            });
        });
    });

    describe('play', () => {
        beforeEach(() => {
            document.body.innerHTML = loadedHTML;
            // const quicktube = Quicktube.init({ trackAnalytics: true });
        });

        it('click', () => {
            simulateEvent('[data-quicktube-play]', 'click');
            expect(document.body.innerHTML).toMatchSnapshot();
            expect(Quicktube.quicktubePlayer).toBe(mockPlayer);
        });

        it('keydown wrong key', () => {
            simulateEvent('[data-quicktube-play]', 'keydown', { keyCode: 50 });
            expect(document.body.innerHTML).toMatchSnapshot();
        });

        it('keydown right key', () => {
            simulateEvent('[data-quicktube-play]', 'keydown', { keyCode: 13 });
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    });

    describe('stop', () => {
        beforeEach(() => {
            document.body.innerHTML = loadedHTML;
            // const quicktube = Quicktube.init({ trackAnalytics: true });
        });

        it('click', () => {
            simulateEvent('[data-quicktube-stop]', 'click');
            expect(document.body.innerHTML).toMatchSnapshot();
            expect(Quicktube.quicktubePlayer).toBe(mockPlayer);
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

    describe('YT Player events', () => {
        beforeEach(() => {
            document.body.innerHTML = loadedHTML;
            // const quicktube = Quicktube.init({ trackAnalytics: true });
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
                            // lastP: '',
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
                            // lastP: '',
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
                            // lastP: '',
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
                            // lastP: '',
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
