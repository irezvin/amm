/* global Amm */

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
            
    });
    
    
}) ();
