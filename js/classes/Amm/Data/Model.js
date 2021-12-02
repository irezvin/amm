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
    var mmp = this._getMmOptions();
    if (mmp) {
        if (mmOptions) {
            if (!Amm.getClass(mmOptions)) {
                mmp = Amm.overrideRecursive({}, mmp);
                Amm.overrideRecursive(mmp, mmOptions);
            }
            else mmp = mmOptions;
        }
    } else {
        mmp = mmOptions;
    }
    this._mm = new (Amm.getFunction(this._metaClass)) (this, mmp || {});
    this._mm._lockAnyChange++;
    delete options.mm;
    
    // all options except "on__" and functions are considered properties
    Amm.WithEvents.call(this, null, true);
    var onHandlers = this._extractOnHandlers(options);
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
    if (onHandlers) this._initOnHandlers(onHandlers);
    this._mm._lockAnyChange--;
    
    
};

Amm.Data.Model.prototype = {
    
    _metaClass: 'Amm.Data.ModelMeta',
    
    'Amm.Data.Model': '__CLASS__',
    
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
    
    _init: 0,
    
    _beginInit: function() {
        this._init++;
    },
    
    _endInit: function() {
        this._init--;
        if (!this._init) this._mm.compute();
    },
    
    /**
     * Contains three hashes: local, remote, all
     */
    _oldErrors: null,
    
    _preInitOptions: function(options) {
    },
    
    _initData: function(options) {
        this.mm.hydrate(options);
    },
    
    _getMmOptions: function() {
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
    
    _doOnActual: function(forSave, hydrateMode) {
    },
    
    _doOnCheck: function() {
    },
    
    _doOnCompute: function() {
    },
    
    _checkField: function(field, value) {
    },
    
    _handleMissingEvent: function(eventName, handler, scope, extra) {
        
        // we alllow to subscribe to change events of arbitrary properties 
        // because there are times when properties are created 
        // AFTER the event handlers are attached
        
        if (eventName.match(/Change$/)) return true;
    },
    
    // we suppress any events until the model finished initializing
    _out: function() {
        if (this._init) return;
        Amm.WithEvents.prototype._out.apply(this, Array.prototype.slice.call(arguments));
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
