/* global Amm */

Amm.View.Html.Table.SimpleKeyboardControl = function(options) {
    var t = this;
    this._domHandlers = {};
    for (var i in this) {
        if (
            typeof this[i] === 'function' 
            && i.slice(0, 11) === '_handleDom_'
        ) this._domHandlers[i.slice(11)] = (function(t, i) {
            return function(event) {
                return t[i](event, this);
            };
        })(t, i);
    }
    Amm.View.Abstract.call(this, options);
    Amm.View.Html.call(this, options);
};


Amm.View.Html.Table.SimpleKeyboardControl.prototype = {

    'Amm.View.Html.Table.SimpleKeyboardControl': '__CLASS__',
    
    requiredElementClass: 'Amm.Table.Table',

    escapeCancels: true,
    
    focusedCellBecomesActive: true,
    
    clickOnActiveCellActivatesEditor: true,
    
    stopEditingOnFocusLost: false,
    
    navigateBetweenSections: true,
    
    whenEditingTabThroughEditableCellsOnly: true,
    
    interceptFocus: true,

    _observesHtmlElement: false,
    
    editAndTypeOnStartTyping: true,
    
    _preventClickToEdit: false,
    
    _focusoutTimeoutSet: false,
    
    _handleDom_mousedown: function(event) {
        if (!this.clickOnActiveCellActivatesEditor) return;
        if (this._preventClickToEdit) return;
        var cell = Amm.findElement(event.target, 'Amm.Table.Cell');
        if (cell && cell.getActive() && !cell.getEditing() && cell.isEditable()) {
            cell.setEditing(true);
            event.preventDefault();
            event.stopPropagation();
        }
    },
    
    _handleDom_focusin: function(event) {
        if (!this.focusedCellBecomesActive) return;
        if (!(event.target.tagName === 'TD' || event.target.tagName === 'TH')) return;
        var cell = Amm.findElement(event.target, 'Amm.Table.Cell');
        if (cell && !cell.getActive() && cell.getCanActivate()) {
            cell.setActive(true);
        }
    },
    
    _handleDom_focusout: function(event) {
        var t = this;
        if (this._focusoutTimeoutSet) return;
        this._focusoutTimeoutSet = true;
        window.setTimeout(function() {
            t._focusoutTimeoutSet = false;
            var activeElement = Amm.View.Html.getFocusedNode();
            var tableHasFocus = 
                    activeElement && jQuery(activeElement).parents().filter(t._htmlElement).length;
            if (!tableHasFocus && t.stopEditingOnFocusLost) {
                if (t._element.editingCells.length === 1) {
                    t._element.editingCells[0].setEditing(false);
                }
            }
        }, 1);
    },
    
    _findAdjacent: function(rowOrCell, reverse, callback, mode, last) {
        if (!callback) callback = function(item) { 
            return item.getCanActivate(); 
        };
        var adj = rowOrCell, res;
        do {
            adj = adj.findAdjacent(reverse, callback, mode);
            if (!last) return adj;
            if (adj) res = adj;
        } while (adj);
        return res;
    },
    
    _findAdjacentRowNotInViewport: function(row, reverse, mode) {
        var w = jQuery(window), viewportTop = w.scrollTop(), viewportBottom = viewportTop + w.height(),
            inViewport = function(e) {
                var jq = jQuery(e);
                var elementTop = jq.offset().top;
                var elementBottom = elementTop + jq.outerHeight();
                return elementBottom > viewportTop && elementTop < viewportBottom;
            };
        return row.findAdjacent(reverse, function(r) { 
            if (!r.getVisible()) return;
            var view = r.findView(null, 'Amm.View.Html.Visual');  
            if (!view) return;
            var h = view.getHtmlElement();
            if (!h) return;
            return !inViewport(h);
        });
    },
    
    _handleDom_keydown: function(event) {
        
        var key = event.keyCode;
        var char = event.key;
        var handled = false;
        
        var rowNav = false,
            reverse = false,
            toTheLast = false,
            add = false,
            del = false,
            table = this._element,
            editableOnly = false;
        
        var cell = table.activeCell;
        
        if (!cell) return; // no active cell - cannot navigate
        
        var editing = cell && cell.getEditing();
        var activeElement = Amm.View.Html.getFocusedNode();
        
        // consider active element only if it's inside our table
        if (activeElement && !Amm.findElement(activeElement, function(e) {return e === table;})) {
            activeElement = null;
        }
        
        if (char === "Tab" && this.interceptFocus && !cell.getEditing()) {
            var otherCell = cell.findAdjacent(
                event.shiftKey, // reverse
                function(cell) { return cell.getCanActivate(); },
                Amm.Table.ADJACENT_ANY_SECTION
            );
            if (otherCell) {
                event.preventDefault();
                event.stopPropagation();
                otherCell.setActive(true);
                return;
            }
        }
        
        if (char === "F2") { // F2
            if (!cell.isEditable()) return;
            cell.setEditing(!editing);
            return;
        }
        
        if (char === "Escape") { // Esc
            if (!editing) return;
            if (this.escapeCancels) cell.cancelEdit();
            else cell.setEditing(false);
        }
        
        if (char === "Enter") {
            
            if (!editing && cell.isEditable()) {
                cell.setEditing(true);
                return;
            }
            if (editing && activeElement) {
                if (activeElement.tagName === 'INPUT' && (activeElement.type === 'text' || activeElement.type === 'password')) {
                    cell.confirmEdit();
                    return;
                }
            }
            return;
        }
        
        if (char.length === 1 && this.editAndTypeOnStartTyping 
                && !event.ctrlKey && !event.altKey
                && !editing && cell.isEditable()
        ) {
            var editor = cell.findEditor();
            if (editor && editor.findView(null, 'Amm.View.Html.Input')) {
                cell.setEditing(true);
                editor.setValue(char);
                event.preventDefault();
                return;
            }
        }
        
        if (cell.getEditing() && activeElement) {
            
            // TODO: ensure this element is actually inside table active cell
            
            if (activeElement.tagName === 'INPUT' && (activeElement.type === 'text' || activeElement.type === 'password') || activeElement.tagName === 'TEXTAREA') {
                if (activeElement.selectionStart !== activeElement.selectionEnd) return; // some text selected
                
                if (activeElement.selectionStart !== 0 
                    && (char === "ArrowLeft" || char === "ArrowUp" || char === "Home")) return;
            
                if (activeElement.selectionStart !== activeElement.value.length 
                    && (char === "ArrowRight" || char === "ArrowDown" || char === "End")) return;
            }
        }
        if (char === "Delete" && event.ctrlKey) { // ctrl-del
            del = true;
            rowNav = true;
        } else if (char === "Tab") {
            // shift-tab works as "left", but only if cell is being edited
            if (!editing) return;
            if (event.shiftKey) reverse = true;
            if (this.whenEditingTabThroughEditableCellsOnly) editableOnly = true;
        } else if (char === "ArrowLeft") {
            // left
            reverse = true;
            toTheLast = event.ctrlKey;
            if (editing && this.whenEditingTabThroughEditableCellsOnly) editableOnly = true;
        } else if (char === "ArrowRight") {
            // right
            toTheLast = event.ctrlKey;
            if (editing && this.whenEditingTabThroughEditableCellsOnly) editableOnly = true;
        } else if (char === "ArrowUp") {
            rowNav = true; // up
            reverse = true;
            toTheLast = event.ctrlKey;
        } else if (char === "ArrowDown") {
            rowNav = true; // down
            toTheLast = event.ctrlKey;
        } else if (char === "Home") {
            rowNav = false; // down
            toTheLast = true;
            reverse = true;
            if (event.ctrlKey) toTheLast = "AllCells";
            if (this._element.notifyHome(toTheLast)) return;
        } else if (char === "End") {
            rowNav = false; // down
            toTheLast = true;
            if (event.ctrlKey) toTheLast = "AllCells";
            if (this._element.notifyEnd(toTheLast)) return;            
        } else if (char === "PageDown") {
            if (this._element.notifyPageDown()) return;
            rowNav = true;
            toTheLast = "page";
        } else if (char === "PageUp") {
            if (this._element.notifyPageUp()) return;
            rowNav = true;
            toTheLast = "page";
            reverse = true;
        } else {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        var adjacentMode = this.navigateBetweenSections? Amm.Table.ADJACENT_ANY_SECTION : null;
        if (!del) add = !reverse && !toTheLast;
        var cell = cell, row = table.activeRow, column = table.activeColumn,
            nextRow, nextCell;
        if (rowNav) {
            if (toTheLast === "page") {
                nextRow = this._findAdjacentRowNotInViewport(row, reverse, adjacentMode);
                if (!nextRow) {
                    toTheLast = true;
                }
            }
            if (!nextRow) {
                nextRow = this._findAdjacent(row, reverse, null, adjacentMode, toTheLast);
                if (!nextRow && !toTheLast) {
                    if (reverse) {
                        handled = this._element.notifyNavBeforeFirstRow();
                    } else {
                        handled = this._element.notifyNavPastLastRow();
                    }
                }
            }
        } else {
            if (toTheLast && toTheLast !== "AllCells") adjacentMode = Amm.Table.ADJACENT_SAME_ROW;
            var cb = null;
            if (editableOnly) cb = function(cell) { return cell.isEditable() && cell.getCanActivate(); };
            nextCell = this._findAdjacent(cell, reverse, cb, adjacentMode, toTheLast);
        }
        var item = cell.getItem();
        var nextItem = nextCell? nextCell.getItem() : null;
        if (item !== nextItem || !nextCell) {
            if (rowNav && (!item || this._element.checkIsItemBlank(item))) {
                if (add) add = false;
                else if (item) {
                    handled = this._element.notifyLeaveBlankItem();
                    if (!handled) {
                        del = "blank"; // delete item w/o values
                    }
                }
            }
        }
        if (nextRow) {
            nextRow.setActive();
            if (toTheLast === "page") {
                var view = nextRow.findView(null, 'Amm.View.Html.Visual');
                if (view) {
                    domElement = view.getHtmlElement();
                    if (domElement) domElement.scrollIntoView(!reverse);
                }
            }
            nextCell = cell;
        }
        if (!nextCell) {
            if (del) nextRow = row.findAdjacent(!reverse, null, adjacentMode);
            else if (add) {
                var item;
                handled = this._element.notifyAddBlankItem();
                if (handled && typeof handled === 'object') {
                    item = handled;
                    handled = false;
                } else if (!handled) {
                    item = {};
                }
                if (!handled && item) {
                    cell.getTable().items.accept(item);
                    nextRow = row.findAdjacent(reverse, null, adjacentMode);
                }
            } else {
                return;
            }
        }
        if (del && item) {
            handled = this._element.notifyDeleteItem(item, del === "blank");
            if (handled) {
                del = false;
            } else {
                cell.getTable().items.reject(item);
            }
            if (this._element.getActiveCell()) nextRow = null;
        }
        if (nextRow) nextRow.setActive();
        else if (nextCell) nextCell.setActive();
    },
    
    _observeHtmlElement: function(element) {
        element = element || this._htmlElement;
        if (this._observesHtmlElement) return;
        this._observesHtmlElement = true;
        var jq = jQuery(this._htmlElement);
        for (var i in this._domHandlers) if (this._domHandlers.hasOwnProperty(i)) {
            jq.on(i, this._domHandlers[i]);
        }
        var ti = parseInt(element.getAttribute('tabIndex'));
        if (isNaN(ti) || ti < 0) element.setAttribute('tabIndex', 0);
    },
    
    _unobserveHtmlElement: function(element) {
        element = element || this._htmlElement;
        if (!this._observesHtmlElement) return;
        this._observesHtmlElement = false;
        var jq = jQuery(this._htmlElement);
        for (var i in this._domHandlers) if (this._domHandlers.hasOwnProperty(i)) {
            jq.off(i, this._domHandlers[i]);
        }
    },
    
    _doSetHtmlElement: function(element, oldElement) {
        Amm.View.Html.prototype._doSetHtmlElement.call(this, element, oldElement);
        if (this._observesHtmlElement && oldElement) {
            this._unobserveHtmlElement(oldElement);
        }
        if (this._observing && element) {
            this._observeHtmlElement(element);
        }
    },
    
    _tryObserve: function() {
        var res = Amm.View.Abstract.prototype._tryObserve.call(this);
        if (!res) return res;
        if (this._htmlElement) this._observeHtmlElement();
        return res;
    },
    
    _endObserve: function() {
        var res = Amm.View.Abstract.prototype._endObserve.call(this);
        if (this._htmlElement) this._unobserveHtmlElement();
        return res;
    },
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Table.SimpleKeyboardControl];
    },
    
};

Amm.extend(Amm.View.Html.Table.SimpleKeyboardControl, Amm.View.Html);
Amm.extend(Amm.View.Html.Table.SimpleKeyboardControl, Amm.View.Abstract);
