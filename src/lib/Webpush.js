import User from './User';
import Base from './Base';

export default class extends Base {

    constructor(version, endpoint) {
        super();
        this.version = version;

        this.user = new User(endpoint);

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
        this.safariEndPoint = endpoint + '/safari';
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
                                        // do subscribe ??
                                        console.warn('Cannot get subscription object.');
                                        reject('default');
                                        return;
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
                        }).catch(() => {
                            reject('error');
                        });
                        break;
                    default:
                        console.error('Unprocessable permission: ' + Notification.permission);
                        reject('error');
                }
            } else if (this.platform === 'SAFARI') {
                let permissionData = window.safari.pushNotification.permission(that.params.get('safariPushID'));
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
            } else {
                console.log('Platform isn\'t supported');
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
                                                let data = this._getDataFromSubscription(subscription);
                                                fetch(apiEndPoint + '/device', {
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
                                        });
                                    }).catch(() => {
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
                                platform: this.platform,
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

                                    resolve(this.user);

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
                console.error('Platform isn\'t supported');
                reject('error');
            }
        });
    }

    unSubscribe() {
        return new Promise((resolve, reject) => {

            if (this.platform === 'CHROME' || this.platform === 'FIREFOX') {

                navigator.serviceWorker.ready.then(function(registration) {
                    registration.pushManager.getSubscription().then(function(subscription) {

                        if (!subscription) {
                            setParams({
                                regid: null,
                                alias: null
                            });
                            sendMessageToParent({
                                eventId: eventId,
                                status: 'unsubscribed'
                            });
                            console.warn('No subscription found to unsubscribe');
                            return;
                        }

                        subscription.unsubscribe().then(function() {
                            setParams({
                                regid: null,
                                alias: null
                            });
                            sendMessageToParent({
                                eventId: eventId,
                                status: 'unsubscribed'
                            });
                        }, function(e) {
                            console.error('Unsubscription error: ', e);
                            sendMessageToParent({
                                eventId: eventId,
                                status: 'unsubscribed-error'
                            });
                        });

                    }, function(e) {
                        console.error('Error thrown while unsubscribing from push messaging.', e);
                        sendMessageToParent({
                            eventId: eventId,
                            status: 'unsubscribed-error'
                        });
                    });
                });

            } else if (this.platform === 'SAFARI') {

            } else {
                console.error('Platform isn\'t supported');
                reject('error');
            }








            this._postMessageToIframe('unsubscribe').then(function (data) {
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

}