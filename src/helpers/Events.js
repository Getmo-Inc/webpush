export default class {

    constructor() {
        this.element = document.createElement('div');
        this.listeners = [];
    }

    _getIndex(name) {
        let i;
        for (i = 0; i < this.listeners.length; i++) {
            if (this.listeners[i].name === name) {
                return i;
            }
        }
        return false;
    }

    on(name, callback) {
        this.listeners.push({name: name, callback: callback, type: 'on'});
        this.element.addEventListener(name, callback);
    }

    one(name, callback) {
        this.listeners.push({name: name, callback: callback, type: 'one'});
        this.element.addEventListener(name, callback);
    }

    off(name) {
        let index = this._getIndex(name);
        if (index !== false) {
            this.element.removeEventListener(name, this.listeners[index].callback);
            this.listeners.splice(index, 1);
        }
    }

    trigger(name, detail) {
        this.element.dispatchEvent(new window.CustomEvent(name, { 'detail': detail }));

        let index = this._getIndex(name);
        if (index !== false) {
            if (this.listeners[index].type === 'one') {
                this.off(name);
            }
        }
    }

    once(name, detail) {
        this.element.dispatchEvent(new window.CustomEvent(name, { 'detail': detail }));
        this.off(name);
    }

}