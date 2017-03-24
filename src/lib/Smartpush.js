import Lib from './Lib';
import Support from './helpers/Support';

export default class {

    constructor() {
        this.support = new Support();
        this.platform = support.getPlatform();
    }

    _getAppID(setup){
        let appid = null;
        switch (platform) {
            case 'CHROME':
                if (setup.appid.chrome === false) {
                    console.warn('Chrome Disabled');
                    return;
                }
                if (!setup.appid.chrome || setup.appid.chrome === 'APPID') {
                    console.error('No "appid" found for chrome, consult the docs');
                    return;
                }
                appid = setup.appid.chrome;
                break;
            case 'SAFARI':
                if (setup.appid.safari === false) {
                    console.warn('Safari Disabled');
                    return;
                }
                if (!setup.appid.safari || setup.appid.chrome === 'APPID') {
                    console.error('No "appid" found for safari, consult the docs');
                    return;
                }
                appid = setup.appid.safari;
                break;
            case 'FIREFOX':
                if (setup.appid.firefox === false) {
                    console.warn('Safari Disabled');
                    return;
                }
                if (!setup.appid.firefox || setup.appid.chrome === 'APPID') {
                    console.error('No "appid" found for firefox, consult the docs');
                    return;
                }
                appid = setup.appid.firefox;
                break;
        }
    }

    create(setup) {

        // VALIDATION
        if (window.location.href.indexOf('https') === -1) {
            console.error('You are NOT using a "https" connection, web-push only works on secured pages.');
            return;
        }
        if (!setup.devid || setup.devid === 'DEVID') {
            console.error('"devid" was NOT set correctly, consult the docs');
            return;
        }
        if (typeof setup.appid !== 'object') {
            console.error('"appid" must be an Object');
            return;
        }
        if (platform !== 'CHROME' && platform !== 'SAFARI' && platform !== 'FIREFOX') {
            console.info('Platform not Allowed for web-push:', [window.navigator.vendor, window.navigator.userAgent]);
            return;
        }
        if (!support.checkAllFeatures()) {
            console.error('This browser doesn\'t have all features to receive web-push.');
            return;
        }

        const appid = this._getAppID(setup);
        if (!appid || appid === 'APPID') {
            console.error('"appid" misconfigured, consult the docs');
            return;
        }

        let lib = new Lib();

        lib.params.set({
            devid: setup.devid,
            appid: appid,
            platform: platform
        });

        return lib;
    }

}