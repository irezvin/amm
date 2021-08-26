/* global Amm */

/** 
 * -    selector is either string or jQuery result
 * -    options is a hash
 * 
 * Possible usages:
 * 
 * new Amm.Builder(selector, options)
 * new Amm.Builder(selector)
 * new Amm.Builder(options)
 */

Amm.Builder = function(selector, options) {
    this.selIgnore += ', [' + Amm.domHolderAttribute + ']';
    this.elements = [];
    this.topLevel = [];
    this.problems = [];
    if (selector && selector.jquery || typeof selector === 'string') {
        this.selector = selector;
    } else if (!options && selector && typeof selector === 'object') {
        options = selector;
        selector = null;
    }
    if (options) Amm.init(this, options);
};

Amm.Builder._EXT_NOT_FOUND = {};

Amm.Builder.PROBLEM_SILENT = 0;

Amm.Builder.PROBLEM_CONSOLE = 1;

Amm.Builder.PROBLEM_HTML = 2;

Amm.Builder.TOP_LEVEL_ROOT = 'root';

Amm.Builder.problemReportMode = Amm.Builder.PROBLEM_SILENT;

Amm.Builder._scanId = 1;

Amm.Builder.prototype = {
    
    _globalIds: null,

    selector: null,
    
    problemReportMode: undefined, // use global
    
    sel: '[data-amm-id], [data-amm-e], [data-amm-v], [data-amm-x]',

    selIgnore: '[data-amm-dont-build], [data-amm-dont-build] *, [data-amm-built]',
    
    // 'root' is Amm.Root
    topLevelComponent: null,
    
    // whether to save all created top-level elements to this.elements
    rememberElements: false,
    
    // whether to save issued problems
    rememberProblems: false,
    
    elements: null,
    
    topLevel: null,
    
    reportMode: Amm.Builder.PROBLEM_CONSOLE | Amm.Builder.PROBLEM_HTML,
    
    problems: null,
    
    _parent: null,
    
    calcPrototypes: function() {
        return this.build(true);
    },
    
    calcViewPrototypes: function(forElementOrPrototype) {
        var res, eProto;
        var tmp = this._parent;
        if (forElementOrPrototype) {
            this._parent = new Amm.Builder.Node({e: forElementOrPrototype});
            if (Amm.getClass(forElementOrPrototype)) {
                Amm.is(forElementOrPrototype, 'Amm.Element', 'forElement');
                this._parent.id = forElementOrPrototype.getId();
            } else {
                this._parent.id = forElementOrPrototype.id || null;
            }
        } else {
            this._parent = new Amm.Builder.Node({e: {}});
        }
        try {
            eProto = this.build(true);
            if (eProto.length !== 1 || !eProto[0].views || !eProto[0].views.length) {
                console.log({fe: forElementOrPrototype, ep: eProto});
                var reason;
                if (eProto.length !== 1) reason = "found " + eProto.length + " top-level elements";
                else if (!eProto[0].views || !eProto[0].views.length) reason = "no views defined for top-level element";
                throw new Error("Amm.Builder: cannot calcViewPrototypes(): " + reason);
            } res = eProto[0].views;
            if (forElementOrPrototype) {
                for (var i = 0; i < res.length; i++) res[i].element = forElementOrPrototype;
            }
        } catch (e) {
            this._parent = tmp;
            throw e;
        }
        this._parent = tmp;
        return res;
    },
    
    build: function(prototypesOnly) {
        var root = this.selector;
        var tmp = this._globalIds;
        this._globalIds = {};
        var nodes = this._scanNodes(root), res = [];
        var topLevel = [];
        this._detectConnectedRecursive(nodes);
        for (var i = 0, l = nodes.length; i < l; i++) {
            res = res.concat(this._buildElements(nodes[i], topLevel, prototypesOnly));
        }
        if (this.rememberElements) {
            if (res.length) this.elements.push.apply(this.elements, res);
            if (topLevel.length) this.topLevel.push.apply(this.topLevel, topLevel);
        }
        this._globalIds = tmp;
        if (prototypesOnly) return topLevel;
        return res;
    },
    
    clear: function() {
        this.elements = [];
        this.topLevel = [];
        this.problems = [];
    },

    _scanNodes: function(root) {
        if (!root) root = window.document.documentElement;
        var scProp = '_amm_builder_scn_' + (Amm.Builder._scanId++);
        var rootNodes = [], allNodes = [], t = this;
        var jq = 
            jQuery(root)
            .filter(this.sel)
            .add(jQuery(root).find(this.sel))
          .not(jQuery(root).find(this.selIgnore))
          .not(this.selIgnore)
    ; 
        jq.each(function(i, htmlElement) {
            var node = t._createNode(htmlElement);
            htmlElement[scProp] = allNodes.length;
            allNodes.push(node);
        });
        if (this._parent) {
            rootNodes.push(this._parent);
            
            // line below calls infinite recursing with _detectChildrenConnectedByIds/_detectConnectedNodes
            
            // allNodes.push(this._parent);
        }
        for (var i = 0, l = allNodes.length; i < l; i++) {
            var node = allNodes[i];
            var htmlElement = node.htmlElement;
            var pp = jQuery(htmlElement).parent().closest(this.sel)[0];
            if (pp && pp[scProp] !== undefined) {
                node.parent = allNodes[pp[scProp]];
                allNodes[pp[scProp]].children.push(node);
            } else {
                if (this._parent) {
                    node.parent = this._parent;
                    this._parent.children.push(node);
                }
                rootNodes.push(node);
            }
        }
        return rootNodes;
    },
    
    getExtData: function(entry, path, defaultValue) {
        if (defaultValue === undefined) defaultValue = Amm.Builder._EXT_NOT_FOUND;
        if (!(path instanceof Array)) path = ('' + path).split('.');
        var curr = entry, prop, currPath = [].concat(path);
        while ((prop = currPath.shift()) !== undefined) {
            if (typeof curr !== 'object' || !(prop in curr)) return defaultValue;
            curr = curr[prop];
        }
        return curr;
    },
    
    _replaceRefsAndInstaniateObjects: function(json, htmlElement) {
        if (!json || typeof json !== 'object') return json;
        var i, l;
        if ('$ref' in json) {
            return new Amm.Builder.Ref(json, htmlElement);
        }
        if ('$ext' in json) {
            var data = this.getExtData(window, json.$ext);
            if (data === Amm.Builder._EXT_NOT_FOUND) throw Error("Cannot resolve '$ext' " + json.$ext);
            if (json['$resolve']) json = data;
            else return data;
        }
        if (json instanceof Array) {
            for (i = 0, l = json.length; i < l; i++) {
                if (json[i] && typeof json[i] === 'object') 
                    json[i] = this._replaceRefsAndInstaniateObjects(json[i], htmlElement);
            }
        } else {
            for (i in json) if (json.hasOwnProperty(i) && json[i] && typeof json[i] === 'object') {
                json[i] = this._replaceRefsAndInstaniateObjects(json[i], htmlElement);
            }
            if ('__construct' in json) {
                var tmp = json.__construct;
                delete json.__construct;
                json = Amm.constructInstance(json, tmp);
            }
        }
        return json;
    },
    
    _parseJson: function(attr, element) {
        var content = element.getAttribute(attr);
        if (!content || !content.length) return null;
        var res, json = window.RJSON || window.JSON; // use relaxed json when possible
        try {
            res = json.parse(content);
        } catch (e) {
            console.error("Cannot parse relaxed json in attribute '" + attr + "' of element", element);
            throw e;
        }
        res = this._replaceRefsAndInstaniateObjects(res, element);
        return res;
    },
    
    _createNode: function(htmlElement) {
        var n = new Amm.Builder.Node(), id;
        n.htmlElement = htmlElement;
        n.v = this._parseJson('data-amm-v', n.htmlElement);
        if (n.v) {
            if (!(n.v instanceof Array)) n.v = n.v? [n.v] : [];
            for (var i = 0, l = n.v.length; i < l; i++) {
                if ((typeof n.v[i]) === 'string') {
                    n.v[i] = {'class': n.v[i]};
                }
                n.v[i].htmlElement = htmlElement;
            }
        }
        n.e = this._parseJson('data-amm-e', n.htmlElement);
        id = htmlElement.getAttribute('data-amm-id');
        if (id && id.length) {
            id = id.replace(/^\s+|\s+$/g, '');
            if (id[0] === '@' && id[1]) {
                n.global = true;
                id = id.slice(1);
                if (!this._globalIds[id]) this._globalIds[id] = [n];
                    else this._globalIds[id].push(n);
            }
        }
        if (id && id.length) {
            n.id = id;
            n.connected.id = id; // add to shared array for speedup
        }
        n.x = this._parseJson('data-amm-x', n.htmlElement);
        return n;
    },

    // marks two nodes as semantically related to one element and makes necessary changes
    // (when we already decided that they are)
    _connect: function(node, toNode) {
        if (node.e || toNode.e) node.connected.groupHasElement = true;
        var l = node.connected.length;
        var x;
        x = Amm.Array.diff(toNode.connected, node.connected);
        node.connected.push.apply(node.connected, x);
        if (toNode.connected.groupHasElement) node.connected.groupHasElement = true;
        if (toNode.connected.id && !node.connected.id) node.connected.id = toNode.connected.id;
        if (toNode.connected.alreadyBuilt) node.connected.alreadyBuilt = toNode.connected.alreadyBuilt;
        toNode.connected = node.connected;
        for (var i = l, cl = node.connected.length; i < cl; i++) {
            toNode.connected[i].conIdx = i;
            toNode.connected[i].connected = toNode.connected;
        }
    },
    
    /**
     * Searches descendant nodes between nodeWithChildren' child nodes 
     * that can be possibly connected to node `node` using `id`.
     * Doesn't descend into children that have 'id' set, but it is different
     * (children that have no id will be scanned, but not 'connected')
     * Only descendants that have same 'id' are eligible to connecting
     */
    
    _detectChildrenConnectedByIds: function(node, nodeWithChildren) {
        if (!node.id) return;
        for (var i = 0, l = nodeWithChildren.children.length; i < l; i++) {
            var child = nodeWithChildren.children[i];
            if (child === node) continue;
            
            // TODO: descend to connected nodes, not only nodes with same id
            if (child.id && child.id !== node.id) { 
                continue;
            }
            
            if (child.id === node.id) {
                this._connect(node, child);
            }
            this._detectChildrenConnectedByIds(node, child);
        }
    },
    
    _detectConnectedNodes: function(node) {
        var p, gids;
        if (node.id) {
            if (node.global && (gids = this._globalIds[node.id])) {
                for (var i = 0, l = gids.length; i < l; i++) {
                    if (gids[i] !== node) this._connect(node, gids[i]);
                }
            }
            for (p = node.parent; p; p = p.parent) {
                if (node.id === '__parent') {
                    node.id = null;
                    this._connect(node, p);
                }
                if (p.id === node.id) this._connect(node, p);
                this._detectChildrenConnectedByIds(node, p);
            }
        }
        this._detectConnectedRecursive(node.children);
        p = node.parent;
        if (p && (((node.v || node.x) && !node.e) || ((p.v || p.x) && !p.e))) {
            if (p && p.children.length === 1) {
                var nodeHasElement = !!(node.e || node.connected.groupHasElement);
                var parentHasElement = !!(p.e || p.connected.groupHasElement);
                var acceptable = !(nodeHasElement && parentHasElement);
                if (acceptable && (!p.id || !node.id) && (p.e || p.v || p.x)) {
                    this._connect(p, node);
                    node.conParent = true;
                    p.conChild = true;
                }
            }
        }
    },
    
    _getAllViews: function(node) {
        var res = node.v;
        if (!res) res = [];
        for (var i = 0, l = node.connected.length; i < l; i++) {
            if (node.connected[i] !== node)
                if (node.connected[i].v) {
                    res = res.concat(node.connected[i].v);
                }
        }
        return res;
    },
    
    _detectConnectedRecursive: function(items) {
        for (var i = 0, l = items.length; i < l; i++) {
            this._detectConnectedNodes(items[i]);
            //this._detectConnectedRecursive(items[i].children);
        }
    },
    
    _buildElements: function(node, topLevel, prototypesOnly) {
        var res = [];
        
        // first build node children and add them to result
        for (var i = 0, l = node.children.length; i < l; i++) {
            res = res.concat(this._buildElements(node.children[i], topLevel, prototypesOnly));
        }
        
        // do we have connected nodes? (belonging to the same element)
        if (!node.e && node.connected.length > 1) {
            
            // always use ID that is provided by the node group
            if (node.connected.id !== undefined) node.id = node.connected.id;
            
            // we don't have element definition - check if node is primary
            // between connected items
            
            if (node.connected.groupHasElement) {
                return res;
            } else {
                // we don't have element so build only when we got to the last node (why?)
                if (node.conIdx < node.connected.length - 1) {
                    return res;
                }
            }
            
            // "already built" flag is set - don't build same element again
            if (node.connected.alreadyBuilt) return res;
        }
        
        var nodePrototypeOrElement = node.e || {};
        var views;
        
        // check if we have Amm.Element instance provided instead of node prototype
        if (nodePrototypeOrElement['Amm.Element']) {
            if (!node.connected.views) node.connected.views = [];
            views = node.connected.views;
        } else {
            if (!nodePrototypeOrElement.views) nodePrototypeOrElement.views = [];
            views = nodePrototypeOrElement.views;
        }
        
        views.push.apply(views, this._getAllViews(node));
        if (!views.length) views.push({'class': 'Amm.View.Html.Default', reportMode: this.reportMode});
        for (var i = 0, l = views.length; i < l; i++) {
            if (!views[i].htmlElement) {
                views[i].htmlElement = node.htmlElement;
            }
        }
        
        if (node.id && !nodePrototypeOrElement.id) 
            nodePrototypeOrElement.id = node.id;
        if (!node.parent && this.topLevelComponent && !('component' in nodePrototypeOrElement)) {
            nodePrototypeOrElement.component = this.topLevelComponent;
        }
        
        this._applyExtensions(nodePrototypeOrElement, node);
        
        var element;
        
        if (nodePrototypeOrElement['Amm.Element']) { // we have prototype instance
            element = {'class': 'Amm.Element', views: views};
        } else {
            element = Amm.override({'class': 'Amm.Element'}, nodePrototypeOrElement);
        }
        
        if (!prototypesOnly) {
            element = Amm.constructInstance(nodePrototypeOrElement, 'Amm.Element');
        }
        if (topLevel && (!node.parent || node.parent === this._parent || node.conParent && !node.parent.parent)) {
            topLevel.push(element);
        }
        res.push(element);
        node.connected.alreadyBuilt = true;
        return res;
    },
    
    _applyExtensions: function(elementPrototype, node) {
        for (var i = 0, l = node.connected.length; i < l; i++) {
            if (node.connected[i].x) {
                var parsed = this._parseExtensions(node.connected[i].x);
                for (var j = 0, ll = parsed.length; j < ll; j++) {
                    var res = parsed[j].fn(node.connected[i].htmlElement, elementPrototype, parsed[j].arg);
                    if (res && typeof res === 'object') Amm.overrideRecursive(elementPrototype, res);
                }
            }
        }
    },
    
    _getExtension: function(path) {
        path = path.replace(/(\.|^)(\w+)$/, "$1builderExtension_$2");
        return Amm.getFunction(path);
    },
    
    _parseExtensions: function(param) {
        if (typeof param === 'string') return [{ fn: this._getExtension(param), arg: undefined }];
        if (typeof param !== 'object') {
            throw Error("data-amm-x must contain either string or an object");
        }
        var res = [];
        for (var path in param) if (param.hasOwnProperty(path)) {
            res.push({ fn: this._getExtension(path), arg: param[path] });
        }
        return res;
    },
    
    _regProblem: function(node, problem) {
        if (node instanceof Array) {
            for (var i = 0, l = node.length; i < l; i++)
                this._regProblem(node[i], problem);
            return;
        }
        if (!node.htmlElement.hasAttribute(Amm.domHolderAttribute)) {
            // prevent from re-creating on re-runs
            node.htmlElement.setAttribute(Amm.domHolderAttribute, "");
        }
        if (this.rememberProblems) this.problems.push({
            element: node.htmlElement, problem: problem
        });
        if (this.reportMode & Amm.Builder.PROBLEM_CONSOLE) {
            console.warn('Amm.Builder problem with HTML element', node.htmlElement, problem);
        }
        if (this.reportMode & Amm.Builder.PROBLEM_HTML) {
            this._annotate(node, problem);
        }
    },
    
    _annotate: function(node, content) {
        node.htmlElement.setAttribute('data-amm-warning', content);
    }
    
};

Amm.Builder.isPossibleBuilderSource = function(source) {
    if (!source) return false;
    if (source['Amm.Builder.Ref']) return true;
    if (typeof source === 'object' && 'parentNode' in source && 'tagName' in source) return true;
    if (source.jquery) return true;
    if (typeof source === 'string' && source.match(/^\<(?:.|[\n])*\>$/)) return true;
    return false;
};

Amm.Builder.calcPrototypeFromSource = function(builderSource, dontClone, views) {
    if (!builderSource) throw Error("`builderSource` is required");
    var source;
    if (typeof builderSource === 'string') {
        if (builderSource.match(/\s*<(?:.|[\n])*>\s*$/)) dontClone = true;
        source = builderSource;
    } else if (builderSource['Amm.Builder.Ref']) {
        source = builderSource.resolve();
    }
    else if(builderSource.tagName || builderSource.jquery) {
        source = builderSource;
    }
    else throw Error ("Unsupported builderSource type: " + Amm.describeType(builderSource));
    var jq = jQuery(source);
    if (!jq.length) throw Error("Cannot resolve builderSource reference");
    if (dontClone === undefined) dontClone = jq.attr('data-amm-dont-build') === undefined;
    var old;
    if (!dontClone) {
        old = jq;
        jq = jq.clone();
    }
    jq.removeAttr('data-amm-dont-build');
    var builder = new Amm.Builder(jq);
    var proto = views? builder.calcViewPrototypes() : builder.calcPrototypes(true);
    if (!proto.length) throw Error("Builder returned no prototypes");
    if (!views) {
        if (proto.length > 1) throw Error("Builder returned more than one prototype");
        if (!proto[0].class) proto[0].class = 'Amm.Element';
        return proto[0];
    }
    return proto;
};



