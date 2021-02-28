/* global Amm */

Amm.WithEvents.Proxy = function() {
};

Amm.WithEvents.Proxy.prototype = {
    
    'Amm.WithEvents.Proxy': '__CLASS__',
    
    subscribeObject: function(object, eventName, handler, scope, extra, decorator) {
        return object.subscribe(eventName, handler, scope, extra, decorator);
    },
    
    unsubscribeObject: function(object, eventName, handler, scope, extra, decorator) {
        return object.unsubscribe(eventName, handler, scope, extra, decorator);
    },
    
    getObjectSubscribers: function(object, eventName, handler, scope, extra, decorator) {
        return object.getSubscribers(eventName, handler, scope, extra, decorator);
    },
    
    getUniqueObjectSubscribers: function(object, classOrInterface, eventName) {
        return object.getUniqueSubscribers(classOrInterface, eventName);
    },
    
    unsubscribeObjectByIndex: function(object, eventName, index) {
        return object.unsubscribeByIndex(eventName, index);
    }
    
};

Amm.WithEvents.Proxy.instance = new Amm.WithEvents.Proxy;

