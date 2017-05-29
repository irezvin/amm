/* global Amm */
(function() {
    
    QUnit.test("Amm.ElementBound", function(assert) {
        
        var elementA = new Amm.Element({traits: ['Amm.Trait.Composite'], id : 'a'});
        var elementB = new Amm.Element({
            traits: [Amm.Trait.Visual], 
            id : 'b', 
            parent: elementA
        });
        
        var pathBound = new Amm.ElementBound({elementPath: '^/a/b'});
        Amm.getRoot().addChild(elementA);
        assert.ok(pathBound.getElement() === elementB, 
            'elementBound received element when its\' path appeared' );
            
        var rqComposite = new Amm.ElementBound({requiredElementClass: 'Composite'});
        var rqVisual = new Amm.ElementBound({requiredElementInterfaces: ['Visual']});
        assert.throws(
            function() { rqComposite.setElement(elementB); },
            /must be an instance/,
            'requiredElementClass throws on wrong class'
        );
        rqComposite.setElement(elementA); // ok
        
        assert.throws(
            function() { rqVisual.setElement(elementA); },
            /must implement all following interfaces/,
            'requiredElementInterfaces throws on wrong instance'
        );
        rqVisual.setElement(elementB); // ok
        
        elementB.cleanup();
        assert.equal(rqVisual.getElement(), null, 
            'ElementBound cleanup on element cleanup');
        assert.equal(pathBound.getElement(), null, 
            'ElementBound cleanup on element cleanup');
        
    });
        
}) ();