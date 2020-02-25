/* global Amm */

Amm.Remote.Transport.JqXhr = function(options) {
    Amm.Remote.Transport.call(this, options);
};

Amm.Remote.Transport.JqXhr.prototype = {

    'Amm.Remote.Transport.JqXhr': '__CLASS__', 

    _doPrepareRunningRequest: function(runningRequest, constRequest, success, failure, scope) {
        var options = constRequest.getJqXhrOptions();
        options.context = runningRequest;
        var xhr = jQuery.ajax(constRequest.getUri(), options).done(runningRequest.success).fail(this._failure);
        runningRequest.setExtra(xhr);
    },
    
    _failure: function(jqXhr, textStatus, errorThrown) { // is ran in RunningRequest scope
        this.failure(textStatus, errorThrown, this.getExtra().status, jqXhr);
    },
    
    _doAbortRunningRequest: function(runningRequest) {
        runningRequest.getExtra().abort();
    }
    
};

Amm.extend(Amm.Remote.Transport.JqXhr, Amm.Remote.Transport);

Amm.Remote.Transport.JqXhr.parseResponseHeaders = function(strResponseHeaders) {
    var s = strResponseHeaders.split(/[\n\r]+/);
    var res = {}, key, value;
    for (var i = 0; i < s.length; i++) {
        s[i] = s[i].replace(/(^\s+)|(\s+$)/g, "");
        if (!s[i].length) continue;
        var m = s[i].match(/^([^:]+)\s*:\s*(.*)$/);
        if (!m) {
            key = "";
            value = s[i];
        } else {
            key = m[1].toLowerCase().replace(/(^\s+)|(\s+$)/g, "");
            value = m[2];
        }
        if (!res[key]) {
            res[key] = value;
            continue;
        }
        else if (typeof res[key] !== "Array") res[key] = [res[key]];
        res[key].push(value);
    }
    return res;
};
