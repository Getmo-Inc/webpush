import Webpush from './Webpush';
import Base from './Base';

export default class extends Base {

    constructor() {
        super();
        this.version = '3.0.2';
    }

    _getAppID(setup){
        let appid = null;
        switch (this.platform) {
            case 'CHROME':
                if (setup.appid.chrome === false) {
                    this.log.warn('Chrome Disabled');
                    return;
                }
                if (!setup.appid.chrome || setup.appid.chrome === 'APPID') {
                    this.log.error('No "appid" found for chrome, consult the docs');
                    return;
                }
                appid = setup.appid.chrome;
                break;
            case 'SAFARI':
                if (setup.appid.safari === false) {
                    this.log.warn('Safari Disabled');
                    return;
                }
                if (!setup.appid.safari || setup.appid.chrome === 'APPID') {
                    this.log.error('No "appid" found for safari, consult the docs');
                    return;
                }
                appid = setup.appid.safari;
                break;
            case 'FIREFOX':
                if (setup.appid.firefox === false) {
                    this.log.warn('Safari Disabled');
                    return;
                }
                if (!setup.appid.firefox || setup.appid.chrome === 'APPID') {
                    this.log.error('No "appid" found for firefox, consult the docs');
                    return;
                }
                appid = setup.appid.firefox;
                break;
        }
        return appid;
    }

    create(setup) {

        if (this.platform !== 'SAFARI' && window.location.href.indexOf('https') === -1) {
            this.log.error('Unless you\'re using localhost, the Push API requires HTTPS');
            return;
        }
        if (!setup.devid || setup.devid === 'DEVID') {
            this.log.error('"devid" was NOT set correctly, consult the docs');
            return;
        }
        if (typeof setup.appid !== 'object') {
            this.log.error('"appid" must be an Object');
            return;
        }
        if (this.platform !== 'CHROME' && this.platform !== 'SAFARI' && this.platform !== 'FIREFOX') {
            this.log.info('Platform not Allowed for web-push:', [window.navigator.vendor, window.navigator.userAgent]);
            return;
        }
        if (!this.support.checkAllFeatures()) {
            this.log.error('This browser doesn\'t have all features to receive web-push.');
            return;
        }

        const appid = this._getAppID(setup);
        if (!appid || appid === 'APPID') {
            this.log.error('"appid" misconfigured, consult the docs', appid);
            return;
        }

        let defaultIcon;
        if (setup.defaultIcon && setup.defaultIcon+''.indexOf('http') !== -1) {
            defaultIcon = setup.defaultIcon;
        } else {
            defaultIcon = '/webpush-default-icon.png';
        }

        let apiEndPoint = 'https://api.getmo.com.br';
        if (setup.doNotUse === true) {
            apiEndPoint = 'https://local.smartpush.api';
        }

        this.params.set({
            devid: setup.devid,
            appid: appid,
            platform: this.platform,
            apiEndPoint: apiEndPoint,
            defaultIcon: defaultIcon
        });

        return new Webpush(this.version);
    }
}