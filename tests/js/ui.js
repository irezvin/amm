/* global Amm */
/* global QUnit */

(function () {

    QUnit.module("Ui");

    QUnit.test("Ui.Paginator", function (assert) {

        var p = new Amm.Ui.Paginator({
            recordsPerPage: 10,
            numRecords: 105,
        });
        var v = new Amm.View.Html.Paginator({
            
            element: p,
            htmlElement: Amm.dom({$: 'div'}),
            
            showFirst: true,
            showLast: true,
            
            lblFirst: ' F ',
            lblPrev: ' P ',
            lblLast: ' L ',
            lblNext: ' N ',
            lblEllipsis: ' ... ',
            lblRegular: ' {page} ',
            lblActive: ' [{page}] ',

            iconFirst: ' f ',
            iconPrev: ' p ',
            iconLast: ' l ',
            iconNext: ' n ',
            iconEllipsis: ' _ ',
            iconRegular: ' {page} ',
            iconActive: ' ({page}) ',
                        
        });
        
        var vv = {
            numPages: null,
            numRecords: null,
            offset: null,
            page: null
        };
        
        var txt = function(d) { return v.getHtmlElement().textContent.replace(/ +/g, ' ').replace(/^ | $/g, ''); };
        
        Amm.subUnsub(p, null, vv, [
            'numPagesChange', 
            'numRecordsChange', 
            'offsetChange', 
            'pageChange'
        ], function(v) {
            this[Amm.event.name.replace(/Change/, '')] = v;
        });

        assert.deepEqual(p.getNumPages(), 11,
            'given numRecords and recordsPerPage, numPages is proper');
            
        p.setPage(2);
        assert.deepEqual(vv.offset, 20, 'Offset changed according to current page');
        
        p.setRecordsPerPage(5);
        assert.deepEqual(vv.page, 4,
            'setRecordsPerPage: current page changed');
        assert.deepEqual(vv.offset, 20,
            'setRecordsPerPage: offset changed');
        
        p.setRecordsPerPage(7);
        
        assert.deepEqual(vv.page, 2,
            'setRecordsPerPage: current page changed (2)');
        assert.deepEqual(vv.offset, 14,
            'setRecordsPerPage: offset changed (2)');

        assert.ok(v.getObserving(), 'View is observing');
            assert.deepEqual(v.getNumPages(), p.getNumPages(), 'View correctly updates numPages');
            assert.deepEqual(v.getPage(), p.getPage(), 'View correctly updates page');
            assert.deepEqual(txt(), 'F P 1 2 [3] 4 5 ... 15 N L',
                'Paginator properly rendered (basic)');
        
        p.setPage(6);
            assert.deepEqual(txt(), 'F P 1 ... 5 6 [7] 8 9 ... 15 N L',
                'Page # updated - paginator properly re-rendered');
        
        v.setShowLastNum(false);
            assert.deepEqual(txt(), 'F P 1 ... 5 6 [7] 8 9 N L',
                'showLastNum disabled - paginator properly re-rendered');
        
        v.setShowLast(false);
            assert.deepEqual(txt(), 'F P 1 ... 5 6 [7] 8 9 N',
                'showLast disabled - paginator properly re-rendered');
        
        v.setShowFirst(false);
            assert.deepEqual(txt(), 'P 1 ... 5 6 [7] 8 9 N',
                'showFirst disabled - paginator properly re-rendered');
        
        p.setPage(3);
            assert.deepEqual(txt(), 'P 1 2 3 [4] 5 6 N',
                "One page instead of leading ellipsis: num is shown (1)");
        
        p.setPage(4);
            assert.deepEqual(txt(), 'P 1 2 3 4 [5] 6 7 N',
                "One page instead of leading ellipsis: num is shown (2)");

        v.setShowLastNum(true);
        p.setPage(11);
            assert.deepEqual(txt(), 'P 1 ... 10 11 [12] 13 14 15 N',
                "One page instead of trailing ellipsis: num is shown (1)");
        
        p.setPage(10);
            assert.deepEqual(txt(), 'P 1 ... 9 10 [11] 12 13 14 15 N',
                "One page instead of trailing ellipsis: num is shown (2)");
        
        v.setUseIcons(true);
            assert.deepEqual(txt(), 'p 1 _ 9 10 (11) 12 13 14 15 n',
                "setUseIcons(true) works");
                
        p.setOffset(p.getOffset() - 7);
            assert.deepEqual(p.getPage(), 9, 
            'setOffset: `page` changed');
        
        var node = jQuery(v.getHtmlElement());
        node.find('a[data-page=0]').click();
            assert.deepEqual(p.getPage(), 0, 
                'Link click: page changed (1)');
            assert.ok(node.find('a[data-page=0]').is('.page-link-kind-active'),
                'Link click: page link became active (1)');
                
        node.find('a[data-page=2]').click();
            assert.deepEqual(p.getPage(), 2,
                'Link click: page changed (2)');
            assert.notOk(node.find('a[data-page=0]').is('.page-link-kind-active'),
                'Old link no more active');
            assert.ok(node.find('a[data-page=2]').is('.page-link-kind-active'),
                'New link became active');
                
        Amm.cleanup(p);
        
    });

})();
