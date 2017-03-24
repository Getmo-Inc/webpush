export default class {

    constructor(baseUrl) {
        this.baseUrl = baseUrl || window.location.href;
    }

    _createAbsoluteUrl(value) {
        let url = '',
            templateRootUrlExec = null;
        if (!value) {
            return;
        }
        if (!value.match('^https?:\/\/')) {
            if (value[0] === '/') {
                templateRootUrlExec = /^((https?:\/\/(.+?))\/)/i.exec(this.baseUrl);
                if (templateRootUrlExec && templateRootUrlExec[2]) {
                    url = templateRootUrlExec[2] + value;
                }
            } else {
                templateRootUrlExec = /^(https?:\/\/(.+)\/)/i.exec(this.baseUrl);
                if (templateRootUrlExec && templateRootUrlExec[1]) {
                    url = templateRootUrlExec[1] + value;
                }
            }
        } else {
            url = value;
        }
        return url;
    }

    _makeBase64OfImage(img) {
        let canvas = window.document.createElement("canvas"),
            context = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
        return canvas.toDataURL("image/png");
    }

    _loadImageBase64FromUrl(url) {
        let that = this,
            image,
            interval,
            counter;

        return new Promise(function (resolve, reject) {
            image = new window.Image();
            image.addEventListener('load', function (e) {
                clearInterval(interval);
                resolve(that._makeBase64OfImage(this));
                e.stopPropagation();
                //this.removeEventListener('load');
            }, true);
            image.addEventListener('error', function (e) {
                clearInterval(interval);
                reject(e);
                e.stopPropagation();
                //this.removeEventListener('error');
            }, true);
            image.src = that._createAbsoluteUrl(url);

            interval = setInterval(function () {
                if (counter > 150) {
                    clearInterval(interval);
                    reject('_loadImageBase64FromUrl() Timeout!');
                }
                counter = counter + 1;
            }, 100);
        });
    }

    _loadStylesForTemplate(tempDocument) {
        let that = this,
            cssContent = [],
            cssTags = tempDocument.getElementsByTagName('link'),
            counter = 0,
            interval = null,
            i,
            x,
            href,
            urlMatch,
            value,
            cssUrl;

        return new Promise(function (resolve, reject) {
            for (i = 0; i < cssTags.length; i++) {
                if (cssTags[i].rel !== 'stylesheet') {
                    cssContent.push('');
                    continue;
                }
                href = cssTags[i].href;
                if (href) {
                    href = that._createAbsoluteUrl(href);
                    window.fetch(href).then(function (response) {
                        response.text().then(function (result) {
                            urlMatch = result.match(/url\s?\((["']?)(.+\.(png|jpg|gif|jpeg){1})\1?\)/ig);
                            if (urlMatch) {
                                for (x = 0; x < urlMatch.length; x++) {
                                    value = /url\s?\((["']?)(.+\.(png|jpg|gif|jpeg){1})\1?\)/ig.exec(urlMatch[x]);
                                    if (value && value[2]) {
                                        cssUrl = that._createAbsoluteUrl(value[2]);
                                        if (cssUrl) {
                                            result = result.replace(urlMatch[x], 'url(\'' + cssUrl + '\')');
                                        }
                                    }
                                }
                            }
                            cssContent.push(result);
                        }, function () {
                            cssContent.push('');
                        });
                    }, function (e) {
                        console.error('fetch error', e);
                        cssContent.push('');
                    });
                } else {
                    cssContent.push('');
                }
            }
            interval = setInterval(function () {
                if (cssContent.length >= cssTags.length) {
                    let style = window.document.createElement("style");
                    style.innerHTML = cssContent.join(' ');
                    tempDocument.head.appendChild(style);
                    while (cssTags[0]) {
                        cssTags[0].parentNode.removeChild(cssTags[0]);
                    }
                    clearInterval(interval);
                    resolve(tempDocument);
                } else {
                    if (counter > 150) {
                        console.error('cssTags', cssTags);
                        console.error('cssContent', cssContent);
                        clearInterval(interval);
                        reject('_loadStylesForTemplate() Timeout!');
                    }
                    counter = counter + 1;
                }
            }, 100);
        });
    }

    _loadImagesForTemplate(tempDocument) {
        let that = this,
            imagesContent = [],
            imagesTags = tempDocument.getElementsByTagName('img'),
            counter = 0,
            interval = null,
            src,
            imageUrl,
            image,
            i,
            x;
        return new Promise(function (resolve, reject) {
            for (i = 0; i < imagesTags.length; i++) {
                if (!imagesTags[i].src) {
                    src = /src="((.+?)\.(jpg|jpeg|gif|png))"/gi.exec(imagesTags[i].outerHTML);
                    if (src && src[1]) {
                        imageUrl = that._createAbsoluteUrl(src[1]);
                        if (imageUrl) {
                            imagesTags[i].src = imageUrl;
                        }
                    } else {
                        continue;
                    }
                }
                image = new window.Image();
                image.addEventListener('load', function (e) {
                    imagesContent[this.id] = that._makeBase64OfImage(this);
                    e.stopPropagation();
                    //this.removeEventListener('load');
                }, true);
                image.addEventListener('error', function (e) {
                    imagesContent[this.id].base64 = 'false';
                    e.stopPropagation();
                    //this.removeEventListener('error');
                }, true);
                image.id = i;
                image.src = imagesTags[i].src;
            }
            interval = setInterval(function () {
                if (imagesContent.length >= imagesTags.length) {
                    for (x = 0; x < imagesTags.length; x++) {
                        imagesTags[x].src = imagesContent[x];
                    }
                    clearInterval(interval);
                    resolve(tempDocument);
                } else {
                    if (counter > 150) {
                        console.error('imagesContent', imagesContent);
                        console.error('imagesTags', imagesTags);
                        clearInterval(interval);
                        reject('_loadImagesForTemplate() Timeout!');
                    }
                    counter = counter + 1;
                }
            }, 100);
        });
    }

    _loadImagesFromStylesForTemplate (tempDocument) {
        let that = this,
            cssImagesContent = {},
            html = tempDocument.head.outerHTML + tempDocument.body.outerHTML,
            urlMatch = html.match(/url\s?\((["']?)(.+\.(png|jpg|gif|jpeg){1})\1?\)/ig),
            counter = 0,
            interval = null,
            i,
            prop1,
            prop2,
            prop3,
            value,
            cssImageUrl,
            image,
            loaded = true,
            newUrl;

        return new Promise(function (resolve, reject) {
            if (urlMatch) {

                for (i = 0; i < urlMatch.length; i++) {
                    value = /url\s?\((["']?)(.+\.(png|jpg|gif|jpeg){1})\1?\)/ig.exec(urlMatch[i]);
                    if (value && value[2]) {
                        cssImageUrl = that._createAbsoluteUrl(value[2]);
                        if (cssImageUrl) {
                            cssImagesContent[cssImageUrl] = {'$1': value[1], '$2': value[2], base64: ''};
                        }
                    }
                }

                for (prop1 in cssImagesContent) {
                    if (cssImagesContent.hasOwnProperty(prop1)) {
                        image = new window.Image();
                        image.addEventListener('load', function (e) {
                            cssImagesContent[this.id].base64 = that._makeBase64OfImage(this);
                            e.stopPropagation();
                            //this.removeEventListener('load');
                        }, true);
                        image.addEventListener('error', function (e) {
                            cssImagesContent[this.id].base64 = 'false';
                            e.stopPropagation();
                            //this.removeEventListener('error');
                        }, true);
                        image.id = prop1;
                        image.src = prop1;
                    }
                }
                interval = setInterval(function () {
                    for (prop2 in cssImagesContent) {
                        if (cssImagesContent.hasOwnProperty(prop2)) {
                            if (!cssImagesContent[prop2].base64) {
                                loaded = false;
                            }
                        }
                    }
                    if (loaded) {
                        for (prop3 in cssImagesContent) {
                            if (cssImagesContent.hasOwnProperty(prop3)) {
                                if (cssImagesContent[prop3].base64 !== 'false') {
                                    newUrl = '';
                                    if (!cssImagesContent[prop3].$1) {
                                        newUrl = "'" + cssImagesContent[prop3].base64 + "'";
                                    } else {
                                        newUrl = cssImagesContent[prop3].base64;
                                    }
                                    html = html.replace(prop3, newUrl).replace(cssImagesContent[prop3].$2, newUrl);
                                }
                            }
                        }
                        clearInterval(interval);
                        resolve(new window.DOMParser().parseFromString('<!DOCTYPE html>' + html, 'text/html'));
                    } else {
                        if (counter > 150) {
                            console.error('cssImagesContent', cssImagesContent);
                            clearInterval(interval);
                            reject('_loadImagesFromStylesForTemplate() Timeout!');
                        }
                        counter = counter + 1;
                    }
                }, 100);
            } else {
                resolve(tempDocument);
            }
        });
    }

    _cleanAndPrepareHtml(html) {
        let that = this;
        return new Promise(function (resolve, reject) {
            let tempDocument = new window.DOMParser().parseFromString(html.replace(/<script.*?>((\n*)?.*?(\n*)?)*?<\/script>/igm, ''), 'text/html');
            that._loadStylesForTemplate(tempDocument).then(function (tempDocument) {
                that._loadImagesForTemplate(tempDocument).then(function (tempDocument) {
                    that._loadImagesFromStylesForTemplate(tempDocument).then(function (tempDocument) {
                        let manifest = window.document.createElement('link');
                        manifest.rel = 'manifest';
                        manifest.href = '/webpush-chrome-manifest.json';
                        tempDocument.head.appendChild(manifest);
                        resolve('<!DOCTYPE html><html>' + tempDocument.head.outerHTML + tempDocument.body.outerHTML + '</html>');
                    }, function (e) {
                        reject(e);
                    });
                }, function (e) {
                    reject(e);
                });
            }, function (e) {
                reject(e);
            });
        });
    }

}