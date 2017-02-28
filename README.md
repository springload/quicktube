# Quicktube

> A lightweight responsive YouTube player using `window.postMessage`. [Demo](https://rawgit.com/springload/Quicktube.js/master/index.html)

## Installation

```sh
npm install --save quicktube
```

## Usage

### Initial setup

Is really simple. Just add the video ID to `data-quicktube-video='{video-id}'`

```html
<div class="quicktube" data-quicktube="kittens">
    <div class="quicktube__video" data-quicktube-video="k6QanQUaDOo">
    </div>
    <div data-quicktube-play="kittens" class="quicktube__poster" data-quicktube-poster>
        <div class="quicktube__play quicktube__btn">
            Play
        </div>
    </div>
</div>
```

Initialise Quicktube once jQuery is ready.

```js
import quicktube from 'quicktube';
import $ from 'jquery';

$(document).ready(function() {
    quicktube.init();
});
```

>:warning: Don't forget to include the [necessary CSS](https://github.com/springload/Quicktube.js/blob/master/quicktube.css).

### API

You can hook to the `play` and `pause` events like this:

```js
$(window).on("quicktube:play", function(quicktubeId, $quicktubeEl) {
    $("[data-show-while-playing]").show();
});

$(window).on("quicktube:pause", function(quicktubeId, $quicktubeEl) {
    $("[data-show-while-playing]").hide();
});
```
