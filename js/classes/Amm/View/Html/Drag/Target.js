/* global Amm */

Amm.View.Html.Drag.Target = function(options) {
    Amm.View.Html.Drag.call(this, options);
};

Amm.View.Html.Drag.Target.prototype = {

    'Amm.View.Html.Drag.Target': '__CLASS__', 
    
    requiredElementInterfaces: ['DragTarget'],
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Drag.Target];
    },

};

Amm.extend(Amm.View.Html.Drag.Target, Amm.View.Html.Drag);

