/* global Amm */
Amm.Trait.Component = function() {
    this._namedElements = {};
    this._elements = [];
    this._components = [];
};

Amm.Trait.Component.changeComponent = function(items, component, oldComponent) {
    var setItems = [];
    if (oldComponent !== undefined) {
        for (var i = 0, l = items.length; i < l; i++) {
            if (items[i].getComponent() === oldComponent) {
                setItems.push(items[i]);
            }
        }
    } else {
        setItems = items;
    }
    if (component) {
        component.acceptElements(setItems);
    } else {
        for (var i = 0, l = setItems.length; i < l; i++) {
            setItems[i].setComponent(component);
        }
    }
};

Amm.Trait.Component.prototype = {

    Component: '__INTERFACE__',

    _internalId: 'component',

    _isComponent: true,
    
    _namedElements: null,
    
    _elements: null,
    
    _components: null,
    
    setInternalId: function(internalId) {
        var oldInternalId = this._internalId;
        if (oldInternalId === internalId) return;
        this._internalId = internalId;
 
        this.outInternalIdChange(internalId, oldInternalId);
        this.outRenamedElement(this, internalId, oldInternalId);
        this.outRenamedInScope(this, this, internalId, oldInternalId);
        return true;
    },

    getInternalId: function() { return this._internalId; },

    outInternalIdChange: function(internalId, oldInternalId) {
        this._out('internalIdChange', internalId, oldInternalId);
    },
    
    getClosestComponent: function() {
        return this._isComponent? this: this._component;
    },
    
    __augment: function() {
        Amm.Element.regInit(this, '95_Component_setClosestComponent', this._setClosestComponent);
    },
    
    setIsComponent: function(isComponent) {
        isComponent = !!isComponent;
        var oldIsComponent = this._isComponent;
        if (oldIsComponent === isComponent) return;
        this._isComponent = isComponent;
        this._setClosestComponent();
        this._callOwnMethods('_setIsComponent_');
        if (isComponent) {
            var children = this.findChildElements();
            if (children.length) this.acceptElements(children);
        } else {
            if (this._component) this._component.acceptElements(this.getElements());
            else this.rejectElements(this.getElements());
        }
        this.outIsComponentChange(isComponent, oldIsComponent);
        return true;
    },

    getIsComponent: function() { return this._isComponent; },

    outIsComponentChange: function(isComponent, oldIsComponent) {
        this._out('isComponentChange', isComponent, oldIsComponent);
    },
    
    _extractNameEventFromMethodName: function(methodName) {
        var px = 'handle__';
        if (methodName.indexOf(px) !== 0) return;
        var sfx = methodName.slice(px.length).split("__");
        var name, event;
        if (sfx.length === 1) { // handle__event
            name = '';
            event = sfx[0];
        } else { // handle__name__event
            name = sfx[0];
            event = sfx.slice(1).join('__');
        }
        return [name, event];
    },
    
    _listHandlersForElements: function() {
        var res = {};
        var ne;
        for (var i in this) if (typeof this[i] === 'function') {
            var ne = this._extractNameEventFromMethodName(i);
            if (!ne) continue;
            if (!res[ne[0]]) res[ne[0]] = [];
            res[ne[0]].push([ne[1], i]);
        }
        return res;
    },
    
    _subscribeElement: function(element, namedOnly, handlersList, checkAgain) {
        var name = element.getId();
        if (!name.length && namedOnly) return; // nothing to do
        var handlersList = handlersList || this._listHandlersForElements();
        var kk = [];
        if (!namedOnly && handlersList['']) kk = handlersList[''];
        if (handlersList[name]) kk = kk.concat(handlersList[name]);
        for (var i = 0, l = kk.length; i < l; i++) {
            if (element.hasEvent(kk[i][0])) {
                if (checkAgain && element.getSubscribers(kk[i][0], kk[i][1], this).length) continue;
                // we subscribe using the form `methodName`, `object`
                element.subscribe(kk[i][0], kk[i][1], this);
            }
        }
    },

    _unsubscribeElement: function(element, namedOnly) {
        var hh = element.getSubscribers(undefined, undefined, this);
        for (var i = 0, l = hh.length; i < l; i++) {
            var hdl = hh[i], m;
            if (typeof hdl[0] !== 'string') continue;
            m = this._extractNameEventFromMethodName(hdl[0]);
            if (!m) continue;
            if (!namedOnly || m[0])
                element.unsubscribe(hdl[4], hdl[0], this);
        }
    },
    
    resubscribeAllElements: function() {
        var handlersList = this._listHandlersForElements();
        for (var i = 0, l = this._elements.length; i < l; i++) {
            this._subscribeElement(this._elements[i], false, handlersList, true);
        }
    },
    
    handle__componentChange: function(component, oldComponent) {
        var element = Amm.event.origin;
        if (component === this) this.acceptElements([element]);
        else if (oldComponent === this) this.rejectElements([element]);
    },
    
    handle__idChange: function(id, oldId) {
        var element = Amm.event.origin;
        if (oldId) {
            this._deleteNamedElementEntry(element, oldId);
            this._unsubscribeElement(element, true);
        }
        if (id) {
            if (!this._namedElements[id]) {
                this._namedElements[id] = [];
            }
            this._namedElements[id].push(element);
            this._subscribeElement(element, true, undefined);
        }
        this.outRenamedElement(element, id, oldId);
        this.outRenamedInScope(this, element, id, oldId);
    },
    
    handle__isComponentChange: function(isComponent, oldIsComponent) {
        var component = Amm.event.origin;
        if (isComponent) this._registerComponent(component);
            else this._unregisterComponent(component);
        this.outChildComponentStatusChange(component, isComponent);
        this.outChildComponentStatusChangeInScope(this, component, isComponent);
    },
    
    outRenamedElement: function(element, id, oldId) {
        this._out('renamedElement', element, id, oldId);
    },
    
    handle__cleanup: function() {
        var element = Amm.event.origin;
        this.rejectElements([element]);
    },
    
    getNamedElement: function(name, index, bubble) {
        if (this._internalId && name === this._internalId && !index) return this; // always
        var res;
        if (this._namedElements[name]) {
            if (!index || index < 0) index = 0;
            res = this._namedElements[name][index];
        }
        if (!res && bubble) {
            var nn = this.getAllNamedElements(name, bubble);
            if (nn && nn[index]) res = nn[index];
        }
        return res;
    },
    
    getAllNamedElements: function(name, bubble) {
        var res;
        // variant A - name specified - return Array
        if (name) {
            res = [];
            if (this._internalId && name === this._internalId) {
                res.push(this);
            }
            if (this._namedElements[name]) {
                res = res.concat(this._namedElements[name]); 
            }
            // AA - bubble - include parent component' elements with same name, but excluding this
            if (bubble && this._component) {
                var p = this._component.getAllNamedElements(name, bubble);
                if (this._internalId === name) {
                    for (var i = 0, l = p.length; i < l; i++) {
                        if (p[i] === this) {
                            p.splice(i, 1);
                            break;
                        }
                    }
                }
                res = res.concat(p);
            }
            return res;
        }
        // variant B - name not specified - return hash of Arrays
        res = {};
        if (this._internalId) res[this._internalId] = [this];
        for (var i in this._namedElements) {
            if (this._namedElements.hasOwnProperty(i)) {
                res[i] = (res[i] || []).concat(this._namedElements[i]);
            }
        }
        // BB - bubble - merge with parent components' elements, but excluding this
        if (bubble && this._component) {
            var p = this._component.getAllNamedElements(undefined, bubble);
            var id = this._id;
            if (id && p[id]) {
                for (var j = 0, l = p[id].length; j < l; j++) if (p[id][j] === this) {
                    p[i].splice(j, 1);
                    if (!p[i].length) delete p[i];
                    break;
                };
            }
            for (var i in p) if (p.hasOwnProperty(i)) {
                this._namedElements[i] = (this._namedElements[i] || []).concat(p[i]);
            }
        }
        return res;
    },
    
    _includeAllChildren: function(elements) {
        var res = [].concat(elements);
        for (var i = 0, l = elements.length; i < l; i++) {
            if (!elements[i].Component || !elements[i].isComponent) {
                var sub = this._includeAllChildren(elements[i].findChildElements());
                res = res.concat(sub);
            }
        }
        return res;
    },
    
    /**
     * @param {Array} elements
     * @returns {Array} Elements that were actually accepted this time 
     *      (including children, excluding ones that were already associated)
     */
    acceptElements: function(elements) {
        // include all children... 
        var ee = this._includeAllChildren(elements), res = [];
        // exclude items already under our control
        ee = Amm.Array.arrayDiff(ee, this._elements);
        if (!ee.length) return;
        this._elements.push.apply(this._elements, ee);
        var hh = this._listHandlersForElements();
        for (var i = 0, l = ee.length; i < l; i++) {
            this._subscribeElement(ee[i], false, hh);
            var id = ee[i].getId();
            if (id) {
                if (!this._namedElements[id]) {
                    this._namedElements[id] = [];
                }
                this._namedElements[id].push(ee[i]);
            }
            if (ee[i].Component === '__INTERFACE__' && ee[i].getIsComponent()) {
                this._registerComponent(ee[i]);
            }
            ee[i].setComponent(this);
            res.push(ee[i]);
        }
        if (res.length) {
            this.outAcceptedElements(res);
            this.outAcceptedInScope(this, res);
        }
        return res;
    },
    
    _registerComponent: function(component) {
        this._components.push(component);
    },
    
    outAcceptedElements: function(elements) {
        return this._out('acceptedElements', elements);
    },
    
    _deleteNamedElementEntry: function(element, id) {
        if (!id) id = element.getId();
        if (!id) id = element.getId();
        if (!this._namedElements[id]) return;
        var idx = Amm.Array.indexOf(element, this._namedElements[id]);
        if (idx >= 0) {
            this._namedElements[id].splice(idx, 1);
            if (!this._namedElements[id].length) {
                delete this._namedElements[id];
            }
            return true;
        }
    },
    
    /**
     * @param {Array} elements
     * @returns {Array} Elements that were actually rejected (inc. children)
     */
    rejectElements: function(elements) {
        var res = [];
        // include all children...
        var ee = this._includeAllChildren(elements), el = this._elements.length;
        var dups = Amm.Array.findDuplicates(this._elements.concat(ee), false, null, el, true);
        for (var i = dups.length - 1; i >= 0; i--) {
            if (dups[i][0] >= el) continue;  // not likely though
            var element = this._elements[dups[i][0]], id = element.getId();
            if (id) this._deleteNamedElementEntry(element, id);
            this._elements.splice(dups[i][0], 1);
            this._unsubscribeElement(element);
            if (element.getComponent() === this) {
                // shouldn't normally trigger this.rejectElements again
                // because we've already unsubscribed
                element.setComponent(null);                
            }
            if (ee[i].Component === '__INTERFACE__' && ee[i].getIsComponent()) {
                this._unregisterComponent(ee[i]);
            }
            res.unshift(element); // don't push but unshift 'cause we reject them in reverse order!
        }
        if (res.length) {
            this.outRejectedElements(res);
            this.outRejectedInScope(this, res);
        }
        return res;
    },
    
    _unregisterComponent: function(component) {
        for (var j = 0, l = this._components.length; j < l; j++) {
            if (this._components[j] === component) {
                this._components.splice(j, 1);
                break;
            }
        }
    },
    
    outRejectedElements: function(elements) {
        return this._out('rejectedElements', elements);
    },
    
    getElements: function() {
        return [].concat(this._elements);
    },
    
    _listCall: function(list, methodName, args) {
        var res = [];
        for (var i = 0, l = list.length; i < l; i++) {
            var e = list[i];
            if (typeof methodName === 'function') res.push([e, methodName.apply(e, args)]);
            else if (typeof e[methodName] === 'function') res.push([e, e[methodName].apply(e, args)]);
        }
        return res;
    },
    
    callElements: function(methodName, _) {
        return this._listCall(this._elements, methodName, Array.prototype.slice.call(arguments, 1));
    },
    
    callComponents: function(methodName, _) {
        return this._listCall(this._components, methodName, Array.prototype.slice.call(arguments, 1));
    },
    
    _cleanup_Component: function() {
        this._namedElements = {};
        var ee = this._elements;
        this._elements = [];
        for (var i = 0, l = ee.length; i < l; i++) {
            this._unsubscribeElement(ee[i]);
            ee[i].setComponent(null);
        }
    },
    
    outAcceptedInScope: function(component, elements) {
        var res = this._out('acceptedInScope', component, elements);
        this.callComponents('outAcceptedInScope', component, elements);
        return res;
    },
    
    outRejectedInScope: function(component, elements) {
        var res = this._out('rejectedInScope', component, elements);
        this.callComponents('outRejectedInScope', component, elements);
        return res;
    },
    
    outRenamedInScope: function(component, element, id, oldId) {
        var res = this._out('renamedInScope', component, element, id, oldId);
        this.callComponents('outRenamedInScope', component, element, id, oldId);
        return res;
    },
    
    outChildComponentStatusChange: function(component, status) {
        return this._out('childComponentStatusChange', component, status);
    },
    
    outChildComponentStatusChangeInScope: function(parentComponent, component, status) {
        var res = this._out('childComponentStatusChangeInScope', parentComponent, component, status);
        this.callComponents('outChildComponentStatusChangeInScope', parentComponent, component, status);
        return res;
    }
    
};
