/* global Amm */

(function() {

    QUnit.module("Model and Prop");
    
    QUnit.test("Basic Prop", function(assert) {
       
        var e;
                
        e = new Amm.Element({traits: ['Amm.Trait.Prop'], 
            propValue: 10});
        
            assert.equal(e.getPropValue(), 10, "Prop returns value");

            assert.equal(e.getPropInSyncWithAnnotations(), false, "W/o Annotated trait, Prop not in sync with annotations");

            assert.equal(e.getPropSyncsValue(), false, "W/o `value` member, Prop not in sync with `value`");

            assert.equal(e.getNeedValidate(), false, "Initially we don't need to validate when there are no validators and prop not required");

            assert.equal(e.getPropErrors(), null, "Initially we don't have errors");
            
            assert.equal(e.validate(), true, "validate() returns TRUE on no errors");
            
        e.subscribe('onValidate', function(value, errors) {
            if (value === 10) errors.push("Value cannot be 10");
        });
            
            assert.equal(e.validate(), false, "onValidate works...");
            assert.deepEqual(e.getPropErrors(), ["Value cannot be 10"], "...and populates errors");
            
        e.setPropValue(11);
        
            assert.equal(e.validate(), true, "again valid");
            assert.deepEqual(e.getPropErrors(), null, "and no errors after successful validation");
            
        
        Amm.cleanup(e);
        
        e = new Amm.Element({
                traits: ['Amm.Trait.Prop'],
                propRequired: true, 
                propRequiredMessage: 'RQ',
                validateMode: Amm.Trait.Prop.VALIDATE_NEVER
            });
        
            assert.equal(e.getNeedValidate(), true, 'ModelProp.propRequired => !!getNeedValidate()');

            assert.equal(e.getPropEmpty(), true, 'ModelProp.propRequired w/o value => !!getPropEmpty()');

            assert.deepEqual(e.getPropErrors(), ['RQ'], 'Required prop w/o value => error');

            assert.equal(e.getNeedValidate(), false, 'ModelProp.getPropErrors() => !needValidate()');
            
        e.setPropValue(10);
        
            assert.equal(e.getNeedValidate(), true, 'ModelProp.setPropValue() + VALIDATE_NEVER => !getNeedValidate()');
        
            assert.equal(e.getPropEmpty(), false, 'Non-"empty" value => !!getPropEmpty()');
            
            assert.equal(e.validate(), true, 'Non-"empty" value => !!validate()');
            
            assert.equal(e.getPropErrors(), null, 'Non-"empty" value => getPropErrors() is null');
            
        e.setValidateMode(Amm.Trait.Prop.VALIDATE_CHANGE);
        e.setPropValue('z');
        
            assert.equal(e.getNeedValidate(), false, 'ModelProp.setPropValue() + VALIDATE_CHANGE => !!getNeedValidate()');
            
        e.setValidators([{
            class: 'Amm.Validator.Number',
            msgMustBeNumber: 'MustBeNumber'
        }]);
    
            assert.equal(e.getNeedValidate(), true, '.setValidators() => !!getNeedValidate()');
            assert.deepEqual(e.getPropErrors(), null, 'we still have old prop errors');
            assert.equal(e.validate(), false, 'validate() not passes because of new validators');
            assert.deepEqual(e.getPropErrors(), ['MustBeNumber'], '.getPropErrors() => msg from validator');
        
        Amm.cleanup(e);
            
        e = new Amm.Element({
            traits: ['Amm.Trait.Prop', 'Amm.Trait.Field'],
            propValue: 11
        });
        
            assert.equal(e.getPropSyncsValue(), true, "W/ `value` member, Prop is in sync with `value`");
            assert.equal(e.getValue(), 11, "Initially `value` is same as `propValue`");
        
        Amm.cleanup(e);
        
        e = new Amm.Element({
            traits: ['Amm.Trait.Prop', 'Amm.Trait.Field'],
            value: 11
        });
        
            assert.equal(e.getPropValue(), 11, "Reverse initial sync (value => propValue)");

        e.setValue('z');
        
            assert.equal(e.getPropValue(), 'z', "Set value => propValue changes");
        
            assert.equal(e.validate(), true, "Value is valid");
        
        Amm.cleanup(e);
        
    });
    
    QUnit.test('Amm.Trait.Prop + Translator', function(assert) {

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
            traits: ['Amm.Trait.Prop', 'Amm.Trait.Field'],
            propLabel: 'theProp',
            propTranslator: tr,
            value: 11
        });
            
            assert.equal(tr.field, 'theProp', '`propTranslator.field` is set from prop label');
            
            e.setPropLabel('theProp2');
            
            assert.equal(tr.field, 'theProp2', '`propTranslator.field` is updated from prop label');
            
            
        e.setValue('m');

            assert.equal(e.getPropValue(), 'xxmxx', 'setValue(): translator is applied');

        e.setPropValue('xxqqxx');

            assert.equal(e.getValue(), 'qq', 'setPropValue(): translator is applied');

        e.setPropValue('xxeeexx');

            assert.equal(e.getValue(), null, 'Out translation error state: `value ` is null');
            assert.equal(e.getTranslationErrorState(), Amm.Trait.Prop.TRANSLATION_ERROR_OUT, 'Out translation error state flag');
            assert.equal(e.validate(), false, '!validate() during translation error state');
            assert.equal(e.getTranslationErrorState(), Amm.Trait.Prop.TRANSLATION_ERROR_OUT, 'Out translation error state flag isn\' reset by validate()');
            assert.deepEqual(e.getPropErrors(), ['[out] xxeeexx is not allowed'], 'Out translation error state `propErrors`');
            assert.equal(e.getPropValue(), 'xxeeexx', 'Out translation error state: `propValue` preserved');

        e.setPropTranslator(null);

            assert.equal(e.getValue(), 'xxeeexx', 'Out translation error state: resume after translator changed');
            assert.equal(e.getTranslationErrorState(), 0, 'Out translation error state: reset after there\'s no translator or errors');

        e.setPropTranslator(tr);
        e.setPropValue('xxVVxx');

            assert.equal(e.getValue(), 'VV', 'Proper value mapping');
            assert.equal(e.getTranslationErrorState(), 0);
            assert.equal(e.getPropErrors(), null);

        e.setValue('eee');

            assert.equal(e.getPropValue(), null, 'In translation error state: `propertValue` is null');
            assert.equal(e.getTranslationErrorState(), Amm.Trait.Prop.TRANSLATION_ERROR_IN, 'In translation error state: proper flag value');
            assert.deepEqual(e.getPropErrors(), ['[in] eee is not allowed'], 'In translation error state: `propErrors` from translator');
            assert.equal(e.getValue(), 'eee', 'In translation error: `value` remains the same');

        e.setPropTranslator(null);

            assert.equal(e.getTranslationErrorState(), 0, 'In translation error state: reset flag after translator change/clear');
            assert.equal(e.getPropValue(), 'eee', 'In translation error state: `propValue` is updated from saved value after translator change/clear');
            
        Amm.cleanup(e);
            
    });
    
    QUnit.test('Amm.Trait.Prop + Annotated integration', function(assert) {
        
        var e;
        
        e = new Amm.Element({
           
            traits: ['Amm.Trait.Prop', 'Amm.Trait.Annotated'],
            
            label: 'TheLabel',
            
            error: ['XX', 'YY'],
            
            required: true            
            
        });
        
            assert.equal(e.getPropInSyncWithAnnotations(), true, '!!getPropInSyncWithAnnotations()');
            assert.equal(e.getPropLabel(), 'TheLabel', 'Initial sync: label');
            assert.equal(e.getPropRequired(), true, 'Initial sync: required');
            assert.deepEqual(e.getPropErrors(), ['XX', 'YY'], 'Initial sync: errors');
        
        e.setPropErrors(null);
        e.setPropRequired(false);
        e.setPropLabel('TheLabel2');
        
            assert.equal(e.getError(), null, 'Prop -> annotation sync: error');
            assert.equal(e.getRequired(), false, 'Prop -> annotation sync: required');
            assert.equal(e.getLabel(), 'TheLabel2', 'Prop -> annotation sync: label');
        
        e = new Amm.Element({traits: ['Amm.Trait.Prop', 'Amm.Trait.Annotated']});
        
            e.setRequired(true);
            e.setLabel('TheLabel');
            e.setError(['XX', 'YY']);
            
            assert.equal(e.getPropLabel(), 'TheLabel', 'Late sync: label');
            assert.equal(e.getPropRequired(), true, 'Late sync: required');
            assert.deepEqual(e.getPropErrors(), ['XX', 'YY'], 'Late sync: errors');
    });
    
    QUnit.test("Prop.validationExpressions", function(assert) {
       
        var age, experience;
        
        age = new Amm.Element({
            traits: ['Amm.Trait.Prop']
        });
        
        experience = new Amm.Element({
            traits: ['Amm.Trait.Prop'],
            properties: {
                age: age
            },
            validationExpressions: [
                "this.age.propValue && this.age.propValue * 1 < this.propValue*1 && 'Experience must be less than age'"
            ]
        });
        
        var err;
        
        experience.subscribe("propErrorsChange", function(e) { err = e; });
        
        age.setPropValue(10);
        
            assert.deepEqual(experience.getPropErrors(), null);
        
        experience.setPropValue(11);
        
            assert.deepEqual(err, ['Experience must be less than age']);
            
        age.setPropValue(12);
        
            assert.deepEqual(err, null);
            
    });
    
    
}) ();
