/* global Amm */

console.log("Amm test file", Amm);

var hier = new Amm.Element.Composite({id: 'hier'});
var sub = new Amm.Element.Composite({id: 'sub', parent: hier});
var or = new Amm.Element.Composite({id: 'or'});
new Amm.Property({id: 'p1', parent: hier});
new Amm.Property({id: 'p2', parent: hier});
new Amm.Property({id: 'p1', parent: sub});
new Amm.Property({id: 'p2', parent: sub});
new Amm.Property({id: 'p1', parent: or});
new Amm.Property({id: 'p2', parent: or});
