function indexedDb() {
    return new Promise(function(resolve, reject) {
        var request = self.indexedDB.open('webpush.db', 1);
        request.onsuccess = function(e) {
            resolve(e.target.result);
        };
        request.onerror = function(e) {
            reject(e);
        };
        request.onupgradeneeded = function(e) {
            e.target.result.createObjectStore('info', {keyPath: 'id', autoIncrement: true});
        };
    });
}

function hold(data) {
    return new Promise(function(resolve, reject) {
        if (data.devid && data.appid && data.hwid) {
            return indexedDb().then(function(db){
                var empty = db.transaction(['info'], 'readwrite').objectStore('info').openCursor();
                empty.onsuccess = function(e) {
                    var cursor = e.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                };
                var add = db.transaction(['info'], 'readwrite').objectStore('info').add(data);
                add.onsuccess = function(e) {
                    resolve();
                };
                add.onerror = function(e) {
                    reject(e);
                };
            }, function(e){
                reject(e);
            });
        }
        resolve();
    });
}

function getInfo() {
    return new Promise(function(resolve, reject) {
        return indexedDb().then(function(db){
            var read = db.transaction(['info'], 'readonly').objectStore('info').openCursor();
            read.onsuccess = function(e) {
                resolve(e.target.result.value);
            };
            read.onerror = function(e) {
                reject(e);
            };
        }, function(e) {
            reject(e);
        });
    });
}

function postHit(pushid, action) {
    return getInfo().then(function(data) {
        if (!data.devid || !data.appid || !data.hwid || !data.apiEndPoint) {
            console.error('We are unable to get all information from IndexedDB', data);
            return;
        }
        fetch(data.apiEndPoint + '/hit/info', {
            method: 'post',
            headers: {
                'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: 'devid='+data.devid+'&appid='+data.appid+'&uuid='+data.hwid+'&action='+action+'&campaignId='+pushid
        });
    }, function(e){
        console.error(e);
    });
}

function getVibrationPattern(vibration) {
    var array = [];
    if (vibration && vibration !== 'NONE') {
        switch (vibration) {
            case 'NORMAL':
                array = [300,100,300];
                break;
            case 'ALERT':
                array = [200,100,200,100,300];
                break;
            case 'URGENT':
                array = [100,100,100,100,100,100,300];
                break;
            default:
                array = [];
                break;
        }
    }
    return array;
}

self.addEventListener('message', function(e) {
    if (e.data.test && e.data.test === true) {
        e.ports[0].postMessage({received: true});
    } else if (e.data && typeof e.data === 'object') {
        hold(e.data).then(function(){
            e.ports[0].postMessage({received: true});
        }, function(e){
            console.error(e);
        });
    }
});

self.addEventListener('install', function(e) {
    e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(e) {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(e) {
    e.waitUntil(self.registration.pushManager.getSubscription().then(function(subscription) {
        return getInfo().then(function(data){
            if (!data.devid || !data.appid || !data.hwid || data.defaultIcon) {
                return console.error('We are unable to get all information from IndexedDB', data);
            }
            if (e.data) {
                var payload = e.data.json();
                return self.registration.showNotification(payload.title, {
                    body: payload.text,
                    dir: payload.direction || 'auto',
                    icon: (payload.icon && (payload.icon+''.indexOf('http') !== -1)) ? payload.icon : data.defaultIcon,
                    image: (payload.image && (payload.image+''.indexOf('http') !== -1)) ? payload.image : '',
                    requireInteraction: payload.requireInteraction && payload.requireInteraction === 'true' || false,
                    tag: payload.campaignId,
                    vibrate: getVibrationPattern(payload.vibration),
                    data: {
                        pushId: payload.campaignId,
                        clickUrl: payload.clickUrl,
                    }
                });
            } else {
                console.error('payload don\'t have data object');
            }
        }, function(e){
            console.error(e);
        });
    }));
});

self.addEventListener('notificationclick', function(e) {
    var data = e.notification.data, pushId = data.pushId, clickUrl = data.clickUrl;
    e.notification.close();
    if (clickUrl && clickUrl.indexOf('http') !== -1) {
        e.waitUntil(
            clients.matchAll({
                type: "window"
            }).then(function () {
                if (clients.openWindow) return clients.openWindow(clickUrl);
            })
        );
    }
    if (pushId) return postHit(pushId, 'CLICKED');
});

self.addEventListener('notificationclose', function (e) {
    var data = e.notification.data,pushId = data.pushId;
    if (pushId) return postHit(pushId, 'DISMISSED');
});