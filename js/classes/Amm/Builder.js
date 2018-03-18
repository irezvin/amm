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
    
    sel: '[data-amm-id], [data-amm-e], [data-amm-v]',

    selIgnore: '[data-amm-dont-build], [data-amm-dont-build] *',
    
    // 'root' is Amm.Root
    topLevelComponent: null,
    
    // whether to save all created top-level elements to this.elementsp
    rememberElements: false,
    
    // whether to save issued problems
    rememberProblems: false,
    
    elements: null,
    
    topLevel: null,
    
    reportMode: Amm.Builder.PROBLEM_CONSOLE | Amm.Builder.PROBLEM_HTML,
    
    problems: null,
    
    build: function() {
        var root = this.selector;
        var tmp = this._globalIds;
        this._globalIds = {};
        var nodes = this._scanNodes(root), res = [];
        var topLevel = [];
        this._detectConnectedRecursive(nodes);
        for (var i = 0, l = nodes.length; i < l; i++) {
            res = res.concat(this._buildElements(nodes[i], topLevel));
        }
        if (this.rememberElements) {
            if (res.length) this.elements.push.apply(this.elements, res);
            if (topLevel.length) this.topLevel.push.apply(this.topLevel, topLevel);
        }
        this._globalIds = tmp;
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
        jQuery(root).find(this.sel).not(this.selIgnore).each(function(i, htmlElement) {
            var node = t._createNode(htmlElement);
            htmlElement[scProp] = allNodes.length;
            allNodes.push(node);
        });
        for (var i = 0, l = allNodes.length; i < l; i++) {
            var node = allNodes[i];
            var htmlElement = node.htmlElement;
            var pp = jQuery(htmlElement).parent().closest(this.sel)[0];
            if (pp && pp[scProp] !== undefined) {
                node.parent = allNodes[pp[scProp]];
                allNodes[pp[scProp]].children.push(node);
            } else {
                rootNodes.push(node);
            }
        }
        return rootNodes;
    },
    
    _createNode: function(htmlElement) {
        var json = window.RJSON || window.JSON; // use relaxed json when possible
        var n = new Amm.Builder.Node(), a;
        n.htmlElement = htmlElement;
        a = htmlElement.getAttribute('data-amm-v');
        if (a && a.length) {
            n.v = json.parse(a);
            if (!(n.v instanceof Array)) n.v = n.v? [n.v] : [];
            for (var i = 0, l = n.v.length; i < l; i++) {
                if ((typeof n.v[i]) === 'string') {
                    n.v[i] = {class: n.v[i]};
                }
                n.v[i].htmlElement = htmlElement;
            }
        }
        a = htmlElement.getAttribute('data-amm-e');
        if (a && a.length) n.e = json.parse(a);
        a = htmlElement.getAttribute('data-amm-id');
        if (a && a.length) {
            a = a.replace(/^\s+|\s+$/g, '');
            if (a[0] === '@' && a[1]) {
                n.global = true;
                a = a.slice(1);
                if (!this._globalIds[a]) this._globalIds[a] = [n];
                    else this._globalIds[a].push(n);
            }
        }
        if (a && a.length) {
            n.id = a;
            n.connected.id = a; // add to shared array for speedup
        }
        return n;
    },

    _connect: function(node, toNode) {
        node.connected = toNode.connected;
        toNode.connected.push(node);
        node.conIdx = node.connected.length - 1;
    },
    
    _detectConnectedChildren: function(node, otherNode) {
        if (!node.id) return;
        for (var i = 0, l = otherNode.children.length; i < l; i++) {
            var child = otherNode.children[i];
            if (child === node) continue;
            if (child.id && child.id !== node.id) {
                continue;
            }
            if (child.id === node.id) {
                this._connect(node, child);
            }
            this._detectConnectedChildren(node, child);
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
                if (p.id === node.id) this._connect(node, p);
                this._detectConnectedChildren(node, p);
            }
        }
        p = node.parent;
        if (p && ((node.v && !node.e) || (p.v && !p.e))) {
            if (p && p.children.length === 1) {
                if ((!p.id || !node.id) && (p.e || p.v)) this._connect(node, p);
            }
        }
    },
    
    _getAllViews: function(node) {
        var res = node.v;
        if (!res) res = [];
        for (var i = 0, l = node.connected.length; i < l; i++) {
            if (node.connected[i] !== node)
                if (node.connected[i].v) 
                    res = res.concat(node.connected[i].v);
        }
        return res;
        
    },
    
    _detectConnectedRecursive: function(items) {
        for (var i = 0, l = items.length; i < l; i++) {
            this._detectConnectedNodes(items[i]);
            this._detectConnectedRecursive(items[i].children);
        }
    },
    
    _buildElements: function(node, topLevel) {
        var res = [];
        for (var i = 0, l = node.children.length; i < l; i++) {
            res = res.concat(this._buildElements(node.children[i], topLevel));
        }
        if (!node.e && node.connected.length > 1) {
            // we don't have element definition - check if node is primary
            // between connected items
            if (node.conIdx < node.connected.length - 1) return res;
            if (node.connected.alreadyBuilt) return res;
            if (node.connected.id !== undefined) node.id = node.connected.id;
        }
        var proto = node.e || {};
        if (!proto.views) proto.views = [];
        proto.views = proto.views.concat(this._getAllViews(node));
        for (var i = 0, l = proto.views.length; i < l; i++) {
            if (!proto.views[i].htmlElement) {
                proto.views[i].htmlElement = node.htmlElement;
            }
        }
        if (node.id && !proto.id) 
            proto.id = node.id;
        if (!node.parent && this.topLevelComponent && !('component' in proto)) {
            proto.component = this.topLevelComponent;
        }
        if (!proto.views.length) {
            var n = node;
            if (node.connected && node.connected.length) n = node.connected;
            this._regProblem(n, 'Element has no defined views');
        }
        var element = new Amm.Element(proto);
        if (topLevel && !node.parent) topLevel.push(element);
        res.push(element);
        node.connected.alreadyBuilt = true;
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
