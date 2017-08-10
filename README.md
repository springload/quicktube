# [Quicktube](https://springload.github.io/quicktube/) [![npm](https://img.shields.io/npm/v/quicktube.svg?style=flat-square)](https://www.npmjs.com/package/quicktube) [![Build Status](https://travis-ci.org/springload/quicktube.svg?branch=master)](https://travis-ci.org/springload/quicktube) [![Coverage Status](https://coveralls.io/repos/github/springload/quicktube/badge.svg)](https://coveralls.io/github/springload/quicktube)

> A lightweight embed video player, with support for YouTube and Vimeo. Check out our [online demo](https://springload.github.io/quicktube/)!

## Usage

```sh
npm install --save quicktube
```

### Initial setup

Is really simple. Just add the video ID to `data-quicktube='{video-id}'` and `data-quicktube-play='{video-id}'` to the play trigger element.

```html
<div class="quicktube" data-quicktube="k6QanQUaDOo">
    <div class="quicktube__video" data-quicktube-video></div>
    <div data-quicktube-play="k6QanQUaDOo" class="quicktube__poster" data-quicktube-poster>
        <!-- Optional poster frame image -->
        <img class="quicktube__poster-image" src="/path/to/image" />
        <button class="quicktube__play quicktube__btn">
            Play
        </button>
    </div>
</div>
```

Initialise quicktube.

```javascript
import quicktube from 'quicktube';

document.addEventListener('DOMContentLoaded', () => {
    quicktube.init();
}, false);
```

>:warning: Don't forget to include the [necessary CSS](https://github.com/springload/quicktube/blob/master/quicktube.css), as well as the required [polyfills](https://github.com/springload/quicktube/blame/master/examples/utils/polyfills.js) should your environment require it.

### API

You can hook to the `play` and `pause` events like this:

```js
window.addEventListener('quicktube:play', () => {
    showingItem.style.display = 'block';
}, false);

window.addEventListener('quicktube:pause', () => {
    showingItem.style.display = 'none';
}, false);
```

## Development

### Install

> Clone the project on your computer, and install [Node](https://nodejs.org). This project also uses [nvm](https://github.com/creationix/nvm).

```sh
nvm install
# Then, install all project dependencies.
npm install
```


### Releases

- Make a new branch for the release of the new version.
- Update the [CHANGELOG](CHANGELOG.md).
- Update the version number in `package.json`, following semver.
- Make a PR and squash merge it.
- Back on master with the PR merged, follow the instructions below.

```sh
npm run dist
# Use irish-pub to check the package content. Install w/ npm install -g first.
irish-pub
npm publish
```

- Finally, go to GitHub and create a release and a tag for the new version.
- Done!


## Documentation

- [Vimeo Player API](https://github.com/vimeo/player.js)
- [YouTube iFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
