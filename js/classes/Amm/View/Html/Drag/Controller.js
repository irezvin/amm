/* global Amm */

Amm.View.Html.Drag.Controller = function(options) {
    Amm.View.Html.Drag.call(this, options);
};

Amm.View.Html.Drag.Controller.STATE = {
    IDLE: null,
    INTENT: 0,
    DRAG: 1
};

Amm.View.Html.Drag.Controller.prototype = {

    'Amm.View.Html.Drag.Controller': '__CLASS__', 
    
    requiredElementClass: 'Amm.Drag.Controller',
    
    _state: null,
    
    _mouseMove: null,
    
    _mouseUp: null,
    
    _selectStart: null,
    
    _reg: false,
    
    _startX: null,
    
    _startY: null,
    
    _lastX: null,
    
    _lastY: null,
    
    _vector: null,
    
    _startHtmlElement: null,
    
    _startView: null,
    
    _cursorStylesheet: null,
    
    _session: null,
    
    /**
     * Distance that pointer must move to begin drag
     * @type Number
     */
    dragStartThreshold: 10,
    
    preventSelection: true,
    
    setState: function(state) {
        var oldState = this._state;
        if (oldState === state) return;
        if (state === Amm.View.Html.Drag.Controller.STATE.IDLE) {
            this._unregHandler();
        } else {
            this._regHandler();
        }
        this._state = state;
        return true;
    },
    
    getState: function() { return this._state; },
    
    _unregHandler: function() {
        if (!this._reg) return;
        jQuery(document.documentElement).off('mousemove pointermove', this._mouseMove);
        jQuery(document.documentElement).off('mouseup pointerup', this._mouseUp);
        this._reg = false;
    },
    
    _regHandler: function() {
        if (this._reg) return;
        this._reg = true;
        var t = this;
        if (!this._mouseMove) this._mouseMove = function(event) {
            t._handleMouseMove(event);
        };
        if (!this._mouseUp) this._mouseUp = function(event) {
            t._handleMouseUp(event);
        };
        if (!this._selectStart) this._selectStart = function(event) {
            t._handleSelectStart(event);
        };
        jQuery(document.documentElement).on('mousemove pointermove', this._mouseMove);
        jQuery(document.documentElement).on('mouseup pointerup', this._mouseUp);
        jQuery(document).on('selectstart', this._selectStart);
    },
    
    setVDragging: function(value) {
        if (value) {
            this.setState(Amm.View.Html.Drag.Controller.STATE.DRAG);
        } else {
            this.setState(Amm.View.Html.Drag.Controller.STATE.IDLE);
        }
    },
    
    _handleMouseMove: function(event) {
        if (this._state === Amm.View.Html.Drag.Controller.STATE.INTENT) {
            this._vector = new Amm.Drag.Vector({
                x0: this._startX, 
                y0: this._startY,
                x1: event.pageX,
                y1: event.pageY
            });
            var dst = this._vector.getLength();
            if (dst >= this.dragStartThreshold) {
                this._element.notifyDragStart(this._vector, this._startView, this._startHtmlElement, event);
                if (this._element.getDragging()) {
                    this.setState(Amm.View.Html.Drag.Controller.STATE.DRAG);
                }
            }
            this._lastX = event.pageX;
            this._lastY = event.pageY;
        }
        if (this._state === Amm.View.Html.Drag.Controller.STATE.DRAG) {
            this._vector = new Amm.Drag.Vector({
                x0: this._lastX, 
                y0: this._lastY,
                x1: event.pageX,
                y1: event.pageY
            });
            this._lastX = event.pageX;
            this._lastY = event.pageY;
            var dragTarget = null;
            var targetElement = event.target;
            if (event.type === 'pointermove') {
                targetElement = document.elementsFromPoint(event.pageX, event.pageY)[0];
            }
            if (targetElement) {
                dragTarget = this._detectDragTarget(targetElement);
            }
            this._element.notifyDragMove(this._vector, targetElement, dragTarget, event);
        }
        
        // handle drag action
        
    },
    
    _detectDragTarget: function(node) {
        var res = null, elem;
        do {
            elem = Amm.findElement(node);
            if (!elem) return res;
            if (elem['DragTarget'] && elem.getDropEnabled()) {
                return elem;
            }
            node = node.parent;
        } while (node);
        return null;
    },
    
    _handleMouseUp: function(event) {
        if (this._element.getDragging()) {
            this._element.notifyDragEnd(event.pageX, event.pageY, event.target, event);
        }
        this.setState(Amm.View.Html.Drag.Controller.STATE.IDLE);
    },
    
    _handleSelectStart: function(event) {
        if (this._state === Amm.View.Html.Drag.Controller.STATE.IDLE) return;
        if (this.preventSelection) {
            event.preventDefault();
        } else {
            this.setState(Amm.View.Html.Drag.Controller.STATE.IDLE);
        }
    },

    _canObserve: function() {    
        return !!this._element;
    },
    
    registerDragIntent: function(event, dragSourceView) {
        if (this._state !== Amm.View.Html.Drag.Controller.STATE.IDLE) return;
        this._startX = event.pageX;
        this._startY = event.pageY;
        this._startHtmlElement = event.target;
        this._startView = dragSourceView;
        this.setState(Amm.View.Html.Drag.Controller.STATE.INTENT);
    },
    
    _handleElementSessionChange: function(session, oldSession) {
        this._session = session;
        Amm.subUnsub(session, oldSession, this, '_handleDragSession');
        var startItem = session.getStartNativeItem();
        if (startItem && session.getCursor() === undefined) {
            var comps = window.getComputedStyle(startItem);
            if (comps.cursor) {
                session.setCursor(comps.cursor);
                return;
            }
        }
        this._setCursor(session, session? session.getCursor() : null);
    },
    
    _handleDragSessionActiveChange: function(active) {
        if (!active) this._setCursor(null);
        else if (this._session) this._setCursor(this._session.getCursor());
    },
    
    _handleDragSessionCursorChange: function(cursor) {
        if (this._session && this._session.getActive()) {
            this._setCursor(cursor);
        }
    },
    
    _setCursor: function(cursor) {
        if (!cursor) {
            if (!this._cursorStylesheet) return;
            this._cursorStylesheet.parentNode.removeChild(this._cursorStylesheet);
            this._cursorStylesheet = null;
            return;
        }
        if (!this._cursorStylesheet) {
            this._cursorStylesheet = document.createElement('style');
            this._cursorStylesheet.setAttribute('type', 'text/css');
            document.head.appendChild(this._cursorStylesheet);
        }
        this._cursorStylesheet.innerText = "* {cursor: " + cursor + "}";
    },
    
    _releaseResources: function() {
        this._unregHandler();
        Amm.View.Html.Drag.prototype._releaseResources.call(this);
    },
    
};

Amm.extend(Amm.View.Html.Drag.Controller, Amm.View.Html.Drag);

