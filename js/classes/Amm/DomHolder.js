/* global Amm */

Amm.DomHolder = function() {
    Amm.registerItem(this);
};

Amm.DomHolder.find = function(selector, inside, throwIfNotFound) {
    var att = Amm.domHolderAttribute, res = [], lst = {};
    jQuery(selector)[inside? 'find' : 'closest']('[' + att + ']').each(function(idx, domNode) {
        var ids = domNode.getAttribute(att).split(' ');
        for (var i = 0, l = ids.length; i < l; i++) if (ids[i].length) lst[ids[i]] = 1;
    });
    for (var i in lst) if (lst.hasOwnProperty(i)) {
        var elm = Amm.getItem(i, throwIfNotFound);
        if (elm) res.push(elm);
    }
    return res;
};

Amm.DomHolder.prototype = {
    
    'Amm.DomHolder': '__CLASS__',
    
    // temp. false - until I'll sort this out
    _domExclusive: true, 
    
    _notifyDomNodeConflict: function(domNode, otherDomHolder) {
        if (this._domExclusive && !this._domCompat(otherDomHolder))
            throw "Element already acquired by a different DomHolder";
    },
    
    _domCompat: function(otherDomHolder) {
        var res = 
                this['Amm.ElementBound'] 
                && otherDomHolder['Amm.ElementBound'] 
                && this._element 
                && otherDomHolder._element === this._element;
        return res;
    },
    
    _acquireDomNode: function(selector) {
        var t = this, att = Amm.domHolderAttribute;
        jQuery(selector).each(function(i, domNode) {
            var v = (domNode.getAttribute(att) || ''), idx = v.indexOf(' ' + t._amm_id);
            if (idx < 0) {
                // don't have our node registered yet
                var ids = v.split(' '), items = Amm.getItem(ids);
                
                // throw: we're want to be exclusive, but we can't
                for (var i = 0, l = items.length; i < l; i++) {
                    t._notifyDomNodeConflict(domNode, items[i])
                    items[i]._notifyDomNodeConflict(domNode, t);
                }
                ids.push(t._amm_id);
                domNode.setAttribute(att, ids.join(' '));
            }
        });
    },
    
    _releaseDomNode: function(selector) {
        var t = this, id = ' ' + t._amm_id, att = Amm.domHolderAttribute;
        jQuery(selector).each(function(i, domNode) {
            if (domNode.hasAttribute(att)) {
                var v = domNode.getAttribute(att).replace(id, '');
                if (v.length) domNode.setAttribute(v);
                    else domNode.removeAttribute(v);
            }
        });
    }
    
};