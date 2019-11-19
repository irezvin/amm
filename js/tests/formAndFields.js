/* global Amm */
/* global QUnit */

(function() {

    QUnit.module("Form and Field");
    
    QUnit.test("Basic Field", function(assert) {
       
        var e;
                
        e = new Amm.Element({
            traits: ['Amm.Trait.Field'], 
            fieldValue: 10
        });
        
            assert.equal(e.getFieldValue(), 10, "Field returns value");

            assert.equal(e.getFieldInSyncWithAnnotations(), false, "W/o Annotated trait, Field not in sync with annotations");

            assert.equal(e.getFieldSyncsValue(), false, "W/o `value` member, Field not in sync with `value`");

            assert.equal(e.getNeedValidate(), false, "Initially we don't need to validate when there are no validators and field not required");

            assert.equal(e.getFieldErrors(), null, "Initially we don't have errors");
            
            assert.equal(e.validate(), true, "validate() returns TRUE on no errors");
            
        e.subscribe('onValidate', function(value, errors) {
            if (value === 10) errors.push("Value cannot be 10");
        });
            
            assert.equal(e.validate(), false, "onValidate works...");
            assert.deepEqual(e.getFieldErrors(), ["Value cannot be 10"], "...and populates errors");
            
        e.setFieldValue(11);
        
            assert.equal(e.validate(), true, "again valid");
            assert.deepEqual(e.getFieldErrors(), null, "and no errors after successful validation");
            
        
        Amm.cleanup(e);
        
        e = new Amm.Element({
                traits: ['Amm.Trait.Field'],
                fieldRequired: true, 
                fieldRequiredMessage: 'RQ',
                validateMode: Amm.Trait.Field.VALIDATE_NEVER
            });
        
            assert.equal(e.getNeedValidate(), true, 'ModelField.fieldRequired => !!getNeedValidate()');

            assert.equal(e.getFieldEmpty(), true, 'ModelField.fieldRequired w/o value => !!getFieldEmpty()');

            assert.deepEqual(e.getFieldErrors(), ['RQ'], 'Required field w/o value => error');

            assert.equal(e.getNeedValidate(), false, 'ModelField.getFieldErrors() => !needValidate()');
            
        e.setFieldValue(10);
        
            assert.equal(e.getNeedValidate(), true, 'ModelField.setFieldValue() + VALIDATE_NEVER => !getNeedValidate()');
        
            assert.equal(e.getFieldEmpty(), false, 'Non-"empty" value => !!getFieldEmpty()');
            
            assert.equal(e.validate(), true, 'Non-"empty" value => !!validate()');
            
            assert.equal(e.getFieldErrors(), null, 'Non-"empty" value => getFieldErrors() is null');
            
        e.setValidateMode(Amm.Trait.Field.VALIDATE_CHANGE);
        e.setFieldValue('z');
        
            assert.equal(e.getNeedValidate(), false, 'ModelField.setFieldValue() + VALIDATE_CHANGE => !!getNeedValidate()');
            
        e.setValidators([{
            class: 'Amm.Validator.Number',
            msgMustBeNumber: 'MustBeNumber'
        }]);
    
            assert.equal(e.getNeedValidate(), true, '.setValidators() => !!getNeedValidate()');
            assert.deepEqual(e.getFieldErrors(), null, 'we still have old field errors');
            assert.equal(e.validate(), false, 'validate() not passes because of new validators');
            assert.deepEqual(e.getFieldErrors(), ['MustBeNumber'], '.getFieldErrors() => msg from validator');
        
        Amm.cleanup(e);
            
        e = new Amm.Element({
            traits: ['Amm.Trait.Field', 'Amm.Trait.Input'],
            fieldValue: 11
        });
        
            assert.equal(e.getFieldSyncsValue(), true, "W/ `value` member, Field is in sync with `value`");
            assert.equal(e.getValue(), 11, "Initially `value` is same as `fieldValue`");
        
        Amm.cleanup(e);
        
        e = new Amm.Element({
            traits: ['Amm.Trait.Field', 'Amm.Trait.Input'],
            value: 11
        });
        
            assert.equal(e.getFieldValue(), 11, "Reverse initial sync (value => fieldValue)");

        e.setValue('z');
        
            assert.equal(e.getFieldValue(), 'z', "Set value => fieldValue changes");
        
            assert.equal(e.validate(), true, "Value is valid");
        
        Amm.cleanup(e);
        
    });
    
    QUnit.test('Amm.Trait.Field + Translator', function(assert) {

        var tr = new Amm.Translator({

            inValidator: function(v) {
                if (v === 'eee') return '[in] eee is not allowed';
            },

            inDecorator: function(v) {
                if (typeof v !== 'string') return v;
                return 'xx' + v + 'xx';
            },

            outValidator: function(v) {
                if (v === 'xxeeexx') return '[out] xxeeexx is not allowed';
            },

            outDecorator: function(v) {
                if (typeof v !== 'string') return v;
                return v.replace(/^xx|xx$/g, '');
            }

        });
        
        var e = new Amm.Element({
            traits: ['Amm.Trait.Field', 'Amm.Trait.Input'],
            fieldLabel: 'theField',
            fieldTranslator: tr,
            value: 11
        });
            
            assert.equal(tr.field, 'theField', '`fieldTranslator.field` is set from field label');
            
            e.setFieldLabel('theField2');
            
            assert.equal(tr.field, 'theField2', '`fieldTranslator.field` is updated from field label');
            
            
        e.setValue('m');

            assert.equal(e.getFieldValue(), 'xxmxx', 'setValue(): translator is applied');

        e.setFieldValue('xxqqxx');

            assert.equal(e.getValue(), 'qq', 'setFieldValue(): translator is applied');

        e.setFieldValue('xxeeexx');

            assert.equal(e.getValue(), null, 'Out translation error state: `value ` is null');
            assert.equal(e.getTranslationErrorState(), Amm.Trait.Field.TRANSLATION_ERROR_OUT, 'Out translation error state flag');
            assert.equal(e.validate(), false, '!validate() during translation error state');
            assert.equal(e.getTranslationErrorState(), Amm.Trait.Field.TRANSLATION_ERROR_OUT, 'Out translation error state flag isn\' reset by validate()');
            assert.deepEqual(e.getFieldErrors(), ['[out] xxeeexx is not allowed'], 'Out translation error state `fieldErrors`');
            assert.equal(e.getFieldValue(), 'xxeeexx', 'Out translation error state: `fieldValue` preserved');

        e.setFieldTranslator(null);

            assert.equal(e.getValue(), 'xxeeexx', 'Out translation error state: resume after translator changed');
            assert.equal(e.getTranslationErrorState(), 0, 'Out translation error state: reset after there\'s no translator or errors');

        e.setFieldTranslator(tr);
        e.setFieldValue('xxVVxx');

            assert.equal(e.getValue(), 'VV', 'Proper value mapping');
            assert.equal(e.getTranslationErrorState(), 0);
            assert.equal(e.getFieldErrors(), null);

        e.setValue('eee');

            assert.equal(e.getFieldValue(), null, 'In translation error state: `propertValue` is null');
            assert.equal(e.getTranslationErrorState(), Amm.Trait.Field.TRANSLATION_ERROR_IN, 'In translation error state: proper flag value');
            assert.deepEqual(e.getFieldErrors(), ['[in] eee is not allowed'], 'In translation error state: `fieldErrors` from translator');
            assert.equal(e.getValue(), 'eee', 'In translation error: `value` remains the same');

        e.setFieldTranslator(null);

            assert.equal(e.getTranslationErrorState(), 0, 'In translation error state: reset flag after translator change/clear');
            assert.equal(e.getFieldValue(), 'eee', 'In translation error state: `fieldValue` is updated from saved value after translator change/clear');
            
        Amm.cleanup(e);
            
    });
    
    QUnit.test('Amm.Trait.Field + Annotated integration', function(assert) {
        
        var e;
        
        e = new Amm.Element({
           
            traits: ['Amm.Trait.Field', 'Amm.Trait.Annotated'],
            
            label: 'TheLabel',
            
            error: ['XX', 'YY'],
            
            required: true            
            
        });
        
            assert.equal(e.getFieldInSyncWithAnnotations(), true, '!!getFieldInSyncWithAnnotations()');
            assert.equal(e.getFieldLabel(), 'TheLabel', 'Initial sync: label');
            assert.equal(e.getFieldRequired(), true, 'Initial sync: required');
            assert.deepEqual(e.getFieldErrors(), ['XX', 'YY'], 'Initial sync: errors');
        
        e.setFieldErrors(null);
        e.setFieldRequired(false);
        e.setFieldLabel('TheLabel2');
        
            assert.equal(e.getError(), null, 'Field -> annotation sync: error');
            assert.equal(e.getRequired(), false, 'Field -> annotation sync: required');
            assert.equal(e.getLabel(), 'TheLabel2', 'Field -> annotation sync: label');
        
        e = new Amm.Element({traits: ['Amm.Trait.Field', 'Amm.Trait.Annotated']});
        
            e.setRequired(true);
            e.setLabel('TheLabel');
            e.setError(['XX', 'YY']);
            
            assert.equal(e.getFieldLabel(), 'TheLabel', 'Late sync: label');
            assert.equal(e.getFieldRequired(), true, 'Late sync: required');
            assert.deepEqual(e.getFieldErrors(), ['XX', 'YY'], 'Late sync: errors');
            
        Amm.cleanup(e);
            
    });
    
    QUnit.test("Field.validationExpressions", function(assert) {
       
        var age, experience;
        
        age = new Amm.Element({
            traits: ['Amm.Trait.Field']
        });
        
        experience = new Amm.Element({
            traits: ['Amm.Trait.Field'],
            properties: {
                age: age
            },
            validationExpressions: [
                "this.age.fieldValue && this.age.fieldValue * 1 < this.fieldValue*1 && 'Experience must be less than age'"
            ]
        });
        
        var err;
        
        experience.subscribe("fieldErrorsChange", function(e) { err = e; });
        
        age.setFieldValue(10);
        
            assert.deepEqual(experience.getFieldErrors(), null);
        
        experience.setFieldValue(11);
        
            assert.deepEqual(err, ['Experience must be less than age']);
            
        age.setFieldValue(12);
        
            assert.deepEqual(err, null);
            
        Amm.cleanup(age, experience);            
            
    });
    
    QUnit.test("Form.fieldCollectionSync", function(assert) {

        var items = ['a', 'b', 'c', 'd', 'e', 'f'];
        
        var f = {
        };
        
        for (var i = 0; i < items.length; i++) {
            f[items[i]] = new Amm.Element({
                id: items[i],
                fieldValue: items[i] + 'v',
                traits: [
                    Amm.Trait.Visual,
                    Amm.Trait.Field,
                ],
            });
        }
        
        f.g = new Amm.Element({traits: [Amm.Trait.Visual]});
        
        var e = new Amm.Element({
            id: 'form',
            traits: [
                Amm.Trait.DisplayParent, 
                Amm.Trait.Form, 
                Amm.Trait.Component
            ],
            passDisplayChildrenToComponent: false,
            fields: [f.d, f.e, f.f]            
        });
        
        assert.equal(e.fields.length, 3, 'Form has 3 fields that were provided in the prototype');
        assert.deepEqual(e.getFieldValue(), {d: 'dv', e: 'ev', f: 'fv'}, 
            'Initialy-added fields have cooresponding values');
        
        f.a.setDisplayParent(e);
        
            assert.ok(f.a.getForm() === e, 'display child was added to the form');
        
        f.a.setComponent(e);
        f.b.setComponent(e);
        
        f.c.setComponent(e);
        
        f.g.setComponent(e);
        f.g.setComponent(e);
        f.g.setDisplayParent(e);
        
        assert.equal(e.fields.length, 6, 'Form has 3 more fields');
        assert.deepEqual(e.getFieldValue(), {a: 'av', b: 'bv', c: 'cv', d: 'dv', e: 'ev', f: 'fv'}, 
            'Initialy-added fields have cooresponding values');
        
        f.a.setDisplayParent(null);
            assert.ok(f.a.getForm() === e, 'display child is still in the form because it is part of Component');
        
        f.a.setComponent(null);
            assert.ok(f.a.getForm() === null, 'field was removed (no longer both display child and component)');
        
        f.b.setComponent(null);
            assert.ok(f.b.getForm() === null, 'field was removed (no longer component)');
        
        f.c.setComponent(null);
            assert.ok(f.c.getForm() === null, 'field was removed (elementsAreFields := true)');
        
        f.a.setDisplayParent(e);
            assert.ok(f.a.getForm() === e);
        
        e.setDisplayChildrenAreFields(false);
            assert.ok(f.a.getForm() === null, 'field was removed (displayChildrenAreFields := false)');
        
        f.b.setComponent(e);
            assert.ok(f.b.getForm() === e);
        
        e.setElementsAreFields(false);
            assert.ok(f.b.getForm() === null, 'field was removed (elementsAreFields := false)');
        
        e.setElementsAreFields(true);
            assert.ok(f.b.getForm() === e, 'field was added (elementsAreFields := true)');
        
        Amm.cleanup(f.a, f.b, f.c, f.d, f.e, f.g, e);
        
    });
    
    QUnit.test("Form", function(assert) {
        
        var made = [];
        
        var mk = function(id, fieldValue, extra) {
            var proto = {
                id: id,
                traits: 'Amm.Trait.Field'
            };
            if (fieldValue !== undefined) proto.fieldValue = fieldValue;
            if (extra) Amm.overrideRecursive(proto, extra);
            var res = new Amm.Element(proto);
            made.push(res);
            return res;
        };

        var form = mk(undefined, undefined, {traits: 'Amm.Trait.Form'});
        
        var f = {};
        
        f.a     = mk('a', undefined, {traits: 'Amm.Trait.Form', form: form});
        f.a0    = mk(undefined, undefined, {traits: 'Amm.Trait.Form', form: f.a});
        f.a0a   = mk('a0a', 'a0a', {form: f.a0});
        f.a0b   = mk('a0b', 'a0b', {form: f.a0});
        f.a1    = mk(undefined, undefined, {traits: 'Amm.Trait.Form', form: f.a});
        f.a2    = mk(undefined, undefined, {form: f.a, in__fieldApplied: 'this.fieldValue'});
        f.b     = mk('b', undefined, {traits: 'Amm.Trait.Form', form: form});
        f.ba    = mk('ba', 'ba', {form: f.b});
        f.bb    = mk('bb', 'bb', {form: f.b});
        f.bc    = mk('bc', undefined, {form: f.b, traits: 'Amm.Trait.Form'});
        f.bc0   = mk(undefined, 'bc0', {form: f.bc});
        f.bc1   = mk(undefined, 'bc1', {form: f.bc});
        f.bc2   = mk(undefined, 'bc2', {form: f.bc});
        f.c     = mk('c', 'c', {form: form});
        
        var origValue = form.getFieldValue();
        
        assert.deepEqual(origValue, {
            a: [
                {
                    a0a: 'a0a', 
                    a0b: 'a0b',
                },
                []
                // a2 isn't applied
            ],
            b: {
                ba: 'ba',
                bb: 'bb',
                bc: [
                    'bc0', 'bc1', 'bc2'
                ]
            },
            c: 'c'
        });
        
        var savedFormValue = Amm.overrideRecursive({}, origValue);
        
        assert.equal(form.getFieldValue('b', 'ba'), 'ba', 'getFieldValue(path, subPath) works');
        
        form.setFieldValue('ba_alt', 'b', 'ba');
            assert.equal(f.ba.getFieldValue(), 'ba_alt', 'setFieldValue(val, path, subPath) works');
            
        assert.equal(form.getFieldValue(['a', 0], 'a0a'), 'a0a', 'getFieldValue(array, subPath) works');
        
        form.setFieldValue('xx', ['a', 2]);
        
            assert.equal(f.a2.getFieldValue(), 'xx');

        form.setFieldValue({a: [{a0a: 'a0a_alt', a0b: 'a0b_alt'}]});
        
            assert.deepEqual(form.getFieldValue('a', 0), {a0a: 'a0a_alt', a0b: 'a0b_alt'});
            
        var newValue;
        
        form.subscribe('fieldValueChange', function(v) { newValue = v; });
        
        f.bc2.setFieldIndex(0);

            assert.ok(newValue !== undefined, 'setFieldIndex() triggered value change');
            assert.deepEqual(newValue.b.bc, ['bc2', 'bc0', 'bc1']);
        
        newValue = undefined;
        f.bc2.setFieldApplied(false);
        
        assert.ok(newValue !== undefined, 'setFieldApplied() triggered value change');
            assert.deepEqual(newValue.b.bc, ['bc0', 'bc1']);
            
        newValue = undefined;
        
        f.bc0.setFieldName('bc0name');
            assert.deepEqual(newValue.b.bc, {'bc0name': 'bc0', '0': 'bc1'}, 'SetFieldName() -> switched ## to assoc');
        
        newValue = undefined;
        
        f.bc0.setFieldName(null);
            assert.deepEqual(newValue.b.bc, ['bc0', 'bc1'], 'SetFieldName() -> switched assoc to ##');
        
        newValue = undefined;
        f.a0a.setFieldName('a0a_alt');
            assert.deepEqual(newValue.a[0], {a0a_alt: 'a0a_alt', a0b: 'a0b_alt'},
            'setFieldName() triggered value change');
            
        newValue = undefined;
        f.a0a.setFieldValue('a0a_alt1');
            assert.deepEqual(newValue.a[0], {a0a_alt: 'a0a_alt1', a0b: 'a0b_alt'},
            'setFieldValue() triggered value change');
            
        Amm.cleanup(made);
        
    });
    
    QUnit.test("Form.validate", function(assert) {
        
        var msg = "subErrors";
        
        var f = new Amm.Element({
            traits: ['Amm.Trait.Form'], 
            invalidFieldsMessage: msg
        });
        var a = new Amm.Element({id: 'a', traits: ['Amm.Trait.Field'], fieldRequired: true, form: f});
        var b = new Amm.Element({id: 'b', traits: ['Amm.Trait.Field'], fieldRequired: true, form: f});
        
        b.setFieldValue(10);
            assert.notOk(a.validate(), 'Form sub-field is invalid when value not provided and required is TRUE');
            assert.notOk(f.validate(), 'Form is invalid when sub-field is invalid');
            assert.deepEqual(f.getFieldErrors(), [msg], 'Form.getFieldErrors() return msg about error in sub-field');
            assert.equal(f.getNeedValidate(), false, 'Form.needValidate is FALSE after Form.validate()');

        a.setFieldApplied(false);
        
        assert.equal(f.getNeedValidate(), true, "form.`needValidate` is true after field.`needValidate` became true");
        
            assert.ok(f.validate(), 'form.validate() is TRUE after sub-field isn\'t applied');
            assert.deepEqual(f.getFieldErrors(), null, 'form doesn\'t have errors when it\'s valid');
            
        Amm.cleanup(f, a, b);
        
    });
    
    
}) ();
