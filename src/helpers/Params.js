export default class {

    constructor() {
        this.data = {
            devid: null,
            appid: null,
            hwid: null,
            regid: null,
            alias: null,
            platform: null,
            safariPushID: null
        };
    }

    get(name, lsName) {
        if (this.data[name]) {
            return this.data[name];
        }
        lsName = lsName || 'smartpush_webpush';
        try {
            let lsParams = JSON.parse(window.localStorage.getItem(lsName));
            if (lsParams[name] || lsParams[name] === false) {
                this.data[name] = lsParams[name];
                return lsParams[name];
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    set(newParams, lsName) {
        let key1, key2, lsParams;
        if (typeof newParams === 'object') {
            lsName = lsName || 'smartpush_webpush';
            try {
                lsParams = JSON.parse(window.localStorage.getItem(lsName));
                for (key1 in lsParams) {
                    if (lsParams.hasOwnProperty(key1)) {
                        this.data[key1] = lsParams[key1];
                    }
                }
            } catch (e) {}
            for (key2 in newParams) {
                if (newParams.hasOwnProperty(key2)) {
                    this.data[key2] = newParams[key2];
                }
            }
            window.localStorage.setItem(lsName, JSON.stringify(this.data));
        }
    };

}