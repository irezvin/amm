/* global Amm */

/**
 * View binds events {Name}Change of element to setV{Name} setters of the adapter.
 * 
 * Also, initially, view applies two-way initialization:
 * - element values that are "undefined" are set to the values extracted from the view
 *   (methods getV{Name});
 * - other element values are passed to corresponding setters
 */
Amm.View.Abstract = function(options) {
    this.parentView = Amm.View.Abstract.parentView;
    Amm.callMethods(this, '_preInit_', options);
    Amm.ElementBound.call(this, options);
    Amm.init(this, options, ['element', 'elementPath']);
    if (options && 'id' in options) this.id = options.id;
    if (!this.id) this.id = Amm.getClass(this);
};

Amm.View.Abstract.waitForView = function(element, id, className, callback, scope) {
    var v = element.findView(id, className);
    if (v && v.getObserving()) {
        callback.call(scope, v, element);
        return null;
    }
    var handler = ( function() { 
        var localHandler;
        localHandler = function(view) {
            if (id !== undefined && view.id !== id) return;
            if (className !== undefined && !Amm.is(view, className)) return;
            callback.call(scope, v, element);
            element.unsubscribe('viewReady', localHandler);
        };
        return localHandler;
    } ) ();
    element.subscribe('viewReady', handler);
    return handler;
};

Amm.View.Abstract.stopWaitingForView = function(element, handler) {
    element.unsubscribe('viewReady', handler);
};

Amm.View.Abstract.prototype = {

    'Amm.View.Abstract': '__CLASS__', 
    
    // Init "undefined" element properties with values extracted from the view
    twoWayInit: true,
    
    // Define this in descendants to make _hasPresentation work properly. 
    // Only when both this[this._presentationPropery] and this._element are non-null, 
    // _canObserve() will return true.
    _presentationProperty: null,
    
    _observing: null,
    
    _initDone: false,
    
    id: null,
    
    // Is filled in with Amm.View.Abstract.parentView; views that create elements with default views
    // may use Amm.View.Abstract.pushParentView() to fill-in that property
    parentView: null,
    
    getIsReady: function() {
        return this.getObserving();
    },
    
    getObserving: function() {
        return this._observing;
    },
    
    _doElementChange: function(element, oldElement) {
        if (this._observing) this._endObserve();
        if (oldElement) oldElement.notifyViewDeleted(this);
        Amm.ElementBound.prototype._doElementChange.call(this, element, oldElement);
        if (element) element.notifyViewAdded(this);
        Amm.callMethods(this, '_elementChange_', element, oldElement);
        this._tryObserve();
    },
    
    _canObserve: function() {
        if (!this._presentationProperty) return false;
        return !!(this._element && this[this._presentationProperty]);
    },
    
    _endObserve: function() {
        this._observing = false;
        if (this._element) this._element.unsubscribe(undefined, undefined, this);
        this._releaseResources();
    },
    
    _tryObserve: function() {
        var can = this._canObserve();
        if (!can) {
            if (this._observing) this._endObserve();
            return;
        }
        if (this._observing) return;
        this._observing = true;
        this._acquireResources();
        var bindList = [], props = {};
        for (var i in this) {
            if (i[3] !== 'V' && i[7] !== 'E') continue;
            if (typeof this[i] !== 'function') continue;
            var px = ('' + i).slice(0, 4);
            if (px === 'setV' || px === 'getV') {
                var prop = i[4].toLowerCase() + i.slice(5);
                if (!props[prop]) {
                    props[prop] = true;
                    this._observeProp(prop, 'setV' + i.slice(4), bindList);
                }
            } else if (i.slice(0, 14) === '_handleElement') {
                var ev = i[14].toLowerCase() + i.slice(15);
                if (this._element.hasEvent(ev)) {
                    this._element.subscribe(ev, this[i], this);
                }
            }
        }
        this._initProperties(bindList);
        this._initDone = true;
        this._element.notifyViewReady(this);
        return true;
    },
    
    _acquireResources: function() {
    },
    
    _releaseResources: function() {
    },
    
    _observeProp: function(propName, setterName, bindList) {
        var caps = {};
        Amm.detectProperty(this._element, propName, caps);
        if (this[setterName]) {
            // fooChanged -> setVFoo(v)
            if (caps.eventName) this._element.subscribe(caps.eventName, setterName, this);
        }
        
        if (caps.getterName) {
            caps.propName = propName;
            bindList.push(caps);
        }
    },
    
    _initProperties: function(bindList) {
        for (var i = 0; i < bindList.length; i++) {
            var caps = bindList[i], propName = caps.propName;
            propName = propName[0].toUpperCase() + propName.slice(1);
            var setV = 'setV' + propName, getV = 'getV' + propName;
            // perform 2-way init
            var elementVal = this._element[caps.getterName]();
            if (this.twoWayInit && elementVal === undefined && caps.setterName && typeof this[getV] === 'function') {
                var myVal = this[getV]();
                if (myVal !== undefined) {
                    this._element[caps.setterName](myVal);
                }
            } else {
                if (typeof this[setV] === 'function') this[setV](elementVal);
            }
        }
    },

    /**
     * If View instance is provided during element construction, element
     * may acquire list of suggested traits from a View
     */
    getSuggestedTraits: function() {
        return [];
    },
    
    _cleanup_abstractView: function() {
        this.parentView = null;
    }
    
};

Amm.View.Abstract.parentView = null;

Amm.View.Abstract._parentViewStack = [];

Amm.View.Abstract.pushParentView = function(view) {
    this._parentViewStack.push(this.parentView);
    this.parentView = view;
};

Amm.View.Abstract.popParentView = function() {
    if (!this._parentViewStack.length) {
        throw Error("Call to popParentView() without prior pushParentView()");
    }
    if (this._parentViewStack.length) this.parentView = this._parentViewStack.pop();
};

Amm.extend(Amm.View.Abstract, Amm.ElementBound);
