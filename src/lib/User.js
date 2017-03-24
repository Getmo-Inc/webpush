import Base from './Base';

export default class extends Base {

    constructor(endpoint) {
        super();
        this.notificationEndPoint = endpoint + '/notifications';
        this.tagEndPoint = endpoint + '/tag';
        this.optOutEndPoint = endpoint + '/device/optout';
    }

    getLastNotifications(dateFormat) {
        let i;
        return new Promise((resolve, reject) => {
            return this._request(this.notificationEndPoint + '/last', {
                devid: this.params.get('devid'),
                appid: this.params.get('appid'),
                hwid: this.params.get('hwid'),
                regid: this.params.get('regid'),
                platform: this.platform,
                dateFormat: dateFormat || '',
                browserVersion: this.support.getBrowserVersion()
            }, 'POST').then((json) => {
                for (i = 0; i < json.length; i++) {
                    json[i].payload.icon = (json[i].payload.icon && (json[i].payload.icon + ''.indexOf('http') !== -1)) ? json[i].payload.icon : (that.params.get('setupEndPoint') ? that.params.get('setupEndPoint') : '') + '/lib-default-icon.png';
                }
                resolve(json);
            }).catch((e) => {
                console.error('Cannot fetch user Notifications', e);
                reject(e);
            });
        });
    };

    getUnreadNotifications(dateFormat) {
        let i;
        return new Promise((resolve, reject) => {
            return this._request(this.notificationEndPoint + '/unread', {
                devid: this.params.get('devid'),
                appid: this.params.get('appid'),
                hwid: this.params.get('hwid'),
                regid: this.params.get('regid'),
                platform: this.platform,
                dateFormat: dateFormat || '',
                browserVersion: this.support.getBrowserVersion()
            }, 'POST').then((json) => {
                for (i = 0; i < json.length; i++) {
                    json[i].payload.icon = (json[i].payload.icon && (json[i].payload.icon + ''.indexOf('http') !== -1)) ? json[i].payload.icon : '/webpush-default-icon.png';
                }
                resolve(json);
            }).catch((e) => {
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