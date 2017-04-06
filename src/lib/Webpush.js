import User from './User';
import Base from './Base';

export default class extends Base {

    constructor(version) {
        super();

        this.version = version;

        this.registerEndPoint = this.params.get('apiEndPoint') + '/device';
        this.safariEndPoint = this.params.get('apiEndPoint') + '/safari';

        this.user = new User();
    }

    _initializeServiceWorker() {
        return new Promise((resolve, reject) => {

            window.navigator.serviceWorker.register('/webpush-service-worker.js', {scope: '/'}).then(() => {

                navigator.serviceWorker.ready.then(() => {

                    this._sendMessageToServiceWorker({test: true}).then(() => {
                        this._sendMessageToServiceWorker(this.params.getAll());
                        resolve();
                    }).catch((e) => {
                        console.debug(e);
                        setTimeout(() => {
                            this._sendMessageToServiceWorker({test: true}).then(() => {
                                this._sendMessageToServiceWorker(this.params.getAll());
                                resolve();
                            }).catch(() => {
                                reject('Service worker don\'t respond');
                            });
                        }, 250);
                    });

                }).catch((e) => {
                    console.error('Service Worker Cannot enter ready state', e);
                    reject('error');
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
        return new Promise((resolve, reject) => {
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
            // navigator.serviceWorker.controller returns null if the request is a force refresh (shift+refresh).
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
        return this._encodeParams({
            appid: this.params.get('appid'),
            uuid: this.params.get('hwid') || null,
            platform: this.platform,
            regid: data.regid,
            endpoint: data.endpoint,
            p256dh: data.p256dh,
            auth: data.auth,
            device: this.platform === 'CHROME' ? navigator.userAgent.match(/Chrom(e|ium|eframe)\/([0-9]+)\./i)[0] : navigator.userAgent.match(/Firefox\/([0-9]+)\./i)[0],
            manufacturer: this.platform === 'CHROME' ? navigator.vendor : 'Mozilla',
            framework: this.platform === 'CHROME' ? (navigator.platform ? navigator.platform : navigator.oscpu) : (navigator.oscpu ? navigator.oscpu : navigator.platform)
        });
    }

    _getSafariPushId() {
        return new Promise((resolve, reject) => {
            if (this.params.get('safariPushID')) {
                return resolve(this.params.get('safariPushID'));
            }
            this._request(this.safariEndPoint + '/getPushID', {
                devid: this.params.get('devid'),
                appid: this.params.get('appid')
            }).then((json) => {
                if (json.safariPushID) {
                    this.params.set({
                        safariPushID: json.safariPushID
                    });
                    resolve(json.safariPushID);
                } else {
                    console.error('Cannot fetch safariPushID', json);
                    reject();
                }
            }).catch((e) => {
                console.error('Cannot fetch safari app Push ID', e);
                reject();
            });
        });
    }

    getUser() {
        return new Promise((resolve, reject) => {
            if (this.platform === 'CHROME' || this.platform === 'FIREFOX') {
                switch (Notification.permission) {
                    case 'denied':
                        reject('denied');
                        break;
                    case 'default':
                        reject('default');
                        break;
                    case 'granted':

                        this._initializeServiceWorker().then(() => {

                            window.navigator.serviceWorker.ready.then((registration) => {

                                registration.pushManager.getSubscription().then((subscription) => {

                                    if (!subscription) {
                                        console.warn('Cannot access subscription object to get user.');
                                        return reject('default');
                                    }
                                    if (this.params.get('hwid')) {
                                        let data = this._getDataFromSubscription(subscription);
                                        if (!data) {
                                            reject('Cannot get cyphers out of this client!', subscription);
                                        }
                                        if (data.regid) {
                                            this.params.set({ regid: data.regid });
                                        }
                                        resolve(this.user);
                                    } else {
                                        console.warn('You are not fully registered yet.');
                                        reject('default');
                                    }

                                }).catch((e) => {
                                    console.warn('Cannot get subscription at the moment, please try to subscribe.', e);
                                    reject('default');
                                });

                            }).catch((e) => {
                                console.error('Service Worker Cannot enter ready state', e);
                                reject('error');
                            });

                        }).catch((e) => {
                            console.error('Cannot initialize service worker', e);
                            reject('error');
                        });
                        break;

                    default:
                        console.error('Unprocessable permission: ' + Notification.permission);
                        reject('error');
                }
            } else if (this.platform === 'SAFARI') {

                this._getSafariPushId().then((safariPushID) => {

                    let permissionData = window.safari.pushNotification.permission(safariPushID);
                    console.debug('permissionData', permissionData);
                    switch (permissionData.permission) {
                        case 'default':
                            reject('default');
                            break;
                        case 'denied':
                            reject('denied');
                            break;
                        case 'granted':
                            if (this.params.get('hwid') && this.params.get('regid')) {
                                resolve(this.user);
                            } else {
                                reject('default');
                            }
                            break;
                        default:
                            console.error('Unprocessable permission: ' + permissionData.permission)
                            reject('error');
                    }
                }).catch(() => {
                    reject('error');
                });
            } else {
                console.warn('Platform isn\'t supported');
                reject('error');
            }
        });
    }

    subscribe() {
        return new Promise((resolve, reject) => {
            if (this.platform === 'CHROME' || this.platform === 'FIREFOX') {
                switch (Notification.permission) {
                    case 'denied':
                        reject('denied');
                        break;

                    case 'default':
                    case 'granted':

                        Notification.requestPermission((permission) => {
                            switch (permission) {
                                case 'denied':
                                    reject('denied');
                                    break;

                                case 'default':
                                    reject('default');
                                    break;

                                case 'granted':

                                    this._initializeServiceWorker().then(() => {

                                        navigator.serviceWorker.ready.then((registration) => {

                                            registration.pushManager.subscribe({userVisibleOnly: true}).then((subscription) => {

                                                if (!subscription) {
                                                    console.error('Cannot access subscription object to subscribe.');
                                                    return reject('error');
                                                }

                                                let data = this._getDataFromSubscription(subscription);
                                                window.fetch(this.registerEndPoint, {
                                                    method: 'post',
                                                    headers: {
                                                        'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
                                                    },
                                                    body: this._getSubscriptionData(data)
                                                }).then((result) => {

                                                    if (result.status !== 200) {
                                                        console.error('Subscribe API fetch error!', result);
                                                        return reject('error');
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
                                                            regid: data.regid,
                                                            apiEndPoint: this.params.get('apiEndPoint'),
                                                            defaultIcon: this.params.get('defaultIcon')
                                                        }).then(() => {
                                                            resolve(this.user);
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

                                        }).catch((e) => {
                                            console.error('Service Worker Cannot enter ready state', e);
                                            reject('error');
                                        });

                                    }).catch((e) => {
                                        console.error('Cannot initialize service worker', e);
                                        reject('error');
                                    });
                                    break;

                                default:
                                    console.error('Unprocessable permission: '+permission);
                                    reject('error');
                            }
                        });
                        break;

                    default:
                        console.error('Unprocessable permission: ' + Notification.permission);
                        reject('error');
                }
            } else if (this.platform === 'SAFARI') {

                this._getSafariPushId().then((safariPushID) => {
                    console.log('YEAH');
                    console.debug('this.safariEndPoint', this.safariEndPoint);
                    window.safari.pushNotification.requestPermission(
                        this.safariEndPoint,
                        safariPushID,
                        {
                            devid: this.params.get('devid'),
                            appid: this.params.get('appid')
                        },
                        (permissionData) => {
                            console.log('permissionData', permissionData);
                            if (permissionData.permission === 'default') {
                                reject('default');
                            } else if (permissionData.permission === 'granted') {
                                this._request(this.registerEndPoint, {
                                    appid: this.params.get('appid'),
                                    uuid: 'null',
                                    platform: this.platform,
                                    regid: permissionData.deviceToken,
                                    device: 'Safari/' + window.navigator.userAgent.match(/Version\/(([0-9]+)(\.|[0-9])+)/i)[1],
                                    manufacturer: window.navigator.vendor,
                                    framework: window.navigator.platform || window.navigator.oscpu
                                }, 'POST').then((json) => {

                                    if (json.hwid) {

                                        this.params.set({
                                            hwid: json.hwid,
                                            regid: permissionData.deviceToken,
                                            alias: json.alias
                                        });

                                        resolve(this.user);

                                    } else {
                                        console.error(json.message);
                                        reject('error');
                                    }
                                }, (e) => {
                                    console.error('Cannot register extra data for this device!', e);
                                    reject('error');
                                });
                            } else if (permissionData.permission === 'denied') {
                                console.log('WTF');
                                reject('denied');
                            } else {
                                console.error('Unprocessable permission: '+permissionData.permission);
                                reject('error');
                            }
                        }
                    );
                }).catch(() => {
                    reject('error');
                });
            } else {
                console.error('Platform isn\'t supported');
                reject('error');
            }
        });
    }

    unSubscribe() {
        return new Promise((resolve, reject) => {

            if (this.platform === 'CHROME' || this.platform === 'FIREFOX') {
                switch (Notification.permission) {
                    case 'denied':
                        reject('denied');
                        break;
                    case 'default':
                        reject('default');
                        break;
                    case 'granted':

                        this._initializeServiceWorker().then(() => {

                            navigator.serviceWorker.ready.then((registration) => {

                                registration.pushManager.getSubscription().then((subscription) => {

                                    if (!subscription) {
                                        console.error('Cannot access subscription object to un-subscribe.');
                                        return reject('error');
                                    }

                                    subscription.unsubscribe().then(() => {

                                        this._request(this.registerEndPoint, {
                                            devid: this.params.get('devid'),
                                            appid: this.params.get('appid'),
                                            uuid: this.params.get('hwid')
                                        }, 'DELETE').then(() => {
                                            this.params.set({
                                                regid: null,
                                                alias: null
                                            });
                                            resolve();

                                        }).catch((e) => {
                                            console.error('Cannot un-register this user on DB. It will be removed in next dry-run!', e);
                                            reject('error');
                                        });

                                    }).catch((e) => {
                                        console.error('Unsubscription error: ', e);
                                        reject('error');
                                    });

                                }).catch((e) => {
                                    console.error('Error thrown while unsubscribing from push messaging.', e);
                                    reject('error');
                                });

                            }).catch((e) => {
                                console.error('Service Worker Cannot enter ready state', e);
                                reject('error');
                            });

                        }).catch((e) => {
                            console.error('Cannot initialize service worker', e);
                            reject('error');
                        });
                        break;

                    default:
                        console.error('Unprocessable permission: '+Notification.permission);
                        reject('error');
                }

            } else if (this.platform === 'SAFARI') {
                console.error('Safari cannot un-subscribe via javascript');
                reject('error');
            } else {
                console.error('Platform isn\'t supported');
                reject('error');
            }

        });

    }

}