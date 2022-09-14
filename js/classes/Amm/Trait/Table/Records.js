/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global Amm */

Amm.Trait.Table.Records = function(options) {
};

Amm.Trait.Table.Records.prototype = {
    
    'TableRecords': '__INTERFACE__',
    
    _recordset: null,

    _mapper: null,
    
    __augment: function() {
        Amm.createProperty(this, 'recordset', null, null, true);
        Amm.createProperty(this, 'mapper', null, null, true);
    },

    setRecordset: function(recordset) {
        if (typeof recordset === 'object' && !Amm.getClass(recordset)) {
            recordset = Amm.constructInstance(recordset, 'Amm.Data.Recordset');
        } else {
            Amm.is(recordset, 'Amm.Data.Recordset');
        }
        var oldRecordset = this._recordset;
        if (oldRecordset === recordset) return;
        this._recordset = recordset;
        if (this._mapper) recordset.setMapper(this._mapper);
        this.setItems(recordset.getRecordsCollection());
        this.outRecordsetChange(recordset, oldRecordset);
        return true;
    },

    getRecordset: function() { return this._recordset; },

    outRecordsetChange: function(recordset, oldRecordset) {
        this._out('recordsetChange', recordset, oldRecordset);
    },

    setMapper: function(mapper) {
        if (typeof mapper === 'object' && !Amm.getClass(mapper)) {
            mapper = Amm.constructInstance(mapper, 'Amm.Data.Mapper');
        } else {
            Amm.is(mapper, 'Amm.Data.Mapper');
        }
        var oldMapper = this._mapper;
        if (oldMapper === mapper) return;
        this._mapper = mapper;
        if (this._recordset) this._recordset.setMapper(mapper);
        this.outMapperChange(mapper, oldMapper);
        return true;
    },

    getMapper: function() { return this._mapper; },

    outMapperChange: function(mapper, oldMapper) {
        this._out('mapperChange', mapper, oldMapper);
    },
    
    _endInit_tableRecordset: function() {
        if (this._mapper && !this._recordset) this.setRecordset({});
    },
    
    
};
