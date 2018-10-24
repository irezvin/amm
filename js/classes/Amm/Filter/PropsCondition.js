/* global Amm */

Amm.Filter.PropsCondition = function(filter, options) {
    
    Amm.Filter.Condition.call(this, filter, options);
    
    this.props = {};
    
    this.propList = [];
    
    for (var i in options) if (i[0] !== '_' && options.hasOwnProperty(i)) {
        this.props[i] = options[i];
        this.propList.push(i);
    }
    
};

Amm.Filter.PropsCondition.prototype = {

    'Amm.Filter.PropsCondition': '__CLASS__', 
    
    props: null,
    
    propList: null,
    
    subscribedObjects: [],
    
    // TODO: perhaps we need to subscribe objects centrally through Filter
    // TODO 2: support adding/deleting props and changing test conditions
    
    handleObjectPropertyChange(value, oldValue) {
        var propName = arguments[arguments.length - 1];
        var object = Amm.event.origin;
    },
    
    subscribe: function(object) {
        if (!this.propList.length || !object['Amm.WithEvents']) return;
        for (var i = 0, l = this.propList.length; i < l; i++) {
            var prop = this.propList[i], e = prop + 'Change';
            if (object.hasEvent(e)) {
                object.subscribe(e, this.handleObjectPropertyChange, this, prop);
            }
        }
        var idx = Amm.Array.indexOf(object, this.subscribedObjects);
        if (idx < 0) this.subscribedObjects.push(object);
    },
    
    unsubscribe: function(object) {
        if (!this.propList.length || !object['Amm.WithEvents']) return; 
        var idx = Amm.Array.indexOf(object, this.subscribedObjects);
        if (idx >= 0) this.subscribedObjects.splice(idx, 1);
    }

};

Amm.extend(Amm.Filter.PropsCondition, Amm.Filter.Condition);

