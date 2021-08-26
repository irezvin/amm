/* global Amm */

Amm.Drag.Controller = function(options) {
    Amm.Element.call(this, options);
};

Amm.Drag.Controller.getInstance = function() {
    if (this._instance) return this._instance;
    this._instance = new Amm.Drag.Controller({
        id: 'DragController',
        views: [{class: Amm.View.Html.Drag.Controller}]
    });
    return this._instance;
};

Amm.Drag.Controller.prototype = {

    'Amm.Drag.Controller': '__CLASS__', 
    
    _session: null,
    
    _dragging: false,
    
    setSession: function(session) {
        var oldSession = this._session;
        if (oldSession === session) return;
        //Amm.subUnsub(session, oldSession, this, '_handleSession');
        if (oldSession) {
            oldSession.setActive(false);
            Amm.cleanup(oldSession);
        }
        this._session = session;
        this.outSessionChange(session, oldSession);
        return true;
    },
    
    getSession: function() { return this._session; },

    outSessionChange: function(session, oldSession) {
        this._out('sessionChange', session, oldSession);
    },

    setDragging: function(dragging) {
        var oldDragging = this._dragging;
        if (oldDragging === dragging) return;
        this._dragging = dragging;
        if (this._session) this._session.setActive(false);
        this.outDraggingChange(dragging, oldDragging);
        return true;
    },

    getDragging: function() { return this._dragging; },

    outDraggingChange: function(dragging, oldDragging) {
        this._out('draggingChange', dragging, oldDragging);
    },

    notifyDragStart: function(vector, startView, startNativeItem, nativeItem, nativeEventInfo) {
        this.setDragging(true);
        var element = startView.getElement();
        this.setSession(new Amm.Drag.Session({
            source: element,
            startNativeItem: startNativeItem,
            nativeItem: nativeItem,
            vector: vector,
            nativeEventInfo: nativeEventInfo
        }));
        if (this.getDragging()) this._session.setActive(true);
        if (element) element.notifyDragStart(this._session);
    },
    
    cancelDrag: function() {
        this.setDragging(false);
    },
    
    endDrag: function() {
        this.setDragging(false);
    },
    
    notifyDragMove: function(delta, nativeItem, dragTarget, nativeEventInfo) {
        this._session.applyDragData(delta, nativeItem, dragTarget, nativeEventInfo);
    },
    
    notifyDragEnd: function(x, y, nativeElement, nativeEventInfo) {
        this.setDragging(false);
    },
    
    _cleanup_AmmDragController: function() {
        if (Amm.Drag.Controller._instance === this) Amm.Drag.Controller._instance = null;
    }
    
};

Amm.extend(Amm.Drag.Controller, Amm.Element);

