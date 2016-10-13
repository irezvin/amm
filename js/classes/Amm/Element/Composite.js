/* global Amm */
/* global Ajs_Util */

Amm.Element.Composite = function(options) {
    this._children = {};
    Amm.Element.call(this, options);
};

Amm.Element.Composite.prototype = {
    
    'Amm.Element.Composite': '__CLASS__',
    
    _requiredChildClass: 'Amm.Element',
    
    _children: null,
    
    _autoId: function(child) {
        return (Amm.getClass(child) || '__auto__') + child._amm_id;
    },
    
    addChild: function(child) {
        if (!child || typeof child !== 'object') throw "`child` must be a non-null object";
        if (this._requiredChildClass) Amm.is(child, this._requiredChildClass, 'child');
        var id = child.getId();
        if (!id) {
            id = this._autoId(child);
            if (!id) throw "`child` doesn't have Id, cannot auto-assign";
            child.setId(id);
        }
        if (this.hasChild(child)) return; // bingo - have it already
        if (this.children[id]) {
            if (this.children[id] !== child) throw "Parent already has child with id '" + id + "'";
            else throw "Assertion: hasChild() returned FALSE, but the instance is there!";
        }
        this.children[id] = child;
        this._subscribeChild(child);
        return true;
    },
    
    _subscribeChild: function(child) {
        
    },
    
    _handleChildIdChange: function(child, oldId) {
        
    },
    
    hasChild: function(child) {
        return this._children[child.getId()] === child;
    },
    
    listChildren: function() {
        return Ajs_Util.hashKeys(this._children);
    },
    
};

Amm.extend(Amm.Element.Composite, Amm.Element);