/* global Amm */

Amm.View.Html.JQueryListener = function(options) {
    var t = this;
    this._handler = function(event) { return t._receiveEvent(event, this); };    
    Amm.JQueryListener.call(this, {});
    Amm.View.Html.call(this);
    this.setHandler(this._handler);
};

Amm.View.Html.JQueryListener.prototype = {

    _doSetHtmlElement: function(htmlElement) {
        this.setSelector(htmlElement);
    },
    
};

Amm.extend(Amm.View.Html.JQueryListener, Amm.View.Html);
Amm.extend(Amm.View.Html.JQueryListener, Amm.JQueryListener);