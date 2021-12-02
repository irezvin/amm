/* global Amm */

Amm.Data.Record = function(options) {
    Amm.Data.Model.call(this, options);
};

Amm.Data.Record.prototype = {

    'Amm.Data.Record': '__CLASS__',
    
    _metaClass: 'Amm.Data.RecordMeta',
    
    /**
     * @type {Amm.Data.Mapper}
     */
    _mapper: null,
    
    _preInitOptions: function(options) {
    
        var mapper;
        if (!options.__mapper) throw Error("__mapper is required");
        if (options.__mapper['Amm.Data.Mapper']) mapper = options.__mapper;
        else mapper = Amm.Data.Mapper.get(options.__mapperId);
        this._mapper = mapper;

        var requiredClass = this._mapper.getRecordClass();
        if (requiredClass && !Amm.is(this, requiredClass)) {
            throw Error(
                "Cannot use instance of " + Amm.getClass(this)
                + " with mapper " + mapper.getId()
                + "; required class is " + requiredClass
            );
        }
        options = Amm.override(this._mapper.getRecordOptions(), options);
        delete options.__mapper;
        return options;
        
    },
    
    _doOnActual: function(forSave, mode) {
    },
    
    /**
     * possible return values: 
     * - FALSE to abort loading; 
     * - any other value than undefined will replace the key that will be used to load record
     */
    _doBeforeLoad: function(keyArg) {
    },
    
    _doAfterLoad: function() {
    },
    
    _doBeforeDelete: function() {
    },
    
    _doAfterDelete: function() {
    },
    
    _doBeforeSave: function() {
    },
    
    _doAfterSave: function() {
    },
    
};

Amm.extend(Amm.Data.Record, Amm.Data.Model);