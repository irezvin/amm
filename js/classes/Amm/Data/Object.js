/* global Amm */

Amm.Data.Object = function(options) {
    if (!options) options = {};
    this._old = {};
    this._data = {};
    this._propNames = {};
    var mapper, i;
    if (!options.__mapper) throw Error("__mapper is required");
    if (options.__mapper['Amm.Data.Mapper']) mapper = options.__mapper;
    else mapper = Amm.Data.Mapper.get(options.__mapperId);
    this._mapper = mapper;
    
    var requiredClass = this._mapper.getObjectClass();
    if (requiredClass && !Amm.is(this, requiredClass)) {
        throw Error(
            "Cannot use instance of " + Amm.getClass(this)
            + " with mapper " + mapper.getId()
            + "; required class is " + requiredClass
        );
    }
    options = Amm.override(this._mapper.getObjectPrototype(), options);
    delete options.__mapper;
    if (options.lm && typeof options.lm === 'object') {
        var lmHandlers = this._extractOnHandlers(options.lm);
        if (lmHandlers) this.lm._initOnHandlers(lmHandlers);
        delete options.lm;
    }
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
    if (hasOtherProps) this.lm.hydrate(options);
};

Amm.Data.Object.prototype = {

    'Amm.Data.Object': '__CLASS__',
    
    /**
     * @type {Amm.Data.Mapper}
     */
    _mapper: null,
    
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
     * LifecycleAndMeta instance that is responsible for working with current object.
     * @type Amm.Data.LifecycleAndMeta
     */
    _lm: null,
    
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
    
    /**
     * @returns {Amm.Data.LifecycleAndMeta}
     */
    getLm: function() {
        if (!this._lm) this._lm = new Amm.Data.LifecycleAndMeta(this);
        return this._lm;
    },
    
    // lm is read-only; does nothing
    setLm: function() {
    },
    
    // added for compatibility with observers; never fires
    outLmChange: function() {
    },
    
    _doOnActual: function(forSave) {
    },
    
    _doOnCreate: function() {
    },
    
    _doBeforeLoad: function(keyArg) {
    },
    
    _doAfterLoad: function() {
    },
    
    _doOnCheck: function() {
    },
    
    _checkField: function(field, value) {
    },
    
    _doBeforeDelete: function() {
    },
    
    _doAfterDelete: function() {
    },
    
    _doBeforeSave: function() {
    },
    
    _doAfterSave: function() {
    },
    
    _handleMissingEvent: function(eventName, handler, scope, extra) {
        
        // we alllow to subscribe to change events of arbitrary properties 
        // because there are times when properties are created 
        // AFTER the event handlers are attached
        
        if (eventName.match(/Change$/)) return true;
    }
    
};

Object.defineProperty(Amm.Data.Object.prototype, 'lm', {
    get: function() { return this.getLm(); }
});

//Amm.extend(Amm.Data.Object, Amm.Data);
Amm.extend(Amm.Data.Object, Amm.WithEvents);
