/* global Amm */

Amm.Table.WithEditor = function(options) {
    Amm.WithEvents.call(this, options);
};

Amm.Table.WithEditor.prototype = {
    
    'Amm.Table.WithEditor': '__CLASS__',

    _editor: null,
    
    _editorIsOwn: false,
    
    _checkIsEditor: function(editor, arg) {
        return Amm.meetsRequirements(editor, [['Amm.Element', 'Visual', 'getValue']], arg);
    },
    
    setEditor: function(editor) {
        var editorIsOwn = false;
        if (!editor) {
            editor = null;
        } else {
            if (!Amm.getClass(editor)) {
                editor = Amm.constructInstance(editor, 'Amm.Element');
                editorIsOwn = true;
            }
            this._checkIsEditor(editor, 'editor');
        }
        var oldEditor = this._editor;
        if (oldEditor === editor) return;
        if (oldEditor && this._editorIsOwn) {
            oldEditor.cleanup();
        }
        this._editor = editor;
        this._editorIsOwn = editorIsOwn;
        this.outEditorChange(editor, oldEditor);
        return true;
    },

    getEditor: function() { return this._editor; },

    outEditorChange: function(editor, oldEditor) {
        this._out('editorChange', editor, oldEditor);
    },
    
};

Amm.extend(Amm.Table.WithEditor, Amm.WithEvents);