/* global Amm */
Amm.Data.TransactionRunner = function(options) {
    Amm.WithEvents.call(this, options);
};

Amm.Data.TransactionRunner.prototype = {
    
    'Amm.Data.TransactionRunner': '__CLASS__',
    
    _transaction: null,

    setTransaction: function(transaction) {
        if (!transaction) transaction = null;
        var oldTransaction = this._transaction;
        if (oldTransaction === transaction) return;
        if (this._transaction) throw Error("can setTransaction() only once");
        Amm.is(transaction, 'Amm.Data.Transaction', 'transaction');
        this._transaction = transaction;
        Amm.subUnsub(transaction, oldTransaction, this, '_handleTransaction');
        this.outTransactionChange(transaction, oldTransaction);
        return true;
    },

    getTransaction: function() { return this._transaction; },

    outTransactionChange: function(transaction, oldTransaction) {
        this._out('transactionChange', transaction, oldTransaction);
    },
    
    run: function() {
    },
    
    parse: function(response) {
    },
    
    cancel: function() {
    },
    
};

Amm.extend(Amm.Data.TransactionRunner, Amm.WithEvents);