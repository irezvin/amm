/* global Amm */

Amm.Ui.Paginator = function(options) {
    Amm.Element.call(this, options);
};

Amm.Ui.Paginator.prototype = {

    'Amm.Ui.Paginator': '__CLASS__', 
    
    _recordsPerPage: 20,

    _numPages: 0,

    _numRecords: 0,

    _offset: 0,

    _page: 0,
    
    // should be called after regularFirstLast / showFirst / showLast / showNext / showPrev are changed
    update: function() {
        this.outUpdate();
    },
    
    setRecordsPerPage: function(recordsPerPage) {
        if (recordsPerPage === null || recordsPerPage === undefined) recordsPerPage = 20;
        recordsPerPage = parseInt(recordsPerPage);
        if (isNaN(recordsPerPage) || recordsPerPage <= 0) {
            throw Error("`recordsPerPage` must be a number greater than 0");
        }
        var oldRecordsPerPage = this._recordsPerPage;
        if (oldRecordsPerPage === recordsPerPage) return;
        this._recordsPerPage = recordsPerPage;
        var oldNumPages = this._numPages;
        this._numPages = Math.ceil(this._numRecords / this._recordsPerPage);
        // change page no to keep current offset visible
        var oldPage = this._page, oldOffset = this._offset;
        this._page = Math.floor(this._offset / this._recordsPerPage);
        this._offset = this._page * this._recordsPerPage;
        this.outRecordsPerPageChange(recordsPerPage, oldRecordsPerPage);
        if (this._numPages !== oldNumPages) {
            this.outNumPagesChange(this._numPages, oldNumPages);
        }
        if (this._offset !== oldOffset) {
            this.outOffsetChange(this._offset, oldOffset);
        }
        if (this._page !== oldPage) {
            this.outPageChange(this._page, oldPage);
        }
        this.update();
        return true;
    },
    
    getRecordsPerPage: function() { return this._recordsPerPage; },

    outRecordsPerPageChange: function(recordsPerPage, oldRecordsPerPage) {
        this._out('recordsPerPageChange', recordsPerPage, oldRecordsPerPage);
    },

    setNumPages: function(numPages) {
        numPages = parseInt(numPages);
        if (isNaN(numPages) || numPages < 0) {
            throw Error("`numPages` must be a number not less than 0");
        }
        var oldNumPages = this._numPages;
        if (oldNumPages === numPages) return;
        this._numPages = numPages;
        var oldNumRecords = this._numRecords;
        this._numRecords = this._numPages * this._recordsPerPage;
        this.outNumPagesChange(numPages, oldNumPages);
        if (this._numRecords !== oldNumRecords) {
            this.outNumRecordsChange(this._numRecords, oldNumRecords);
        }
        this.update();
        return true;
    },

    getNumPages: function() { return this._numPages; },

    outNumPagesChange: function(numPages, oldNumPages) {
        this._out('numPagesChange', numPages, oldNumPages);
    },

    setNumRecords: function(numRecords) {
        if (numRecords === null || numRecords === undefined) numRecords = 0;
        numRecords = parseInt(numRecords);
        if (isNaN(numRecords) || numRecords < 0) {
            throw Error("`numRecords` must be a number not less than 0");
        }
        var oldNumRecords = this._numRecords;
        if (oldNumRecords === numRecords) return;
        this._numRecords = numRecords;
        var oldNumPages = this._numPages;
        this._numPages = Math.ceil(this._numRecords / this._recordsPerPage);
        this.outNumRecordsChange(numRecords, oldNumRecords);
        if (this._numPages !== oldNumPages) {
            this.outNumPagesChange(this._numPages, oldNumPages);
        }        
        this.update();
        return true;
    },

    getNumRecords: function() { return this._numRecords; },

    outNumRecordsChange: function(numRecords, oldNumRecords) {
        this._out('numRecordsChange', numRecords, oldNumRecords);
    },

    setOffset: function(offset) {
        if (offset === null) offset = 0;
        offset = parseInt(offset);
        if (isNaN(offset) || offset < 0) {
            throw Error("`offset` must be a number not less than 0");
        }
        var oldOffset = this._offset;
        if (oldOffset === offset) return;
        this._offset = offset;
        var oldPage = this._page;
        this._page = Math.floor(this._offset / this._recordsPerPage);
        this.outOffsetChange(offset, oldOffset);
        if (oldPage !== this._page) this.outPageChange(this._page, oldPage);
        this.update();
        return true;
    },

    getOffset: function() { return this._offset; },

    outOffsetChange: function(offset, oldOffset) {
        this._out('offsetChange', offset, oldOffset);
    },

    setPage: function(page) {
        page = parseInt(page);
        if (isNaN(page) || page < 0) {
            throw Error("`numRecords` must be a number not less than 0");
        }
        var oldPage = this._page;
        if (oldPage === page) return;
        var oldOffset = this._offset;
        this._page = page;
        this._offset = this._page*this._recordsPerPage;
        this.outPageChange(page, oldPage);
        if (this._offset !== oldOffset) {
            this.outOffsetChange(this._offset, oldOffset);
        }
        this.update();
        return true;
    },

    getPage: function() { return this._page; },

    outPageChange: function(page, oldPage) {
        this._out('pageChange', page, oldPage);
    },
    
    outUpdate: function() {
        this._out('update');
    }

};

Amm.extend(Amm.Ui.Paginator, Amm.Element);