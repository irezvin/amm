/* global Amm */

Amm.Drag.Vector = function(options) {
    this.precision = Amm.Drag.Vector.defaultPrecision;
    Amm.init(this, options);
};

Amm.Drag.Vector.defaultPrecision = 0.1;

Amm.Drag.Vector.prototype = {
    
    'Amm.Drag.Vector': '__CLASS__', 
    
    precision: Amm.Drag.Vector.defaultPrecision,
    
    _x0: null,

    _y0: null,

    _x1: null,

    _y1: null,
    
    _dX: null,

    _dY: null,
    
    _immutable: false,
    
    _upd: function(num, name) {
        var val = parseFloat(num);
        if (isNaN(val)) throw Error("Amm.Drag.Vector.`" + name + "` must be a number; given: '" + num + "'");
        if (this._immutable && this['_' + name] !== null && this['_' + name] !== val) {
            throw Error("Cannot modify '" + name + "': Amm.Drag.Vector is immutable");
        }
        this['_' + name] = val;
    },

    setX0: function(x0) {
        this._upd(x0, 'x0');
        this._x1 = this._x0 + this._dX;
    },

    getX0: function() { return this._x0; },

    setY0: function(y0) {
        this._upd(y0, 'y0');
        this._y1 = this._y0 + this._dY;
    },

    getY0: function() { return this._y0; },

    setX1: function(x1) {
        this._upd(x1, 'x1');
        this._dX = this._x1 - this._x0;
    },

    getX1: function() { return this._x1; },

    setY1: function(y1) {
        this._upd(y1, 'y1');
        this._dY = this._y1 - this._y0;
    },

    getY1: function() { return this._y1; },

    setDX: function(dX) {
        this._upd(dX, 'dX');
        this._x1 = this._x0 + this._dX;
    },

    getDX: function() { return this._dX; },

    setDY: function(dY) {
        this._upd(dY, 'dY');
        this._y1 = this._y0 + this._dY;
    },

    getDY: function() { return this._dY; },
    
    getLength: function() {
        return Math.sqrt(Math.pow(this._dY, 2) + Math.pow(this._dX, 2));
    },
    
    clone: function(upd) {
        var res = new Amm.Drag.Vector({
            x0: this.x0,
            y0: this.y0,
            x1: this.x1,
            y1: this.y1,
            dX: this.dX,
            dY: this.dY
        });
        if (upd && typeof upd === 'object') {
            res._immutable = false;
            Amm.setProperty(res, upd);
            res._immutable = true;
        }
        return res;
    },
    
    add: function(vector) {
        var res = this.clone({
            dX: this._dX + vector._dX,
            dY: this._dY + vector._dY
        });
        return res;
    },
    
    sameDirLength: function(vector) {
        return Math.abs(vector._dX - this._dX) < this.precision
            && Math.abs(vector._dY - this._dY) < this.precision;
    },
    
    same: function(vector) {
        if (!vector) return false;
        Amm.is(vector, 'Amm.Drag.Vector', vector);
        if (vector === this) return;
        if (!this.sameDirLength(vector)) return false;
        return Math.abs(vector.x0 - this.x0) < this.precision
            && Math.abs(vector.y0 - this.y0) < this.precision;
    }
    
};

Amm.createProperty(Amm.Drag.Vector.prototype, 'x0', null, null, true);
Amm.createProperty(Amm.Drag.Vector.prototype, 'y0', null, null, true);
Amm.createProperty(Amm.Drag.Vector.prototype, 'x1', null, null, true);
Amm.createProperty(Amm.Drag.Vector.prototype, 'y1', null, null, true);
Amm.createProperty(Amm.Drag.Vector.prototype, 'dX', null, null, true);
Amm.createProperty(Amm.Drag.Vector.prototype, 'dY', null, null, true);