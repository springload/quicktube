# Quicktube [![npm](https://img.shields.io/npm/v/quicktube.svg?style=flat-square)](https://www.npmjs.com/package/quicktube) [![Build Status](https://travis-ci.org/springload/Quicktube.js.svg?branch=master)](https://travis-ci.org/springload/Quicktube.js) [![Coverage Status](https://coveralls.io/repos/github/springload/Quicktube.js/badge.svg)](https://coveralls.io/github/springload/Quicktube.js)

> A lightweight responsive YouTube player. [Demo](https://rawgit.com/springload/Quicktube.js/master/index.html)

## Installation

```sh
npm install --save quicktube
```

## Usage

### Initial setup

Is really simple. Just add the video ID to `data-quicktube='{video-id}'`

```html
<div class="quicktube" data-quicktube="k6QanQUaDOo">
    <div class="quicktube__video" data-quicktube-video>
    </div>
    <div class="quicktube__poster" data-quicktube-play data-quicktube-poster>
        <div class="quicktube__play quicktube__btn">
            Play
        </div>
    </div>
</div>
```

Initialise quicktube.

```javascript
import quicktube from 'quicktube';

document.addEventListener('DOMContentLoaded', () => {
    quicktube();
}, false);
```

>:warning: Don't forget to include the [necessary CSS](https://github.com/springload/Quicktube.js/blob/master/quicktube.css).

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

> Clone the project on your computer, and install [Node](https://nodejs.org). This project also uses [nvm](https://github.com/springload/frontend-starter-kit/blob/master/docs/useful-tooling.md#nvm).

```sh
nvm install
# Then, install all project dependencies.
npm install
```

### Publish

```sh
git release vx.y.z
# Use irish-pub to check the package content. Install w/ npm install -g first.
irish-pub
npm publish
```
