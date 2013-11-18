# QuickTube.js

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

Initialise QuickTube once jQuery is ready.

```javascript
$(document).ready(function() {
    QuickTube.init();
});
```

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
