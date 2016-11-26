/* global Amm */
QUnit.test("Amm.WithEvents", function(assert) {
    var e = new Amm.WithEvents();
    e.outEventA = function(val) { this._out('eventA', val); };
    e.outEventB = function(val) { this._out('eventB', val); };
    assert.deepEqual(e.listEvents(), ['eventA', 'eventB']);
    assert.equal(e.hasEvent('eventA'), 'outEventA');
    assert.equal(e.hasEvent('eventB'), 'outEventB');
    assert.equal(e.hasEvent('eventC'), false);
});