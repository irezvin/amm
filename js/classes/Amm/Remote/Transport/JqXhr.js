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
    
    _failure: function(textStatus, errorThrown) { // is ran in RunningRequest scope
        this.failure(textStatus, errorThrown, this.getExtra().status);
    },
    
    _doAbortRunningRequest: function(runningRequest) {
        runningRequest.getExtra().abort();
    },
    
};

Amm.extend(Amm.Remote.Transport.JqXhr, Amm.Remote.Transport);

