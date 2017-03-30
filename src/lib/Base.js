//import Events from '../helpers/Events';
import Support from '../helpers/Support';
import Params from '../helpers/Params';

export default class {

    constructor() {
        //this.events = new Events();
        this.support = new Support();
        this.params = new Params();
        this.platform = this.support.getPlatform();
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
        return new Promise((resolve, reject) => {
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
                body: this._encodeParams(data)
            }).then((result) => {
                result.json().then((json) => {
                    resolve(json);
                }).catch((e) => {
                    reject(e);
                });
            }).catch((e) => {
                reject(e);
            });
        });
    }
}