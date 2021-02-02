/* global Amm */

Amm.State = function(options) {
    this._data = {};
    var t = this;
    this._storeDataImmediatelyFn = function() {
        t._dataStoreTimeout = null;
        return t._storeDataImmediately();
    },
    Amm.WithEvents.call(this, options);
};

Amm.State.prototype = {

    'Amm.State': '__CLASS__', 

    /**
     * @type Amm.State.Implementation
     */
    _implementation: null,
    
    _lockNotifyImplementation: 0,
    
    _data: null,
    
    _strOldData: null,
    
    _updateLevel: 0,

    _dataStoreDelay: 500,
    
    setImplementation: function(implementation) {
        if (!implementation) implementation = null;
        else implementation = Amm.constructInstance(
                implementation, 
                'Amm.State.Implementation', 
                {
                    state: this
                }, 
                true
        );
        var oldImplementation = this._implementation;
        if (oldImplementation === implementation) return;
        this._implementation = implementation;
        this.setData(this._implementation.getData());
        this._implementation.setObserving(true);
        return true;
    },

    getImplementation: function() { return this._implementation; },
    
    cleanup: function() {
        if (this._implementation) this._implementation.cleanup();
        this._implementation = null;
    },

    // this method is called by implementation
    reportData: function(data) {
        this._lockNotifyImplementation++;
        this.setData(data);
        this._lockNotifyImplementation--;
    },

    setData: function(data, path) {
        var oldData = this._data;
        if (oldData === data) return;
        this.beginUpdate();
        if (path === undefined) {
            this._data = data;
        } else {
            if (!this._data || typeof this._data !== 'object') this._data = {};
            Amm.Util.setByPath(this._data, Amm.Util.pathToArray(path), data);
        }
        this.endUpdate();
        return true;
    },
    
    getData: function(path, def) { 
        if (path === undefined) {
            if (!this._data) return def;
            return Amm.override({}, this._data);
        }
        if (!this._data) return def;
        return Amm.Util.getByPath(this._data, Amm.Util.pathToArray(path), def);
    },

    outDataChange: function(data, oldData) {
        this._out('dataChange', data, oldData);
    },
    
    beginUpdate: function() {
        if (!this._updateLevel) this._strOldData = JSON.stringify(this._data);
        this._updateLevel++;
    },
    
    endUpdate: function() {
        if (!this._updateLevel) {
            throw Error("Call to endUpdate() without prior beginUpdate()");
        }
        this._updateLevel--;
        if (this._updateLevel) return;
        var newData = JSON.stringify(this._data);
        var strOldData = this._strOldData;
        this._strOldData = null;
        if (newData === strOldData) return;
        if (this._implementation && !this._lockNotifyImplementation) {
            this._storeData();
        }
        this.outDataChange(this._data, JSON.parse(strOldData));
    },

    setDataStoreDelay: function(dataStoreDelay) {
        var oldDataStoreDelay = this._dataStoreDelay;
        if (oldDataStoreDelay === dataStoreDelay) return;
        if (this._dataStoreTimeout) this._storeData();
        this._dataStoreDelay = dataStoreDelay;
        return true;
    },

    getDataStoreDelay: function() { return this._dataStoreDelay; },
    
    _dataStoreTimeout: null,

    _storeDataImmediatelyFn: null, // is populated by constructor
    
    _storeDataImmediately: function() {
        if (this._implementation) this._implementation.setData(this._data);
    },
    
    _storeData: function() {
        if (!this._dataStoreDelay) {
            this._storeDataImmediately();
            return;
        }
        if (this._dataStoreTimeout) window.clearTimeout(this._dataStoreTimeout);
        this._dataStoreTimeout = window.setTimeout(this._storeDataImmediatelyFn, this._dataStoreTimeout);
    }

};

Amm.extend(Amm.State, Amm.WithEvents);

