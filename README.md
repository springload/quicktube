# QuickTube.js

> [Demo](https://rawgit.com/springload/Quicktube.js/master/index.html)

### Setup
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

Initialise quicktube once jQuery is ready.

```javascript
$(document).ready(function() {
    quicktube.init();
});
```

Using ES6 and a module bundler:

```
npm install --save quicktube
```

```javascript
import quicktube from 'quicktube';
import $ from 'jquery';

$(document).ready(function() {
    quicktube.init();
});
```

>:warning: Don't forget to include the [necessary CSS](https://github.com/springload/Quicktube.js/blob/master/quicktube.css).

### API

You can hook to the `play` and `pause` events like this:

```javascript
    $(window).on("quicktube:play", function(quicktubeId, $quicktubeEl) {
        $("[data-show-while-playing]").show();
    });

    $(window).on("quicktube:pause", function(quicktubeId, $quicktubeEl) {
        $("[data-show-while-playing]").hide();
    });

```
