const { mix } = require('laravel-mix');

mix.js('src/entry/index.js', 'public/webpush-lib.js')
    .copy('src/assets/*', 'public');