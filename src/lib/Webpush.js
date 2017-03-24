// function initialiseUI() {
//     // Set the initial subscription value
//     swRegistration.pushManager.getSubscription()
//         .then(function(subscription) {
//             isSubscribed = !(subscription === null);
//
//             if (isSubscribed) {
//                 console.log('User IS subscribed.');
//             } else {
//                 console.log('User is NOT subscribed.');
//             }
//
//             updateBtn();
//         });
// }


import Events from '../helpers/Events';
import Support from '../helpers/Support';
import Params from '../helpers/Params';

export default class {

    constructor(version, endpoint) {
        this.version = version;
        this.endpoint = endpoint;

        this.events = new Events();
        this.support = new Support();
        this.params = new Params();

        this.platform = this.support.getPlatform();

        this.control = {
            hasSetup: false,
            eventForPostMassageIsListening: false,
            register: {
                tries: 0,
                waitInSeconds: 10,
                maxTimeoutInMinutes: 1
            }
        };

        this.registerEndPoint = endpoint + '/device';
        this.optOutEndPoint = endpoint + '/device/optout';
        this.tagEndPoint = endpoint + '/tag';
        this.notificationEndPoint = endpoint + '/notifications';
        this.safariEndPoint = endpoint + '/safari';
    }

    _encodeParams(data) {
        let key,
            query = [];
        if (typeof data === 'object') {
            for (key in data) {
                if (data.hasOwnProperty(key)) {
                    query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
                }
            }
            return query.join('&');
        }
        if (typeof data === 'string') {
            return data;
        }
        console.error('Parameters cannot be parsed. Use "object" or a url encoded "string". Unknown type...', typeof data);
        return false;
    }

    _request(url, data, method) {
        let params = this._encodeParams(data);
        return new Promise(function (resolve, reject) {
            if (!url || typeof data !== 'object') {
                reject('URL: ' + url + ' | DATA: ' + data);
                return false;
            }
            if (!method) {
                method = 'POST';
            } else {
                data._method = method;
                method = 'POST';
            }
            window.fetch(url, {
                method: method,
                headers: {
                    'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: params
            }).then(function (result) {
                result.json().then(function (json) {
                    resolve(json);
                }, function (e) {
                    reject(e);
                });
            }, function (e) {
                reject(e);
            });
        });
    }

    _initializeServiceWorker() {

        return new Promise((resolve, reject) => {

            window.navigator.serviceWorker.register('/service-worker.js', {scope: '/'}).then(() => {

                this._sendMessageToServiceWorker({test: true}).then(() => {

                    resolve()

                }).catch(() => {

                    setTimeout(() => {

                        this._sendMessageToServiceWorker({test: true}).then(() => {

                            resolve()

                        }).catch(() => {

                            reject('Service worker don\'t respond');

                        });

                    }, 250);

                });

            }).catch((error) => {
                if ((error + '').indexOf('Only secure origins are allowed') !== -1) {
                    console.error(error);
                    reject(error);
                } else if ((error + '').indexOf('The operation is insecure') !== -1) {
                    console.error(error);
                    reject(error);
                } else {
                    console.error('Error during registering service worker', error);
                    reject(error);
                }
            });

        });

    }

    _sendMessageToServiceWorker(message) {
        return new Promise(function(resolve, reject) {
            let messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = function(event) {
                if (event.data.error) {
                    reject(event.data.error);
                } else {
                    if (message.test === true && event.data.received === true) {
                        resolve();
                    } else {
                        resolve(event.data);
                    }
                }
            };
            navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
        });
    }

    _getDataFromSubscription(subscription) {
        let data = {}, split, p256dh, auth;

        split = subscription.endpoint.split('/');
        data.regid = split[(split.length-1)];

        try {
            data.endpoint = subscription.endpoint;
            p256dh = subscription.getKey('p256dh');
            auth = subscription.getKey('auth');
            if (p256dh) {
                data.p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(p256dh)));
            }
            if (auth) {
                data.auth = btoa(String.fromCharCode.apply(null, new Uint8Array(auth)));
            }
        } catch (e) {
            console.error(e);
            return false;
        }
        return data;
    }

    _getSubscriptionData(data) {

        let hwid = this.params.get('hwid');
        if (!hwid) {
            hwid = 'null';
        }
        let params = {
            appid: this.params.get('appid'),
            uuid: hwid,
            platform: this.platform,
            regid: data.regid,
            endpoint: data.endpoint,
            p256dh: data.p256dh,
            auth: data.auth,
            device: navigator.userAgent.match(/Chrom(e|ium|eframe)\/([0-9]+)\./i)[0],
            manufacturer: navigator.vendor,
            framework: this.platform === 'CHROME' ? (navigator.platform ? navigator.platform : navigator.oscpu) : (navigator.oscpu ? navigator.oscpu : navigator.platform)
        };

        return this._encodeParams(params);
    }

    checkStatus() {
        return new Promise((resolve, reject) => {
            if (platform === 'CHROME' || platform === 'FIREFOX') {
                switch (Notification.permission) {
                    case 'denied':
                        resolve('denied');
                        break;
                    case 'default':
                        resolve('default');
                        break;
                    case 'granted':

                        this._initializeServiceWorker().then(() => {

                            this._sendMessageToServiceWorker({test: true}).then(() => {

                                window.navigator.serviceWorker.ready.then((registration) => {

                                    registration.pushManager.getSubscription().then((subscription) => {

                                        if (!subscription) {
                                            // do subscribe ??
                                            resolve('default');
                                            return;
                                        }
                                        if (this.params.get('hwid')) {
                                            let data = this._getDataFromSubscription(subscription);
                                            if (!data) {
                                                reject('Cannot get cyphers out of this client!');
                                            }
                                            if (data.regid) {
                                                this.params.set({ regid: data.regid });
                                            }
                                            resolve('granted');
                                        } else {
                                            console.warn('You are not fully registered yet.');
                                            resolve('default');
                                        }
                                    }).catch((e) => {
                                        console.error('Cannot subscribe on GCM at the moment, please try again in 30 seconds.', e);
                                        reject(e);
                                    });
                                }).catch((e) => {
                                    console.error('Service Worker Cannot enter ready state', e);
                                    reject(e);
                                });
                            }).catch((e) => {
                                console.error('Cannot access Service Worker');
                                reject(e);
                            });
                        }).catch((e) => {
                            reject(e);
                        });
                        break;
                    default:
                        reject('Unprocessable permission: ' + Notification.permission);
                }
            } else if (platform === 'SAFARI') {
                let permissionData = window.safari.pushNotification.permission(that.params.get('safariPushID'));
                switch (permissionData.permission) {
                    case 'default':
                        resolve('default');
                        break;
                    case 'denied':
                        resolve('denied');
                        break;
                    case 'granted':
                        if (this.params.get('hwid') && this.params.get('regid')) {
                            resolve('granted');
                        } else {
                            resolve('default');
                        }
                        break;
                    default:
                        reject('Unprocessable permission: ' + permissionData.permission);
                }
            } else {
                reject('Platform isn\'t supported');
            }
        });
    }

    subscribe() {

        return new Promise((resolve, reject) => {

            if (platform === 'CHROME' || platform === 'FIREFOX') {

                this.checkStatus().then((status) => {

                    if (status === 'denied') {
                        reject('denied');
                        return;
                    }
                    // thought about it
                    // if (this.params.get('hwid') && this.params.get('regid') && status === 'granted') {
                    //     resolve(this);
                    //     return;
                    // }

                    Notification.requestPermission((permission) => {

                        if (permission === 'denied') {
                            return reject('denied')
                        }

                        if (permission === 'granted') {

                            navigator.serviceWorker.ready.then((registration) => {

                                registration.pushManager.subscribe({userVisibleOnly: true}).then((subscription) => {

                                    let data = this._getDataFromSubscription(subscription);

                                    fetch(apiEndPoint + '/device', {
                                        method: 'post',
                                        headers: {
                                            'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
                                        },
                                        body: this._getSubscriptionData(data)
                                    }).then((result) => {

                                        if (result.status !== 200) {
                                            console.error('Subscribe API fetch error!');
                                            return reject();
                                        }

                                        result.json().then((json) => {

                                            this.params.set({
                                                hwid: json.hwid,
                                                regid: data.regid,
                                                alias: json.alias
                                            });

                                            this._sendMessageToServiceWorker({
                                                devid: this.params.get('devid'),
                                                appid: this.params.get('appid'),
                                                hwid: json.hwid,
                                            }).then(() => {
                                                resolve(this);
                                            }).catch((e) => {
                                                console.error('Cannot send message to service worker!', e);
                                                reject('error');
                                            });
                                        }).catch((e) => {
                                            console.error('Api return is not a valid JSON.', e);
                                            reject('error')
                                        });
                                    }).catch((e) => {
                                        console.error('subscribe fetch error', e);
                                        reject('error');
                                    });
                                }).catch((e) => {
                                    console.error('Unable to subscribe to push.', e);
                                    reject('error');
                                });
                            });

                        } else {
                            console.error('Unprocessable permission: '+permission);
                            reject('error');
                        }
                    });
                }).catch((e) => {
                    console.error(e);
                    reject('error');
                });

            } else if (platform === 'SAFARI') {

                window.safari.pushNotification.requestPermission(
                    this.safariEndPoint,
                    this.params.get('safariPushID'),
                    {
                        devid: this.params.get('devid'),
                        appid: this.params.get('appid')
                    },
                    (permissionData) => {
                        if (permissionData.permission === 'default') {
                            reject('default');
                        } else if (permissionData.permission === 'granted') {
                            this._request(this.registerEndPoint, {
                                appid: this.params.get('appid'),
                                uuid: 'null',
                                platform: platform,
                                regid: permissionData.deviceToken,
                                device: 'Safari/' + window.navigator.userAgent.match(/Version\/(([0-9]+)(\.|[0-9])+)/i)[1],
                                manufacturer: window.navigator.vendor,
                                framework: window.navigator.platform || window.navigator.oscpu
                            }, 'POST').then((json) => {

                                if (json.code === 200 && json.hwid) {

                                    this.params.set({
                                        hwid: json.hwid,
                                        regid: permissionData.deviceToken,
                                        alias: json.alias
                                    });

                                } else {
                                    console.error(json.message);
                                    reject('error');
                                }
                            }, function (e) {
                                console.error('Cannot register extra data for this device!', e);
                                reject('error');
                            });
                        } else if (permissionData.permission === 'denied') {
                            reject('denied');
                        } else {
                            console.error('Unprocessable permission: '+permissionData.permission);
                            reject('error');
                        }
                    }
                );

            } else {
                reject('Platform isn\'t supported');
            }
        });
    }

    unSubscribe() {
        let that = this;
        return new Promise(function (resolve, reject) {
            that._postMessageToIframe('unsubscribe').then(function (data) {
                switch (data.status) {
                    case 'unsubscribed':
                        that._request(that.registerEndPoint, {
                            devid: that.params.get('devid'),
                            appid: that.params.get('appid'),
                            uuid: that.params.get('hwid')
                        }, 'DELETE').then(function () {
                            that.params.set({
                                regid: null,
                                alias: null
                            });
                            if (that.params.get('templateEndPoint')) {
                                that.control.hasSetup = false;
                            }
                            resolve();
                        }, function (e) {
                            console.error('Cannot un-register this user on DB. It will be removed in next dry-run!', e);
                            reject();
                        });
                        break;
                    case 'unsubscribed-error':
                        reject();
                        break;
                }
            }, function () {
                reject();
            });
        });
    }

    getLastNotifications(dateFormat) {
        let that = this,
            i;
        return new Promise(function (resolve, reject) {
            return that._request(that.notificationEndPoint + '/last', {
                devid: that.params.get('devid'),
                appid: that.params.get('appid'),
                hwid: that.params.get('hwid'),
                regid: that.params.get('regid'),
                platform: that.support.getPlatform(),
                dateFormat: dateFormat || '',
                browserVersion: that.support.getBrowserVersion()
            }, 'POST').then(function (json) {
                for (i = 0; i < json.length; i++) {
                    json[i].payload.icon = (json[i].payload.icon && (json[i].payload.icon + ''.indexOf('http') !== -1)) ? json[i].payload.icon : (that.params.get('setupEndPoint') ? that.params.get('setupEndPoint') : '') + '/lib-default-icon.png';
                }
                resolve(json);
            }, function (e) {
                console.error('Cannot fetch user Notifications', e);
                reject(e);
            });
        });
    };

    getUnreadNotifications(dateFormat) {
        let that = this,
            i;
        return new Promise(function (resolve, reject) {
            return that._request(that.notificationEndPoint + '/unread', {
                devid: that.params.get('devid'),
                appid: that.params.get('appid'),
                hwid: that.params.get('hwid'),
                regid: that.params.get('regid'),
                platform: that.support.getPlatform(),
                dateFormat: dateFormat || '',
                browserVersion: that.support.getBrowserVersion()
            }, 'POST').then(function (json) {
                for (i = 0; i < json.length; i++) {
                    json[i].payload.icon = (json[i].payload.icon && (json[i].payload.icon + ''.indexOf('http') !== -1)) ? json[i].payload.icon : (that.params.get('setupEndPoint') ? that.params.get('setupEndPoint') : '') + '/lib-default-icon.png';
                }
                resolve(json);
            }, function (e) {
                console.error('Cannot fetch user Unred Notifications', e);
                reject(e);
            });
        });
    }

    removeUnreadNotification(pushid) {
        return this._request(this.notificationEndPoint + '/read-one', {
            devid: this.params.get('devid'),
            appid: this.params.get('appid'),
            hwid: this.params.get('hwid'),
            regid: this.params.get('regid'),
            pushid: pushid,
            browserVersion: this.support.getBrowserVersion()
        }, 'DELETE');
    }

    removeAllUnreadNotifications() {
        return this._request(this.notificationEndPoint + '/read-all', {
            devid: this.params.get('devid'),
            appid: this.params.get('appid'),
            hwid: this.params.get('hwid'),
            regid: this.params.get('regid'),
            browserVersion: this.support.getBrowserVersion()
        }, 'DELETE');
    }

    getTag(key) {
        return this._request(this.tagEndPoint + '/' + this.params.get('hwid'), {
            devid: this.params.get('devid'),
            appid: this.params.get('appid'),
            regid: this.params.get('regid'),
            key: key,
            browserVersion: this.support.getBrowserVersion()
        }, 'POST');
    }

    addTag(key, value, type) {
        if (!type) {
            type = 'STRING';
        }
        if (type === 'LIST') {
            value = JSON.stringify(value);
        }
        return this._request(this.tagEndPoint, {
            devid: this.params.get('devid'),
            appid: this.params.get('appid'),
            uuid: this.params.get('hwid'),
            regid: this.params.get('regid'),
            type: type,
            key: key,
            value: value,
            browserVersion: this.support.getBrowserVersion()
        }, 'POST');
    }

    removeTag(key, value, type) {
        if (!type) {
            type = 'STRING';
        }
        if (type === 'LIST') {
            value = JSON.stringify(value);
        }
        return this._request(this.tagEndPoint, {
            devid: this.params.get('devid'),
            appid: this.params.get('appid'),
            uuid: this.params.get('hwid'),
            regid: this.params.get('regid'),
            type: type,
            key: key,
            value: value,
            browserVersion: this.support.getBrowserVersion()
        }, 'DELETE');
    }

    optOut(bool) {
        return this._request(this.optOutEndPoint, {
            devid: this.params.get('devid'),
            appid: this.params.get('appid'),
            uuid: this.params.get('hwid'),
            regid: this.params.get('regid'),
            block: bool ? '1' : '0',
            browserVersion: this.support.getBrowserVersion()
        }, 'PUT');
    }

    getAlias() {
        return this.params.get('alias');
    }

}



// _processMessageFromIframe(e) {
//     if (!e.data.eventId && e.data.status === 'subscribed' && typeof e.data.params === 'object') {
//         this.params.set(e.data.params);
//         this.events.once('subscribed');
//     } else if (e.data.eventId) {
//         this.events.once(e.data.eventId, e.data);
//     }
// }

// _postMessageToIframe(action, params) {
//     let that = this;
//     return new Promise(function (resolve, reject) {
//         if (!that.iframe) {
//             return reject('Iframe dont exist or wasnt initialize yet.');
//         }
//
//         action = action || '';
//
//         let timeout = null,
//             data = {
//                 eventId: action + '-' + (new Date().getTime()) + '-' + Math.random(),
//                 action: action
//             };
//
//         if (params && typeof params === 'object') {
//             data.params = params;
//         }
//
//         that.events.one(data.eventId, function (e) {
//             clearTimeout(timeout);
//
//             if (e.detail && e.detail.params && typeof e.detail.params === 'object') {
//                 that.params.set(e.detail.params);
//             }
//             resolve(e.detail);
//         });
//
//         if (action !== 'doSubscribe') {
//             timeout = setTimeout(function () {
//                 reject('postMessage event timeout: ' + data.eventId);
//             }, 5000);
//         }
//
//         that.iframe.contentWindow.postMessage(data, '*');
//     });
// }

// _addIframe (callback) {
//     let that = this;
//     if (this.control.iframe.hasLoaded) {
//         callback();
//         return;
//     }
//     if (this.control.iframe.isLoading) {
//         return;
//     }
//     this.iframe.id = 'smartpush-webpush-iframe';
//     this.iframe.style.display = 'none';
//     this.iframe.src = (this.params.get('setupEndPoint') || '') + '/lib' + (this.version ? '-' + this.version : '') + '.html';
//     this.iframe.onload = function () {
//         that.events.trigger('iframe-loaded');
//         if (!that.control.iframe.hasLoaded) {
//             that.control.iframe.hasLoaded = true;
//             that.control.iframe.isLoading = false;
//             callback();
//         }
//     };
//     this.iframe.onerror = function (e) {
//         console.error(e);
//     };
//     window.document.body.appendChild(this.iframe);
//     this.control.iframe.isLoading = true;
// }

// _addIframeEvents() {
//     let that = this;
//     if (this.control.eventForPostMassageIsListening === false) {
//         if (window.addEventListener) {
//             window.addEventListener('message', function (e) {
//                 if (e.data.source === 'smartpush.webpush.iframe') {
//                     that._processMessageFromIframe(e);
//                 }
//             }, false);
//         } else {
//             window.attachEvent('onmessage', function (e) {
//                 if (e.data.source === 'smartpush.webpush.iframe') {
//                     that._processMessageFromIframe(e);
//                 }
//             });
//         }
//         this.control.eventForPostMassageIsListening = true;
//     }
// }

// _openPopUp() {
//
//     let width = 440,
//         height = 330,
//         left = (window.screen.width / 2) - (width / 2),
//         top = (window.screen.height / 2) - (height / 2),
//         config = 'toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=' + width + ',height=' + height + ',left=' + left + ',top=' + top,
//         url = this.params.get('setupEndPoint') + '/lib' + (this.version ? '-' + this.version : '') + '.html';
//
//     if (!this.popup || this.popup.closed) {
//         this.popup = window.open(url, 'notification', config);
//     } else {
//         if (this.popup && !this.popup.closed) {
//             this.popup.focus();
//         } else {
//             this.popup = window.open(url, 'notification', config);
//         }
//     }
//
//     if (!this.popup) {
//         return false;
//     }
//
//     this.popup.focus();
//
//     return true;
// }

// _setupUserTemplate () {
//     let that = this,
//         params = {
//             callback: window.location.href,
//             subscribe: true
//         }, template;
//
//     window.fetch(that.params.get('templateEndPoint')).then(function (response) {
//         response.text().then(function (html) {
//             template = new Template(that.params.get('templateEndPoint'));
//             template._cleanAndPrepareHtml(html).then(function (newHtml) {
//                 if (newHtml.length > 5232400) {
//                     console.error('Your template is too big!');
//                 } else {
//                     that._postMessageToIframe('ping', {
//                         template: newHtml
//                     }).then(function () {
//                         window.location.href = that.iframe.src + '?' + that._encodeParams(params);
//                     }, function (e) {
//                         console.error('postMessage timeout!', e);
//                     });
//                 }
//             }, function (e) {
//                 console.error(e);
//             });
//         });
//     }, function (e) {
//         console.error('Template target error!', e);
//     });
// }

// _setupDefaultTemplate (popupFail) {
//     let that = this,
//         params = { callback: window.location.href },
//         imageUrl,
//         template;
//     imageUrl = that.params.get('templateImageUrl');
//     if (imageUrl && imageUrl.indexOf('https') === -1) {
//         template = new Template();
//         template._loadImageBase64FromUrl(imageUrl).then(function (base64) {
//             that._postMessageToIframe('ping', {
//                 templateImageBase64: base64
//             }).then(function () {
//                 if (!popupFail) {
//                     that._openPopUp();
//                 } else {
//                     window.location.href = that.iframe.src + '?' + that._encodeParams(params);
//                 }
//             }, function (e) {
//                 console.error(e);
//             });
//         }, function (e) {
//             console.error(e);
//         });
//     } else {
//         if (!popupFail) {
//             that._openPopUp();
//         } else {
//             window.location.href = that.iframe.src + '?' + that._encodeParams(params);
//         }
//     }
// }

// _initialize(action) {
//
//
//     return new Promise(function (resolve, reject) {
//         if (platform === 'CHROME' || platform === 'FIREFOX') {
//
//             if (action === 'initSubscribe') {
//                 if (!that.params.get('hwid') || !that.params.get('regid')) {
//                     if (that.params.get('setupEndPoint') && !that.params.get('templateEndPoint')) {
//                         if (!that._openPopUp()) {
//                             popupFail = true;
//                         }
//                     }
//                 }
//             }
//
//             if (that.control.hasSetup === true) {
//                 return resolve();
//             }
//
//             that._addIframeEvents();
//             that._addIframe(function () {
//
//                 that._postMessageToIframe(action, {
//                     devid: that.params.get('devid'),
//                     appid: that.params.get('appid'),
//                     platform: that.params.get('platform'),
//                     setupEndPoint: that.params.get('setupEndPoint'),
//                     templateEndPoint: that.params.get('templateEndPoint'),
//                     templateImageUrl: that.params.get('templateImageUrl'),
//                     templateSiteName: that.params.get('templateSiteName')
//                 }).then(function (data) {
//                     switch (data.status) {
//                         case 'ready':
//                             that.control.hasSetup = true;
//                             resolve(data);
//                             break;
//                         case 'pong':
//                             resolve(data);
//                             break;
//
//                         case 'setup-ssl-error':
//                         //console.error('DOMException: Only secure origins are allowed (see: https://goo.gl/Y0ZkNV).');
//                         case 'setup-error':
//                             if (!that.params.get('setupEndPoint')) {
//                                 reject(data);
//                                 break;
//                             }
//                         case 'setup-reload':
//                             if (window.location.href.indexOf('https') !== -1) {
//                                 that.events.one('iframe-loaded', function() {
//                                     that._postMessageToIframe(action).then(function(data2) {
//                                         resolve(data2);
//                                     });
//                                 });
//                                 return;
//                             }
//                         case 'registered-redirect':
//                             that.control.hasSetup = true;
//                             that.checkStatus().then(function (status) {
//                                 if (that.params.get('templateEndPoint')) {
//                                     if (status === 'denied') {
//                                         resolve(data);
//                                         return;
//                                     }
//                                     //that._setupUserTemplate();
//                                 } else {
//                                     //that._setupDefaultTemplate(popupFail);
//                                 }
//                             }, function (e) {
//                                 console.error(e);
//                             });
//                             break;
//                     }
//                 }, function (e) {
//                     console.error('postMessage timeout!', e);
//                     reject();
//                 });
//             });
//
//         } else if (platform === 'SAFARI') {
//
//             if (that.params.get('safariPushID') && that.params.get('hwid') && that.params.get('regid')) {
//                 resolve();
//                 return true;
//             }
//             that._request(that.safariEndPoint + '/getPushID', {
//                 devid: that.params.get('devid'),
//                 appid: that.params.get('appid')
//             }, 'POST').then(function (json) {
//                 if (json.code === 200 && json.safariPushID) {
//                     that.params.set({safariPushID: json.safariPushID});
//                     resolve();
//                 } else {
//                     reject(json.message);
//                 }
//             }, function (e) {
//                 console.error('Cannot fetch safari app Push ID', e);
//                 reject(e);
//             });
//         }
//     });
// }
//
// _loadExternalScript(src, callback) {
//     let script = document.createElement('script');
//     script.src = src;
//     script.async = true;
//     if (callback) {
//         script.onreadystatechange = script.onload = function () {
//             let state = script.readyState;
//             if (!callback.done && (!state || /loaded|complete/.test(state))) {
//                 callback.done = true;
//                 callback();
//             }
//         };
//     }
//     document.getElementsByTagName('head')[0].appendChild(script);
// }

// ready() {
//     return new Promise(function (resolve, reject) {
//         if (window.fetch) {
//             return resolve();
//         }
//         this._loadExternalScript(FETCH_POLYFILL_END_POINT, function() {
//             if (window.fetch) {
//                 return resolve();
//             }
//             reject();
//         });
//     });
// }