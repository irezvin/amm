/* global Amm */

Amm.View.Abstract.Select = function(options) {
    Amm.View.Abstract.call(this, options);
    this._requireInterfaces('Select');
};

Amm.View.Abstract.Select.prototype = {

    'Amm.View.Abstract.Select': '__CLASS__', 
    
    _fieldView: null,
    
    _collectionView: null,
    
    _observeElementIfPossible: function() {
        var res = Amm.View.Abstract.prototype._observeElementIfPossible.call(this);
        if (res) this._doObserveSelect();
        return res;
    },
    
    _createFieldView: function() {
        // must be overridden
    },
    
    _createCollectionView: function() {
        // must be overridden
    },
    
    _doObserveSelect: function() {
        if (!this._collectionView) this._createCollectionView();
        this._collectionView.setElement(this._element);
        if (!this._fieldView) this._createFieldView();
        this._fieldView.setElement(this._element);
    },
    
    _endObserve: function() {
        this._fieldView.setElement(null);
        this._collectionView.setElement(null);
    }
    
};

Amm.extend(Amm.View.Abstract.Select, Amm.View.Abstract);
