export default class {

    constructor() {
        this._platform = null;
        this._browserVersion = null;
    }

    _checkFeature(feature) {
        switch (feature) {
            case 'postMessage':
                return 'postMessage' in window;
            case 'Notification':
                return 'Notification' in window;
            case 'localStorage':
                try {
                    return ('localStorage' in window && window.localStorage !== null);
                } catch (e) {
                    return false;
                }
                break;
            case 'permission':
                return 'permission' in window.Notification;
            case 'showNotification':
                try {
                    return 'showNotification' in window.ServiceWorkerRegistration.prototype;
                } catch (e) {
                    return;
                }
                break;
            case 'serviceWorker':
                return 'serviceWorker' in window.navigator;
            case 'PushManager':
                return 'PushManager' in window;
            case 'pushNotification':
                return 'pushNotification' in window.safari;
        }

        return true;
    }

    _getPlatformName() {
        if (window.hasOwnProperty('chrome') && /Chrome/.test(window.navigator.userAgent) && /Google Inc/.test(window.navigator.vendor)) {
            return 'CHROME';
        }
        if (/Firefox/.test(window.navigator.userAgent) && window.InstallTrigger !== 'undefined') {
            return 'FIREFOX';
        }
        if (/Safari/.test(window.navigator.userAgent) && /Apple Computer/.test(window.navigator.vendor)) {
            if (window.hasOwnProperty('safari')) {
                return 'SAFARI';
            }
            console.warn('Probably the user is using a mobile safari browser! "safari" object is not present on "window"');
        }
        return false;
    }

    getPlatform() {
        if (this._platform) {
            return this._platform;
        }
        let platform = this._getPlatformName();
        this._platform = platform || null;
        return this._platform;
    }

    getBrowserVersion() {
        if (this._browserVersion) {
            return this._browserVersion;
        }
        let version = '';
        switch (this.getPlatform()) {
            case 'CHROME':
                version = window.navigator.userAgent.match(/Chrom(e|ium|eframe)\/([0-9]+)\./i)[0];
                break;
            case 'FIREFOX':
                version = window.navigator.userAgent.match(/Firefox\/([0-9]+)\./i)[0];
                break;
            case 'SAFARI':
                version = 'Safari/' + window.navigator.userAgent.match(/Version\/(([0-9]+)(\.|[0-9])+)/i)[1];
                break;
        }
        this._browserVersion = version || null;
        return this._browserVersion;
    }

    checkAllFeatures() {
        if (!this._checkFeature('postMessage')) {
            console.warn('"postMessage" is not supported.');
            return;
        }
        if (!this._checkFeature('Notification')) {
            console.warn('"Notification" is not supported.');
            return;
        }
        if (!this._checkFeature('localStorage')) {
            console.warn('"localStorage" is not supported.');
            return;
        }

        let platform = this.getPlatform();
        if (platform === 'CHROME' || platform === 'FIREFOX') {
            if (!this._checkFeature('permission')) {
                console.warn('This browser dont support Notifications');
                return;
            }
            if (!this._checkFeature('showNotification')) {
                console.warn('"showNotification" is not supported.');
                return;
            }
            if (!this._checkFeature('serviceWorker')) {
                console.warn('"serviceWorker" is not supported.');
                return;
            }
            if (!this._checkFeature('PushManager')) {
                console.warn('"PushManager" is not supported.');
                return;
            }
        } else if (platform === 'SAFARI') {
            if (!this._checkFeature('pushNotification')) {
                console.warn('"pushNotification" is not supported.');
                return;
            }
        }
        return true;
    }

}