/* global Amm */

Amm.MultiObserver.Filter.PropsCondition = function(options) {
    this._expressions = {};
    this._evaluators = {};
    this._propList = [];
    this._props = {};
    var props;
    if (options) {
        if ('allowExpressions' in options) {
            this.allowExpressions = options.allowExpressions;
        }
        if ('props' in options) {
            options = Amm.override({}, options);
            props = options.props;
            delete options.props;
        }
    }
    Amm.MultiObserver.Filter.Condition.call(this, options);
    if (props) this.setProps(props);
};

Amm.MultiObserver.Filter.propNameRx = /^\w+$/;

Amm.MultiObserver.Filter.PropsCondition.prototype = {

    'Amm.MultiObserver.Filter.PropsCondition': '__CLASS__', 
    
    allowExpressions: true,
    
    _props: null,
    
    _expressions: null,
    
    _evaluators: null,
    
    _propList: null,
    
    _noRefresh: 0,
    
    _checkProps: function(props, expressionList) {
        if (!expressionList) expressionList = {};
        for (var i = 0, l = props.length; i < l; i++) {
            if (Amm.MultiObserver.Filter.propNameRx.exec(props[i])) continue;
            if (!this.allowExpressions) {
                throw Error("'" + props[i] + "' doesn't look like simple property name; "
                    + " set `allowExpressions` to true to access expression values");
            }
            if (this._expressions[props[i]]) {
                expressionList[props[i]] = this._expressions[props[i]];
                continue;
            }
            expressionList[props[i]] = new Amm.Expression(props[i]);
            expressionList[props[i]].setEventsProxy(this._multiObserver);
        }
    },
    
    setProps: function(props, propName) {
        this._noRefresh++;
        var expressionList = {};
        var oldProps;
        if (this._subscribers.propsChange) {
            oldProps = Amm.override({}, this._props);
        }
        if (propName) {
            var isNewProp = !(propName in this._props);
            this._checkProps([propName], expressionList);
            this._props[propName] = props;
            if (isNewProp) {
                if (this.allowExpressions) {
                    Amm.override(this._expressions, expressionList);
                }
                this._propList.push(propName);
                this._sub(propName);
            }
        } else if (props) {
            var propList = Amm.keys(props);
            this._checkProps(propList, expressionList);
            this.deleteProps(null, expressionList);
            if (this.allowExpressions) {
                Amm.override(this._expressions, expressionList);
            }
            this._props = Amm.override({}, props);
            this._propList = propList;
            this._sub();
        } else {
            this.deleteProps();
        }
        if (this._subscribers.propsChange)
            this.outPropsChange(this._props, oldProps);
        this._noRefresh--;
        if (!this._noRefresh) this._multiObserver.refresh();
    },
    
    _handleChange: function() {
        var o = Amm.event.origin; // event origin must be our object
        
        // sub-optimal (eval all conditions for all observed change events)
        this._multiObserver.refresh(o); 
    },
    
    _handleExpressionChange: function(value, oldValue) {
        var o = Amm.event.origin.getExpressionThis();
        this._multiObserver.refresh(o); 
    },
    
    _sub: function(props, objects) {
        var oo = objects || this._multiObserver._objects, l = oo.length, i, o, ev;
        if (!props) props = this._propList;
        var j, pl = props.length;
        for (i = 0; i < l; i++) {
            o = oo[i];
            if (!o['Amm.WithEvents']) continue;
            for (j = 0; j < pl; j++) {
                
                if (this._expressions[props[j]]) {
                    var c = this._expressions[props[j]].findContext(o);
                    if (c !== undefined) continue;
                    this._expressions[props[j]].createContext({expressionThis: o});
                    this._expressions[props[j]].subscribe('valueChange', this._handleExpressionChange, this);
                    continue;
                }
                
                ev = props[j] + 'Change';
                
                // no need to subscribe objects that don't have required class
                if (this.requiredClass && !Amm.is(o, this.requiredClass)) continue; 
                if (!o.hasEvent(ev)) continue;
                this._multiObserver.subscribeObject(o, ev, this._handleChange, this);
            }
        }
    },
    
    // if props is not provided, will unsubscribe from all events
    _unsub: function(props, objects) {
        var oo = objects || this._multiObserver._objects, l = oo.length, i, o, ev;
        if (!props) props = this._propList;
        var j, pl = props? props.length : 0;
        for (i = 0; i < l; i++) {
            o = oo[i];
            if (!o['Amm.WithEvents']) continue;
                
            // we didn't subscribed to objects that didn't have required class
            if (this.requiredClass && !Amm.is(o, this.requiredClass)) continue; 
            
            for (j = 0; j < pl; j++) {
                if (this._expressions[props[j]]) {
                    var ctx = this._expressions[props[j]].findContext(o);
                    if (ctx !== undefined) this._expressions[props[j]].deleteContext(ctx);
                    continue;
                }
                ev = props[j] + 'Change';
                if (this._expressions[props[j]]) continue;
                if (!o.hasEvent(ev)) continue;
                this._multiObserver.unsubscribeObject(o, ev, this._handleChange, this);
            }
        }
    },
    
    _doGetValue: function(object) {
        var exp, ctxId, val;
        for (var i = 0, l = this._propList.length; i < l; i++) {
            if ((exp = this._expressions[this._propList[i]])) {
                if (exp.getExpressionThis() === object) {
                    val = exp.getValue();
                } else {
                    ctxId = exp.findContext(object);
                    if (ctxId === undefined) {
                        if (!this._evaluators[this._propList[i]]) 
                            this._evaluators[this._propList[i]] = exp.toFunction();
                        this._evaluators[this._propList[i]].env.expressionThis = object;
                        val = this._evaluators[this._propList[i]]();
                    } else {
                        exp.setContextId(ctxId);
                        val = exp.getValue();
                    }
                }
            } else {
                val = Amm.getProperty(object, this._propList[i]);
            }
            if (!Amm.MultiObserver.Filter.Condition.testValue(val, this._props[this._propList[i]])) {
                return false;
            }
        }
        return true;
    },
    
    observe: function(objects) {
        this._sub(this._propList, objects);
    },
    
    unobserve: function(objects) {
        this._unsub(null, objects);
    },
    
    getProps: function(propName) {
        if (propName) return this._props[propName];
        
        // notice: returning internal data structure by reference
        return this._props;
    },
    
    deleteProps: function(propName, expressionsToLeave) {
        
        if (propName && !(propName instanceof Array)) {
            propName = [propName];
        }
        
        this._unsub(propName);
        
        if (!propName) {
            this._props = {};
            this._propList = [];
        } else {
            for (var i = 0, l = propName.length; i < l; i++) {
                delete this._props(propName[i]);
                if (!this._expressions[propName[i]]) continue;
                if (expressionsToLeave && expressionsToLeave[propName[i]]) continue;
                this._expressions[propName[i]].cleanup();
                if (this._evaluators[[propName[i]]]) {
                    this._evaluators[[propName[i]]].env.expressionThis = {};
                    delete this._evaluators[[propName[i]]];
                }
                delete this._expressions[propName[i]];
            }
            this._propList = Amm.Array.diff(this._propList, propName);
        }
        
        if (!this._noRefresh) this._multiObserver.refresh();
        
    },
    
    outPropsChange: function(props, oldProps) {
        return this._out('propsChange', props, oldProps);
    },
    
    cleanup: function() {
        Amm.MultiObserver.Filter.Condition.prototype.cleanup.call(this);
        for (var i in this._expressions) if (this._expressions.hasOwnProperty(i)){
            this._expressions[i].cleanup();
        }
        this._expressions = {};
        this._evaluators = {};
        this._propList = [];
        this._props = {};
    },
    
    
};

Amm.extend(Amm.MultiObserver.Filter.PropsCondition, Amm.MultiObserver.Filter.Condition);
