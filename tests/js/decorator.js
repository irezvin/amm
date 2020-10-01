/* global Amm */
/* global QUnit */

(function() {
QUnit.module("Decorator");

    QUnit.test("Amm.Decorator.Data", function(assert) {

        var tests = {
            r1: {
                error: "Problem",
                problem: "Something is off"
            },

            r2: {
                response: {
                    type: "error",
                    content: "We have a problem"
                }
            },

            r3: {
                code: 404,
                content: "notFound"
            },

            r4: {
                error: {
                    email: "email is required",
                    age: "age must be > 18"
                }            
            },

            r5: {
                response: {
                    type: "success",
                    data: {
                        id: 10,
                        email: "test@example.com",
                        age: 14
                    }
                }
            }
            
        };
        
        var dataDecorator = new Amm.Decorator.Data({
           
            conditions: {
                
                type1: { problem: { and: [{not: null}, {not: undefined}] } },
                
                type2: "this.response.type == 'error'",
                
                type3: "this.code >= 400",
                
                type4: { error: { and: [{not: null}, {not: undefined}], 'typeof': 'object' } },
                
                type5: "this.response.type == 'success'"
                
            },
            
            actions: {
                
                type1: [
                    { src: 'problem', dest: 'error' },
                ],
                
                type2: [
                    { src: 'response[content]', dest: 'error' },
                ],
                
                type3: [
                    { src: 'code', dest: 'error[httpCode]' },
                    { src: 'content', dest: 'error[message]' },
                ],
                
                type4: [
                    { src: 'error', dest: 'error[data]' },
                ],
                
                type5: [
                    { src: 'response[data]', dest: 'data' },
                ],
                
                default: { def: { issue: 'noMatch' }, dest: null }
                
            }
            
        });
        
        var proper = {
            
            r1: { error: "Something is off" },
            r2: { error: "We have a problem" },
            r3: { error: { httpCode: 404, message: "notFound" } },
            r4: { error: { data: { email: "email is required", age: "age must be > 18" } } },
            r5: { data: { id: 10, email: "test@example.com", age: 14 } }
            
        };
        
        for (var i in tests) if (tests.hasOwnProperty(i)) {
            
            var r = dataDecorator.decorate(tests[i]);
            assert.deepEqual(r, proper[i]);
            
            
        }
        
    });
    
}) ();
