const jQuery = require('jquery');

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
    Player: jest.fn(function(playerId, config) {
        playerEvents = config.events;
        return mockPlayer;
    }),
};

// Mock for
window.$ = jQuery;
window.ga = ga;
window.YT = YT;

const mockHTML = `
<script></script>
<div class="quicktube" data-quicktube="kittens">
    <div class="quicktube__video quicktube__video--paused" data-quicktube-video="k6QanQUaDOo">
    </div>
    <div data-quicktube-play="kittens"  class="quicktube__poster" data-quicktube-poster>
        <div class="quicktube__play quicktube__btn">
            Play
        </div>
    </div>
</div>
<div data-quicktube-stop="">Stop button</div>
`;

const simulateEvent = (selector, type, data = {}) => {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    const event = document.createEvent('Events');
    event.initEvent(type, true, false);

    el.dispatchEvent(Object.assign(event, data));
};

describe('Quicktube', () => {
    let loadedHTML;

    document.body.innerHTML = mockHTML;
    const Quicktube = require('./quicktube');
    loadedHTML = document.body.innerHTML;

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
        beforeEach(() => {
            document.body.innerHTML = loadedHTML;
        });

        it('default options', () => {
            expect(Quicktube.init()).toMatchSnapshot();
            expect(document.body.innerHTML).toMatchSnapshot();
        });

        it('custom options', () => {
            expect(Quicktube.init({ trackAnalytics: true })).toMatchSnapshot();
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    });

    describe('play', () => {
        let quicktube;

        beforeEach(() => {
            document.body.innerHTML = loadedHTML;
            quicktube = Quicktube.init({ trackAnalytics: true });
        });

        it('click', () => {
            simulateEvent('[data-quicktube-play]', 'click');
            expect(document.body.innerHTML).toMatchSnapshot();
            expect(quicktube.jamesPlayer).toBe(mockPlayer);
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
        let quicktube;

        beforeEach(() => {
            document.body.innerHTML = loadedHTML;
            quicktube = Quicktube.init({ trackAnalytics: true });
        });

        it('click', () => {
            simulateEvent('[data-quicktube-stop]', 'click');
            expect(document.body.innerHTML).toMatchSnapshot();
            expect(quicktube.jamesPlayer).toBe(mockPlayer);
        })
    });

    describe.skip('play iOS', () => {
        beforeEach(() => {
            document.body.innerHTML = loadedHTML;
            navigator.userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1";
            Quicktube.init();
        });

        it('click', () => {
            simulateEvent('[data-quicktube-play]', 'click');
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    });

    // TODO Check QT.supportsTransition false.
    describe.skip('no transitions', () => {
        it('click', () => {});
    });

    describe('YT Player events', () => {
        let quicktube;

        beforeEach(() => {
            document.body.innerHTML = loadedHTML;
            quicktube = Quicktube.init({ trackAnalytics: true });
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
                playVideo.mockClear();
                playerEvents.onReady({ target: { playVideo } });
                expect(playVideo).not.toHaveBeenCalled();
                expect(mockPlayer.pauseVideo).toHaveBeenCalled();
            });
        });

        describe('onStateChange', () => {
            it('PLAYING', () => {
                playerEvents.onStateChange({
                    target: {
                        getVideoData: jest.fn(() => ({ title: 'test title' })),
                    },
                    data: YT.PlayerState.PLAYING
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
                        data: YT.PlayerState.PLAYING
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
                        data: YT.PlayerState.PLAYING
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
                        data: YT.PlayerState.PLAYING
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
                        data: YT.PlayerState.PLAYING
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
                    data: YT.PlayerState.PAUSED
                });
                expect(document.body.innerHTML).toMatchSnapshot();
                expect(ga.mock.calls[0]).toMatchSnapshot();
            });

            it('ENDED', () => {
                playerEvents.onStateChange({
                    target: {
                        getVideoData: jest.fn(() => ({ title: 'test title' })),
                    },
                    data: YT.PlayerState.ENDED
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
