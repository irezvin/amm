/* global Amm */
/* global QUnit */

(function() {

    QUnit.module("Dimensions");
    
    QUnit.test("Amm.Trait.Dimensions", function(assert) {
        
        var fx = jQuery("#qunit-fixture");
       
        fx.html( ''
            +   '<style type="text/css">\n'
            +   '   #dims {width: 150px; height: 50px; left: -30px; position: relative}\n'
            +   '</style>\n'
            +   '<div id="dims" class="draggable" data-amm-v="v.Dimensions" data-amm-id="dims" id="dims">\n'
            +   '</div>\n'
        );
        
        var oldNumIntervalSubscribers = Amm.r.getSubscribers('interval').length; // should be 0, preferably
       
        var b = new Amm.Builder(fx, {topLevelComponent: 'root'});
        var elements = b.build();
        
        var jq = jQuery('#dims');
        var dims = Amm.r.e.dims;
        
        var initial = {
            width: jq.width(),
            height: jq.height(),
            left: jq.offset().left,
            top: jq.offset().top
        };
        
            assert.deepEqual(dims.getWidth(), initial.width, 'Width is correct');
            assert.deepEqual(dims.getHeight(), initial.height, 'Height is correct');

            assert.deepEqual(dims.getLeft(), initial.left, 'Left is correct');
            assert.deepEqual(dims.getTop(), initial.top, 'Top is correct');

            assert.deepEqual(dims.getRight(), initial.left + initial.width, 'Right is correct');
            assert.deepEqual(dims.getBottom(), initial.top + initial.height, 'Bottom is correct');
        
        var deltas = {
            left: 15,
            top: 23,
            width: 7,
            height: 12
        };
        
        dims.setWidth(dims.getWidth() + deltas.width);
        dims.setHeight(dims.getHeight() + deltas.height);
        
        dims.setLeft(dims.getLeft() + deltas.left);
        dims.setTop(dims.getTop() + deltas.top);
        
            assert.deepEqual(dims.getWidth(), initial.width + deltas.width, 'Pos change: new Width is correct');
            assert.deepEqual(dims.getHeight(), initial.height + deltas.height, 'Pos change: new Height is correct');

            assert.deepEqual(dims.getLeft(), initial.left + deltas.left, 'Pos change: new Left is correct');
            assert.deepEqual(dims.getTop(), initial.top + deltas.top, 'Pos change: new Top is correct');

            assert.deepEqual(dims.getRight(), initial.left + initial.width + deltas.left + deltas.width, 'Pos change: new Right is correct');
            assert.deepEqual(dims.getBottom(), initial.top + initial.height + deltas.top + deltas.height, 'Pos change: new Bottom is correct');
            
            assert.equal(Amm.r.getSubscribers('interval').length, oldNumIntervalSubscribers, 'No new interval subscribers appeared until dimensions not observed');
        
        // Unset width, height
            
        dims.setWidth(null);
        dims.setHeight(null);
        dims.setLeft(null);
        dims.setTop(null);
        
            assert.deepEqual(dims.getWidth(), initial.width, 'Width is reset to initial value');
            assert.deepEqual(dims.getHeight(), initial.height, 'Height is reset to initial value');

            assert.deepEqual(dims.getLeft(), initial.left, 'Left is reset to initial value');
            assert.deepEqual(dims.getTop(), initial.top, 'Top is reset to initial value');

            assert.deepEqual(dims.getRight(), initial.left + initial.width, 'Right is reset to initial value');
            assert.deepEqual(dims.getBottom(), initial.top + initial.height, 'Bottom is reset to initial value');
                
            
        dims.setWidth(null);
        dims.setHeight(null);        
        dims.setLeft(null);
        dims.setTop(null);                
        dims.setRight(null);
        dims.setBottom(null);                
            
        var vals = {
        };
        
        var evList = ['leftChange', 'topChange', 'rightChange', 'bottomChange', 'widthChange', 'heightChange'];
        
        Amm.subUnsub(dims, null, vals, evList, function(v) {
            //if (Amm.event.name === 'bottomChange' && v === 0) console.trace();
            this[Amm.event.name.replace(/Change$/, '')] = v;
        });
        
            assert.equal(Amm.r.getSubscribers('interval').length, oldNumIntervalSubscribers + 1, 'New interval subscribers appeared after dimensions observed');
        
        Amm.r.outInterval();
        
        assert.deepEqual(Amm.keys(vals).length, 0, 'no events raised because dimensions not changed');
        
        jq.width(initial.width + deltas.width);
        jq.height(initial.height + deltas.height);
        jq.offset({left: initial.left + deltas.left, top: initial.top + deltas.top});
        
        Amm.r.outInterval();
        
            
            assert.deepEqual(vals.width, initial.width + deltas.width, 'Pos observation: new Width is correct');
            assert.deepEqual(vals.height, initial.height + deltas.height, 'Pos observation: new Height is correct');

            assert.deepEqual(vals.left, initial.left + deltas.left, 'Pos observation: new Left is correct');
            assert.deepEqual(vals.top, initial.top + deltas.top, 'Pos observation: new Top is correct');

            assert.deepEqual(vals.right, initial.left + initial.width + deltas.left + deltas.width, 'Pos observation: new Right is correct');
            assert.deepEqual(vals.bottom, initial.top + initial.height + deltas.top + deltas.height, 'Pos observation: new Bottom is correct');
                    
        dims.unsubscribe(undefined, undefined, vals);
        
            assert.equal(Amm.r.getSubscribers('interval').length, oldNumIntervalSubscribers, 'No more interval subscribers after dimensions not observed anymore');        
        
        Amm.cleanup(elements);
        
    });    
    
    QUnit.test("Amm.Trait.SingleDimension, Amm.View.Html.SingleDimension", function(assert) {
        
        var fx = jQuery("#qunit-fixture");
       
        fx.html( ''
            +   '<style type="text/css">\n'
            +   '   #dims {width: 150px; height: 50px; left: -30px; top: 40px; position: relative}\n'
            +   '</style>\n'
            +   '<div id="dims"></div>'
        );
        
        var oldNumIntervalSubscribers = Amm.r.getSubscribers('interval').length; // should be 0, preferably
        
        var DIMENSION = Amm.View.Abstract.SingleDimension.DIMENSION;
        
        var dims = new Amm.Element({
            traits: [Amm.Trait.SingleDimension]
        });
        
        var jq = jQuery('#dims');
        
        for (var i in DIMENSION) if (DIMENSION.hasOwnProperty(i)) {
            (function(prop, elem) {
                var p = Amm.ucFirst(prop);
                elem['get' + p] = function() { return this._implGetDimensionProperty(prop); };
                elem['set' + p] = function(value) { return this._implSetDimensionProperty(prop, value); };
                Amm.createProperty(elem, prop, undefined, null, true);
                new Amm.View.Html.SingleDimension({
                    element: elem,
                    htmlElement: jq[0], 
                    dimension: prop,
                    property: prop,
                });
            }) (DIMENSION[i], dims);

        }
       
        
        var initial = {
            width: jq.width(),
            height: jq.height(),
            left: jq.offset().left,
            top: jq.offset().top,
            positionLeft: jq.position().left,
            positionTop: jq.position().top,
            innerWidth: jq.innerWidth(),
            innerHeight: jq.innerHeight(),
        };
        
            assert.deepEqual(dims.getWidth(), initial.width, 'Width is correct');
            assert.deepEqual(dims.getHeight(), initial.height, 'Height is correct');

            assert.deepEqual(dims.getLeft(), initial.left, 'Left is correct');
            assert.deepEqual(dims.getTop(), initial.top, 'Top is correct');
        
            assert.deepEqual(dims.getInnerWidth(), initial.innerWidth, 'innerWidth is correct');
            assert.deepEqual(dims.getInnerHeight(), initial.innerHeight, 'innerHeight is correct');

            assert.deepEqual(dims.getPositionLeft(), initial.positionLeft, 'positionLeft is correct');
            assert.deepEqual(dims.getPositionTop(), initial.positionTop, 'positionTop is correct');

        var deltas = {
            left: 15,
            top: 23,
            width: 7,
            height: 12
        };
        
        dims.setWidth(dims.getWidth() + deltas.width);
        dims.setHeight(dims.getHeight() + deltas.height);
        
        dims.setLeft(dims.getLeft() + deltas.left);
        dims.setTop(dims.getTop() + deltas.top);
        
            assert.deepEqual(dims.getWidth(), initial.width + deltas.width, 'Pos change: new Width is correct');
            assert.deepEqual(dims.getHeight(), initial.height + deltas.height, 'Pos change: new Height is correct');

            assert.deepEqual(dims.getLeft(), initial.left + deltas.left, 'Pos change: new Left is correct');
            assert.deepEqual(dims.getTop(), initial.top + deltas.top, 'Pos change: new Top is correct');

            assert.equal(Amm.r.getSubscribers('interval').length, oldNumIntervalSubscribers, 'No new interval subscribers appeared until dimensions not observed');
        
        // Unset width, height
            
        dims.setWidth(null);
        dims.setHeight(null);
        dims.setLeft(null);
        dims.setTop(null);
        
            assert.deepEqual(dims.getWidth(), initial.width, 'Width is reset to initial value');
            assert.deepEqual(dims.getHeight(), initial.height, 'Height is reset to initial value');

            assert.deepEqual(dims.getLeft(), initial.left, 'Left is reset to initial value');
            assert.deepEqual(dims.getTop(), initial.top, 'Top is reset to initial value');

        var vals = {
        };
        
        var evList = ['leftChange', 'topChange', 'widthChange', 'heightChange', 'innerWidthChange', 'innerHeightChange', 'positionLeftChange', 'positionTopChange'];
        
        Amm.subUnsub(dims, null, vals, evList, function(v) {
            //if (Amm.event.name === 'bottomChange' && v === 0) console.trace();
            this[Amm.event.name.replace(/Change$/, '')] = v;
        });
        
            assert.equal(Amm.r.getSubscribers('interval').length, oldNumIntervalSubscribers + evList.length, 'New interval subscribers appeared after dimensions observed');
        
        Amm.r.outInterval();
        
        assert.deepEqual(Amm.keys(vals).length, 0, 'no events raised because dimensions not changed');
        
        jq.width(initial.width + deltas.width);
        jq.height(initial.height + deltas.height);
        jq.offset({left: initial.left + deltas.left, top: initial.top + deltas.top});
        
        Amm.r.outInterval();
            
            assert.deepEqual(vals.width, initial.width + deltas.width, 'Pos observation: new Width is correct');
            assert.deepEqual(vals.height, initial.height + deltas.height, 'Pos observation: new Height is correct');

            assert.deepEqual(vals.left, initial.left + deltas.left, 'Pos observation: new Left is correct');
            assert.deepEqual(vals.top, initial.top + deltas.top, 'Pos observation: new Top is correct');
            
            assert.deepEqual(vals.innerWidth, initial.innerWidth + deltas.width, 'Pos observation: new innerWidth is correct');
            assert.deepEqual(vals.height, initial.innerHeight + deltas.height, 'Pos observation: new innterHeight is correct');

            assert.deepEqual(vals.positionLeft, initial.positionLeft + deltas.left, 'Pos observation: new positionLeft is correct');
            assert.deepEqual(vals.positionTop, initial.positionTop + deltas.top, 'Pos observation: new positionTop is correct');

        dims.unsubscribe(undefined, undefined, vals);
        
            assert.equal(Amm.r.getSubscribers('interval').length, oldNumIntervalSubscribers, 'No more interval subscribers after dimensions not observed anymore');
        
        Amm.cleanup(dims);
        
    });    

    
    
}) ();
