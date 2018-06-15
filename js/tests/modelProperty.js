/* global Amm */

(function() {

    QUnit.module("Model and Property");
    
    QUnit.test("Basic Property", function(assert) {
       
        var e;
                
        e = new Amm.Element({traits: ['Amm.Trait.Property'], 
            propertyValue: 10});
        
            assert.equal(e.getPropertyValue(), 10, "Property returns value");

            assert.equal(e.getPropertyInSyncWithAnnotations(), false, "W/o Annotated trait, Property not in sync with annotations");

            assert.equal(e.getPropertySyncsValue(), false, "W/o `value` member, Property not in sync with `value`");

            assert.equal(e.getNeedValidate(), false, "Initially we don't need to validate when there are no validators and property not required");

            assert.equal(e.getPropertyErrors(), null, "Initially we don't have errors");
            
            assert.equal(e.validate(), true, "validate() returns TRUE on no errors");
            
        e.subscribe('onValidate', function(value, errors) {
            if (value === 10) errors.push("Value cannot be 10");
        });
            
            assert.equal(e.validate(), false, "onValidate works...");
            assert.deepEqual(e.getPropertyErrors(), ["Value cannot be 10"], "...and populates errors");
            
        e.setPropertyValue(11);
        
            assert.equal(e.validate(), true, "again valid");
            assert.deepEqual(e.getPropertyErrors(), null, "and no errors after successful validation");
            
        
        Amm.cleanup(e);
        
        e = new Amm.Element({
                traits: ['Amm.Trait.Property'],
                propertyRequired: true, 
                propertyRequiredMessage: 'RQ',
                validateMode: Amm.Trait.Property.VALIDATE_NEVER
            });
        
            assert.equal(e.getNeedValidate(), true, 'ModelProperty.propertyRequired => !!getNeedValidate()');

            assert.equal(e.getPropertyEmpty(), true, 'ModelProperty.propertyRequired w/o value => !!getPropertyEmpty()');

            assert.deepEqual(e.getPropertyErrors(), ['RQ'], 'Required property w/o value => error');

            assert.equal(e.getNeedValidate(), false, 'ModelProperty.getPropertyErrors() => !needValidate()');
            
        e.setPropertyValue(10);
        
            assert.equal(e.getNeedValidate(), true, 'ModelProperty.setPropertyValue() + VALIDATE_NEVER => !getNeedValidate()');
        
            assert.equal(e.getPropertyEmpty(), false, 'Non-"empty" value => !!getPropertyEmpty()');
            
            assert.equal(e.validate(), true, 'Non-"empty" value => !!validate()');
            
            assert.equal(e.getPropertyErrors(), null, 'Non-"empty" value => getPropertyErrors() is null');
            
        e.setValidateMode(Amm.Trait.Property.VALIDATE_CHANGE);
        e.setPropertyValue('z');
        
            assert.equal(e.getNeedValidate(), false, 'ModelProperty.setPropertyValue() + VALIDATE_CHANGE => !!getNeedValidate()');
            
        e.setValidators([{
            class: 'Amm.Validator.Number',
            msgMustBeNumber: 'MustBeNumber'
        }]);
    
            assert.equal(e.getNeedValidate(), true, '.setValidators() => !!getNeedValidate()');
            assert.deepEqual(e.getPropertyErrors(), null, 'we still have old property errors');
            assert.equal(e.validate(), false, 'validate() not passes because of new validators');
            assert.deepEqual(e.getPropertyErrors(), ['MustBeNumber'], '.getPropertyErrors() => msg from validator');
        
        Amm.cleanup(e);
            
        e = new Amm.Element({
            traits: ['Amm.Trait.Property', 'Amm.Trait.Field'],
            propertyValue: 11
        });
        
            assert.equal(e.getPropertySyncsValue(), true, "W/ `value` member, Property is in sync with `value`");
            assert.equal(e.getValue(), 11, "Initially `value` is same as `propertyValue`");
        
        Amm.cleanup(e);
        
        e = new Amm.Element({
            traits: ['Amm.Trait.Property', 'Amm.Trait.Field'],
            value: 11
        });
        
            assert.equal(e.getPropertyValue(), 11, "Reverse initial sync (value => propertyValue)");

        e.setValue('z');
        
            assert.equal(e.getPropertyValue(), 'z', "Set value => propertyValue changes");
        
            assert.equal(e.validate(), true, "Value is valid");
        
        Amm.cleanup(e);
        
    });
    
    QUnit.test('Amm.Trait.Property + Translator', function(assert) {

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
            traits: ['Amm.Trait.Property', 'Amm.Trait.Field'],
            propertyLabel: 'theProp',
            propertyTranslator: tr,
            value: 11
        });
            
            assert.equal(tr.field, 'theProp', '`propertyTranslator.field` is set from property label');
            
            e.setPropertyLabel('theProp2');
            
            assert.equal(tr.field, 'theProp2', '`propertyTranslator.field` is updated from property label');
            
            
        e.setValue('m');

            assert.equal(e.getPropertyValue(), 'xxmxx', 'setValue(): translator is applied');

        e.setPropertyValue('xxqqxx');

            assert.equal(e.getValue(), 'qq', 'setPropertyValue(): translator is applied');

        e.setPropertyValue('xxeeexx');

            assert.equal(e.getValue(), null, 'Out translation error state: `value ` is null');
            assert.equal(e.getTranslationErrorState(), Amm.Trait.Property.TRANSLATION_ERROR_OUT, 'Out translation error state flag');
            assert.equal(e.validate(), false, '!validate() during translation error state');
            assert.equal(e.getTranslationErrorState(), Amm.Trait.Property.TRANSLATION_ERROR_OUT, 'Out translation error state flag isn\' reset by validate()');
            assert.deepEqual(e.getPropertyErrors(), ['[out] xxeeexx is not allowed'], 'Out translation error state `propertyErrors`');
            assert.equal(e.getPropertyValue(), 'xxeeexx', 'Out translation error state: `propertyValue` preserved');

        e.setPropertyTranslator(null);

            assert.equal(e.getValue(), 'xxeeexx', 'Out translation error state: resume after translator changed');
            assert.equal(e.getTranslationErrorState(), 0, 'Out translation error state: reset after there\'s no translator or errors');

        e.setPropertyTranslator(tr);
        e.setPropertyValue('xxVVxx');

            assert.equal(e.getValue(), 'VV', 'Proper value mapping');
            assert.equal(e.getTranslationErrorState(), 0);
            assert.equal(e.getPropertyErrors(), null);

        e.setValue('eee');

            assert.equal(e.getPropertyValue(), null, 'In translation error state: `propertValue` is null');
            assert.equal(e.getTranslationErrorState(), Amm.Trait.Property.TRANSLATION_ERROR_IN, 'In translation error state: proper flag value');
            assert.deepEqual(e.getPropertyErrors(), ['[in] eee is not allowed'], 'In translation error state: `propertyErrors` from translator');
            assert.equal(e.getValue(), 'eee', 'In translation error: `value` remains the same');

        e.setPropertyTranslator(null);

            assert.equal(e.getTranslationErrorState(), 0, 'In translation error state: reset flag after translator change/clear');
            assert.equal(e.getPropertyValue(), 'eee', 'In translation error state: `propertyValue` is updated from saved value after translator change/clear');
            
        Amm.cleanup(e);
            
    });
    
    QUnit.test('Amm.Trait.Property + Annotated integration', function(assert) {
        
        var e;
        
        e = new Amm.Element({
           
            traits: ['Amm.Trait.Property', 'Amm.Trait.Annotated'],
            
            label: 'TheLabel',
            
            error: ['XX', 'YY'],
            
            required: true            
            
        });
        
            assert.equal(e.getPropertyInSyncWithAnnotations(), true, '!!getPropertyInSyncWithAnnotations()');
            assert.equal(e.getPropertyLabel(), 'TheLabel', 'Initial sync: label');
            assert.equal(e.getPropertyRequired(), true, 'Initial sync: required');
            assert.deepEqual(e.getPropertyErrors(), ['XX', 'YY'], 'Initial sync: errors');
        
        e.setPropertyErrors(null);
        e.setPropertyRequired(false);
        e.setPropertyLabel('TheLabel2');
        
            assert.equal(e.getError(), null, 'Property -> annotation sync: error');
            assert.equal(e.getRequired(), false, 'Property -> annotation sync: required');
            assert.equal(e.getLabel(), 'TheLabel2', 'Property -> annotation sync: label');
        
        e = new Amm.Element({traits: ['Amm.Trait.Property', 'Amm.Trait.Annotated']});
        
            e.setRequired(true);
            e.setLabel('TheLabel');
            e.setError(['XX', 'YY']);
            
            assert.equal(e.getPropertyLabel(), 'TheLabel', 'Late sync: label');
            assert.equal(e.getPropertyRequired(), true, 'Late sync: required');
            assert.deepEqual(e.getPropertyErrors(), ['XX', 'YY'], 'Late sync: errors');
    });
    
    QUnit.test("Property.validationExpressions", function(assert) {
       
        var age, experience;
        
        age = new Amm.Element({
            traits: ['Amm.Trait.Property']
        });
        
        experience = new Amm.Element({
            traits: ['Amm.Trait.Property'],
            properties: {
                age: age
            },
            validationExpressions: [
                "this.age.propertyValue && this.age.propertyValue * 1 < this.propertyValue*1 && 'Experience must be less than age'"
            ]
        });
        
        var err;
        
        experience.subscribe("propertyErrorsChange", function(e) { err = e; });
        
        age.setPropertyValue(10);
        
            assert.deepEqual(experience.getPropertyErrors(), null);
        
        experience.setPropertyValue(11);
        
            assert.deepEqual(err, ['Experience must be less than age']);
            
        age.setPropertyValue(12);
        
            assert.deepEqual(err, null);
            
    });
    
    
}) ();
