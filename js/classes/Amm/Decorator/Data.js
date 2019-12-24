/* global Amm */

Amm.Decorator.Data = function(options) {
    Amm.Decorator.call(this, options);
};

Amm.Decorator.Data.prototype = {

    'Amm.Decorator.Data': '__CLASS__', 
    
    _filter: null,
    
    /**
     * "conditions" parameter for Amm.Filter intance
     * @type object
     */
    _conditions: null,

    setConditions: function(conditions) {
        if (!conditions && typeof conditions === 'object') throw Error ("`conditions` must be a non-null object");
        if (!Amm.keys(conditions).length) {
            conditions = null;
        }
        if (conditions && this._actions) this._checkActions(conditions, this._actions);
        this._conditions = conditions;
        if (this._filter) {
            this._filter.cleanup();
            this._filter = null;
        }
        return true;
    },

    getConditions: function() { return this._conditions; },

    /**
     * hash {matchValue: oneOrMoreActions[, default: action]}
     * where oneOrMoreActions is Array of Amm.Decorator.Data.Action prototypes
     * 
     * @type object
     */
    _actions: null,

    setActions: function(actions) {
        if (!actions && typeof actions === 'object') throw Error ("`actions` must be a non-null object");
        if (!Amm.keys(actions).length) {
            this._actions = null;
            return;
        }
        if (this._conditions && actions) this._checkActions(this._conditions, actions);
        this._actions = actions;
        return true;
    },
    
    _checkActions: function(conditions, actions) {
        var ck = Amm.keys(conditions);
        var ak = Amm.keys(actions);
        var extraCrit = Amm.Array.diff(ck, ak);
        if (extraCrit.length) throw Error("Mismatch in `critera` and `action` keys: some conditions ('" 
                + extraCrit.join("', '") + "') don't have corresponding actions");
        
        var extraAct =  Amm.Array.diff(ak, ck.concat(['default']));
        if (extraAct.length) throw Error("Mismatch in `critera` and `action` keys: some actions ('" 
                + extraCrit.join("', '") + "') don't have corresponding conditions");
    },

    getActions: function() { return this._actions; },

    decorate: function(value) {
        if (!this._conditions || !this._actions) return value;
        if (!this._filter) {
            var c = [], cond;
            for (var i in this._conditions) if (this._conditions.hasOwnProperty(i)) {
                cond = this._conditions[i];
                if (typeof cond === 'string') cond = {_expr: cond};
                c.push(Amm.override({_id: i}, cond));
            }
            this._filter = new Amm.Filter({conditions: c});
        }
        var result = this._filter.evaluateMatch(value);
        if (!this._actions[result]) result = 'default';
        if (!this._actions[result]) return value; // no matching action
        var out = {};
        this._applyActions(value, this._actions, result, out);
        return out;
    },
    
    _applyActions: function(value, actionsObject, action, out) {
        var action = actionsObject[action];
        if (action instanceof Array) {
            for (var i = 0, l = action.length; i < l; i++) {
                this._applyActions(value, action, i, out);
            }
            return;
        }
        if (!action['Amm.Decorator.Data.Action']) {
            action = actionsObject[action] = Amm.constructInstance(action, 'Amm.Decorator.Data.Action');
            action.apply(value, out);
        }
    }
    
};

Amm.extend(Amm.Decorator.Data, Amm.Decorator);

