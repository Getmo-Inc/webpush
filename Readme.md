# Smartpush
---
## Web Push SDK Documentation 3.0.2
This lib activates the off-site web push service on your Web Browser. Remember that this new technology only works in secured environments, therefore you need to run it over a ``https://`` connection.

### What does the project do?
This project integrates off-site webpush notification system with **Smartpush API**, for browsers that supports this feature.

### How to install it?

Download "Webpush Installation Files" (*.zip) from [https://cdn.getmo.com.br/webpush-pack-3.0.2.zip](https://cdn.getmo.com.br/webpush-pack-2.1.1.zip) and install the following files in the root of your website:
- webpush-chrome-manifest.json
- webpush-service-worker.js
- webpush-default-icon.png (customize the image before installation)

After installation, load the current SDK version in your html page: 
- ``https://cdn.getmo.com.br/webpush-lib-3.0.2.min.js``

and you are ready to go!
```html
<script src="https//cdn.getmo.com.br/webpush-lib-3.0.2.min.js"></script>
```
 

### How to use it?

First of all: verify if Smartpush object is correctly loaded.

```javascript
if (!Smartpush) {
    this.log.error('The Smartpush lib was not loaded correctly.');
    // Disable or hide your UI elements, "web push notifications" are not supported because the SDK was not loaded.
    return;
}
```

If the test is successful, we can proceed and create the "webpush" object.

```javascript
var webpush = Smartpush.create({
    devid: 'DEVID',
    appid: {
        chrome: 'APPID',
        safari: 'APPID',
        firefox: 'APPID'
    }
});
```

If "webpush" variable returns ``false``, then probably your Browser don't support all features to run the webpush service. Look to console to see messages. You can test it:
```javascript
if (!webpush) {
    console.warn('This browser don\'t support all features required to run web push services.');
    // Disable or hide your UI elements, "web push notifications" are not supported because this Browser dont support all needed features.
    return;
}
```

---

**Now the fun begins:** Ever single function described here returns a ``Promise``!

##### The "webpush" object
---

###### `webpush.getUser()`

> The **getUser()** method get the ``user`` object if the request for send notification was already granted. Otherwise the Promise will fallback with the current status.

- The **sucess** callback returns the ``user`` object. 
- The **error** callback returns a string with the following possible values: ``"default"``, ``"denied"``, ``"error"``.
```javascript
webpush.getUser().then(function(user) {
    
    // do something with the user
    // see more bellow...

}).catch(function(status) {
  
    switch (status) {
        case 'default': 
            // ask to send push notification
            // example: webpush.subscribe()
            break;
        case 'denied':
            // the user has already denied the request
            break;
        case 'error': 
            // inspect the console for problems
            break;
    }

});
```

###### `webpush.subscribe()`

> The **subscribe()** method triggers the "Notification Permission Ask" and return the ``user`` object if the permisson was granted.

- The **sucess** callback returns the ``user`` object.
- The **error** callback returns a string with the following possible values: ``"default"``, ``"denied"``, ``"error"``.
```javascript
webpush.subscribe().then(function(user) {
    
    // the current user was successfully registered
    // here you can trigger more methods, like:
    
    // user.getTag()
    // user.addTag()
    // user.removeTag()
    // user.getUnreadNotifications()
    // user.getLastNotifications()
    // user.removeUnreadNotification()
    // user.removeAllUnreadNotifications()
    
    // We talk more about all the methods below, keep going.
    
}).catch(function(status) {
    
    switch (status) {
        case 'default': 
            // the user dismiss the request to send notifications. Try to subscribe again later.
            break;
        case 'denied':
            // the user denied the request to send notifications
            break;
        case 'error': 
            // inspect the console for problems
            break;
    }

});
```
###### `webpush.unSubscribe()`

> The **unSubscribe()** method remove the registration from the Browser.

```javascript
webpush.unSubscribe().then(function() {
    
    // Successfully un-subscribed 
    
}).catch(function(status) {
    
    switch (status) {
        case 'default': 
            // you cannot un-subscribe users that are not subscribed.
            break;
        case 'denied':
            // the user denied the request to send notifications
            break;
        case 'error': 
            // inspect the console for problems
            break;
    }
    
});
```

##### The "user" object
---
###### `user.getTag('TAG_NAME')`

> The **getTag()** method receives a single string parameter.

- The **sucess** callback returns an array with all values attached to this tag.
- The **error** callback returns the same catch error object of the javascript "fetch API".
```javascript
user.getTag('TAG_NAME').then(function(result){
    
    console.debug('getTag result', result); // ["value1", "value2"]
    
}).catch(function(e) {
    
    this.log.error(e);
    // Do something when catch a error!

});
```

###### `user.addTag('TAG_NAME', 'TAG_VALUE', 'TAG_TYPE')`

> The **addTag()** method receives three parameters: "TAG_NAME", "TAG_VALUE", "TAG_TYPE". The ***"TAG_TYPE"*** must be one of the following values: ``"STRING"``, ``"TIMESTAMP"``, ``"BOOLEAN"``, ``"NUMERIC"``, ``"LIST"``. If you don't specify a third parameter, the default is ``"STRING""``.

- The **sucess** callback returns a object with a success message.
- The **error** callback returns the same catch error object of the javascript "fetch API".

Simple Example...
```javascript
user.addTag('TAG_NAME', 'TAG_VALUE', 'TAG_TYPE');
```
...or with callbacks!
```javascript
user.addTag('TAG_NAME', 'TAG_VALUE', 'TAG_TYPE').then(function(result){
    
    console.debug('addTag result', result);
    // Do something after the request succeed.
    
}).catch(function(e) {
    
    this.log.error(e);
    // Do something when catch a error.
    
});
```

###### `user.removeTag('TAG_NAME', 'TAG_VALUE', 'TAG_TYPE')`

> The **removeTag()** method receives three parameters: "TAG_NAME", "TAG_VALUE", "TAG_TYPE". The ***"TAG_TYPE"*** must be one of the following values: ``"STRING"``, ``"TIMESTAMP"``, ``"BOOLEAN"``, ``"NUMERIC"``, ``"LIST"``. If you don't specify a third parameter, the default is ``"STRING""``.

- The **sucess** callback returns a object called ``"result"`` with a success message.
- The **error** callback returns the same catch error object of the javascript "fetch API".

Simple Example...
```javascript
user.removeTag('TAG_NAME', 'TAG_VALUE', 'TAG_TYPE');
```
...or with callbacks!
```javascript
user.removeTag('TAG_NAME', 'TAG_VALUE', 'TAG_TYPE').then(function(result){
    
    console.debug('removeTag result', result);
    // Do something after the request succeed.
    
}).catch(function(e) {
    
    this.log.error(e);
    // Do something when catch a error.
    
});
```

###### `user.getUnreadNotifications()`

> The **getUnreadNotifications()** method is triggered without parameters. It returns the latest unread notifications.

- The **sucess** callback returns an array of objects. The list of objects has two important properties: ``pushid`` and ``payload``. The **"pushid"** information is important for further utilization, when you trigger the removeUnreadNotifications method, for example. The **"payload"** contain all information you need to know about the push notification (``title``, ``text``, ``ìcon``, ``clickUrl``, ``image``, ...).
- The **error** callback returns the same catch error object of the javascript "fetch API".
```javascript
user.getUnreadNotifications().then(function(result){
    
    console.debug('getUnreadNotifications result', result);
    // result example [{pushid: "...", payload: { title: "...", text: "...", icon: "...", clickUrl: "...", image: "...", ...}}]
    
}).catch(function(e) {
    
    this.log.error(e)
    // Do something when catch a error.
    
});
```

###### `user.getLastNotifications()`

> The **getLastNotifications()** method is triggered without parameters. It returns the latest read notifications.

- The **sucess** callback returns an array of objects. The list of objects has one important property: ``payload``. The **"payload"** contain all information you need to know about the push notification (``title``, ``text``, ``ìcon``, ``clickUrl``, ``image``, ...).
- The **error** callback returns the same catch error object of the javascript "fetch API".
```javascript
user.getLastNotifications().then(function(result){
    
    console.debug('getLastNotifications', result);
    // result example [{payload: { title: "...", text: "...", icon: "...", clickUrl: "...", image: "...", ...}}]
    
}).catch(function(e) {
    
    this.log.error(e)
    // Do something when catch a error.
    
});
```

###### `user.removeUnreadNotification(pushid)`

> The **removeUnreadNotification()** method receives a single ``"pushid"`` parameter. This parameter you get on the result of the "getUnreadNotifications()" method.

- The **sucess** callback returns a object with a success message.
- The **error** callback returns the same catch error object of the javascript "fetch API".
```javascript
user.removeUnreadNotification(pushid).then(function(result){
    
    console.debug('removeUnreadNotification result', result);
    
}, function(e) {
    
    this.log.error(e);
    // Do something when catch a error.
    
});
```

###### `user.removeAllUnreadNotifications()`

> The **removeAllUnreadNotifications()** method is triggered without parameters.

- The **sucess** callback returns a object with a success message.
- The **error** callback returns the same catch error object of the javascript "fetch API".
```javascript
user.removeAllUnreadNotifications().then(function(result){
    
    console.debug('removeAllUnreadNotifications result', result);
    
}, function(e) {
    
    this.log.error(e);
    // Do something when catch a error.

});
```

###### `user.getAlias()`

> Important! Note that this function don't return a Promise. It returns a string value.

```javascript
var alias = user.getAlias();
```

### Full Example:

```javascript
window.addEventListener('load', function() {
    
    if (!Smartpush) {
        this.log.error('The Smartpush lib was not loaded correctly.');
        // Disable or hide your UI elements, "web push notifications" are not supported because the SDK was not loaded.
        return;
    }

    var webpush = Smartpush.create({
        devid: 'DEVID',
        appid: {
            chrome: 'APPID',
            safari: 'APPID',
            firefox: 'APPID'
        }
    });
    if (!webpush) {
        console.warn('This Browser probably dont support all features required to run web push service');
        // Disable or hide your UI elements, "web push notifications" are not supported because this Browser dont support all needed features.
        return;
    }
    
    element.on('click', function(){ // note: this represents a clickable element
    
        webpush.getUser().then(function(user) {
            // get notifications
            user.getLastNotifications().then(function(result){
                
                // create and open notifications ui 
                
            }).catch(function(e) {
                
                this.log.error(e)
                // Do something when catch a error.
                
            });
        }).catch(function(status) {
            switch (status) {
                case 'default':
                    // ask to send push notification
                    webpush.subscribe().then(function() {
                        // open notifications ui
                        // ...
                    }).catch(function(status) {
                        // get status and do something
                    });
                    break;
                case 'denied':
                    // the user has already denied the request
                    break;
                case 'error': 
                    // inspect the console for problems
                    break;
            }
        });
    });
});
```

### List of browser features required
- Notifications API

### Supported Browsers
- Chrome
- Firefox
- Safari (OS X Mavericks - 10.9+)

### Support
Jonathan Martins
webmaster@getmo.com.br
---

> Developed by Getmo
