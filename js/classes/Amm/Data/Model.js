/* global Amm */

Amm.Data.Model = function(options) {

    if (!options) options = {};
    else options = Amm.override({}, options);

    this._old = {};
    this._data = {};
    this._propNames = {};
    
    var i;

    Object.defineProperty(this, 'mm', {
        get: function() { return this.getMm(); },
        set: function() {}
    });
    
    var newOptions = this._preInitOptions(options);
    if (newOptions !== undefined) options = newOptions;

    var mmOptions = null;
    if (options.mm && typeof options.mm === 'object') mmOptions = options.mm;
    this._mm = new (Amm.getFunction(this._metaClass)) (this, options.mm || {});
    delete options.mm;
    
    // all options except "on__" and functions are considered properties
    Amm.WithEvents.call(this, options, true);
    for (i in options) if (options.hasOwnProperty(i)) {
        if (typeof options[i] === 'function') {
            this[i] = options[i];
            delete options[i];
        }
    }
    var hasOtherProps = false;
    for (i in options) if (options.hasOwnProperty(i)) {
        hasOtherProps = true;
        break;
    }
    if (hasOtherProps) this._initData(options);
    
};

Amm.Data.Model.prototype = {
    
    _metaClass: 'Amm.Data.ModelMeta',
    
    /**
     * { field: value } hash of current values
     * 
     * @type object
     */
    _data: null,
    
    /**
     * { field: value } hash of original (source-provided) values.
     * Also contains current key that will be used when we need to modify the key during the saving.
     * Updated when object is loaded/saved.
     * 
     * @type object 
     */
    _old: null,

    /**
     * ModelMeta instance that is responsible for working with current object.
     * @type Amm.Data.ModelMeta
     */
    _mm: null,
    
    /**
     * Whether cleanup in progress
     * @type bool
     */
    _cu: false,
    
    _state: Amm.Data.STATE_NEW,
    
    _propNames: null,
    
    _preUpdateValues: null,
    
    /**
     * Contains three hashes: local, remote, all
     */
    _errors: null,
    
    /**
     * Contains three hashes: local, remote, all
     */
    _oldErrors: null,
    
    _preInitOptions: function(options) {
    },
    
    _initData: function(options) {
        this.mm.hydrate(options);
    },
    
    /**
     * @returns {Amm.Data.ModelMeta}
     */
    getMm: function() {
        return this._mm;
    },
    
    // mm is read-only; does nothing
    setMm: function() {
    },
    
    // added for compatibility with observers; never fires
    outMmChange: function() {
    },
    
    _doOnActual: function(forSave) {
    },
    
    _doOnCheck: function() {
    },
    
    _checkField: function(field, value) {
    },
    
    _handleMissingEvent: function(eventName, handler, scope, extra) {
        
        // we alllow to subscribe to change events of arbitrary properties 
        // because there are times when properties are created 
        // AFTER the event handlers are attached
        
        if (eventName.match(/Change$/)) return true;
    },
    
    cleanup: function() {
        if (this._cu) return;
        this._cu = true;
        this.mm.cleanup();
        this._data = {};
        this._old = {};
        Amm.WithEvents.prototype.cleanup.call(this);
    }
    
};

Amm.extend(Amm.Data.Model, Amm.WithEvents);