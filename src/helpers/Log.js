export default class {

    constructor(platform) {
        this.platform = platform;
    }

    _log(message, extra, type) {
        if (this.platform === 'SAFARI') {
            console.log(message, extra || '');
        } else {
            switch (type) {
                case 'info': console.info(message, extra || ''); break;
                case 'warn': console.warn(message, extra || ''); break;
                case 'debug': console.debug(message, extra || ''); break;
                case 'error': console.error(message, extra || ''); break;
            }
        }
    }

    info(message, extra) {
        this._log(message, extra, 'info');
    }

    warn(message, extra) {
        this._log(message, extra, 'warn');
    }

    debug(message, extra) {
        this._log(message, extra, 'debug');
    }

    error(message, extra) {
        this._log(message, extra, 'error');
    }
}