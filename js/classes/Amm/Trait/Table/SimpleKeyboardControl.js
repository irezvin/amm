/* global Amm */

Amm.Trait.Table.SimpleKeyboardControl = function(options) {
};

Amm.Trait.Table.SimpleKeyboardControl.prototype = {

    'SimpleKeyboardControl': '__INTERFACE__',
    
    notifyNavBeforeFirstRow: function() {
        var retHandled = {handled: false};
        this.outNavBeforeFirstRow(retHandled);
        return retHandled.handled;
    },
    
    notifyNavPastLastRow: function() {
        var retHandled = {handled: false};
        this.outNavPastLastRow(retHandled);
        return retHandled.handled;
    },
    
    notifyDeleteItem: function(item, wasBlank) {
        var retHandled = {handled: false};
        this.outDeleteItem(item, wasBlank, retHandled);
        return retHandled.handled;
    },
    
    notifyAddBlankItem: function() {
        var retHandledItem = {handled: false, item: null};
        this.outAddBlankItem(retHandledItem);
        if (retHandledItem.handled) return retHandledItem.handled;
        if (retHandledItem.item && typeof(retHandledItem.item) === 'object') {
            return retHandledItem.item;
        }
        return false;
    },
    
    checkIsItemBlank: function(item) {
        var retResult = {result: undefined};
        this.outCheckIsItemBlank(item, retResult);
        if (retResult.result === undefined) {
            return this._checkIsItemBlank(item);
        }
        return retResult.result;
    },
    
    _checkIsItemBlank: function(item) {
        return item['Amm.Data.Model'] && !Amm.values(item.mm.getData()).join("");
    },
    
    notifyLeaveBlankItem: function() {
        var retHandled = {handled: false};
        return retHandled.handled;
    },
    
    notifyHome: function(toTheLast) {
        var retHandled = {handled: false};
        this.outHome(toTheLast, retHandled);
        return retHandled.handled;
    },
    
    notifyEnd: function(toTheLast) {
        var retHandled = {handled: false};
        this.outEnd(toTheLast, retHandled);
        return retHandled.handled;
    },
    
    notifyPageUp: function() {
        var retHandled = {handled: false};
        this.outPageUp(retHandled);
        return retHandled.handled;
    },
    
    notifyPageDown: function() {
        var retHandled = {handled: false};
        this.outPageDown(retHandled);
        return retHandled.handled;
    },
    
    outNavBeforeFirstRow: function(retHandled) {
        if (!retHandled) retHandled = {handled: false};
        return this._out('navBeforeFirstRow', retHandled);
    },
    
    outNavPastLastRow: function(retHandled) {
        if (!retHandled) retHandled = {handled: false};
        return this._out('navPastLastRow', retHandled);
    },
    
    outDeleteItem: function(item, wasBlank, retHandled) {
        if (!retHandled) retHandled = {handled: false};
        return this._out('deleteItem', item, wasBlank, retHandled);
    },
    
    outAddBlankItem: function(retHandledItem) {
        if (!retHandledItem) retHandledItem = {handled: false, item: null};
        return this._out('addBlankItem', retHandledItem);
    },
    
    outCheckIsItemBlank: function(item, retResult) {
        if (!retResult) retResult = {result: undefined};
        return this._out('checkIsItemBlank', item, retResult);
    },
    
    outLeaveBlankItem: function(retHandled) {
        if (!retHandled) retHandled = {handled: false};
        return this._out('leaveBlankItem', retHandled);
    },
    
    outHome: function(toTheLast, retHandled) {
        return this._out('home', retHandled);
    },
    
    outEnd: function(retHandled) {
        return this._out('end', retHandled);
    },
    
    outPageUp: function(retHandled) {
        return this._out('pageUp', retHandled);
    },
    
    outPageDown: function(retHandled) {
        return this._out('pageDown', retHandled);
    },
    
};