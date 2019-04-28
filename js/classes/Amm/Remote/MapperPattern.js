/* global Amm */

/**
 * @param {string} definition Path pattern definition
 * @returns {Amm.Remote.MapperPattern}
 * 
 * Definition is like
 * 
 * pathSegment/otherPathSegment/{argName}/etc/something-{argName2}/{freeArgName...}/paramContinues/{moreParams}/etc
 * 
 * {argName} is name of argument that is expected to have alphanumeric value
 * without slashes
 * 
 * {argNames} must be separated by some characters
 * (so you cannot have {argName}{argName2} together)
 * 
 * {tailArgName...} means path can have any string with slashes etc here - it is
 */
Amm.Remote.MapperPattern = function(definition) {

    if (typeof definition !== 'string' || !definition.length)
        throw Error ("`definition` must be non-empty string");

    this._parseDefinition(definition);
    
};

Amm.Remote.MapperPattern._parseRx = /([^{}]+)|(\{\w+(\.\.\.)?)|[{}]/g;

Amm.Remote.MapperPattern.prototype = {
    
    definition: null,
    
    regex: null,
    
    args: null,
    
    segments: null,
    
    _parseDefinition: function(definition) {
        this._definition = definition;
        var matches = definition.match(Amm.Remote.MapperPattern._parseRx);
        if (matches.join('') !== definition) {
            console.log(matches, definition);
            throw Error ("MapperPattern definition wasn't fully matched");
        }
        var currArg, isFree, pos = 0, len;
        this.regex = '';
        this.args = [];
        this.segments = [];
        while((curr = matches.shift()) !== undefined) {
            len = curr.length;
            if (curr[0] === '{') {
                if (currArg) {
                    throw Error("Error at position "
                            + pos + " of definition '" 
                            + definition 
                            + "': arguments must be always separated by non-argument string");
                }
                if (matches[0] === '}') {
                    matches.shift();
                    len++;
                }
                else {
                    throw Error("Unmatched '{' at position " + pos + "of definition '" + definition + "'");
                }
                currArg = curr.slice(1);
                if (currArg.slice(-3) === '...') {
                    isFree = true;
                    currArg = currArg.slice(1, -3);
                }
                this.args.push(currArg);
                if (isFree) this.regex += '(.+)';
                    else this.regex += '([-\\w]+)';
                this.segments.push([currArg]);
            } else {
                currArg = null;
                this.regex += Amm.Util.regexEscape(curr);
                this.segments.push(curr);
            }
            pos += len;
        }
        this.regex = '^' + this.regex + '$';
    },
    
    /**
     * Checks path against the definition.
     * If it matches, populates output object outArgs with argument values and returns TRUE.
     * Otherwise lives outArgs unchanged and returns FALSE.
     * 
     * @param {string} path
     * @param {object} outArgs
     * @returns {Boolean}
     */
    parse: function(path, outArgs) {
        if (!outArgs) outArgs = {};
        if (typeof this.regex === 'string') this.regex = new RegExp(this.regex);
        var r = this.regex.exec(path);
        if (!r) return false;
        for (var i = 0, l = this.args.length; i < l; i++) {
            outArgs[this.args[i]] = r[i + 1];
        }
        return true;
    },
    
    /**
     * If there's enough args in `args` parameter, produces the path, otherwise returns undefined
     * Doesn't check args for validity (only word characters should be in non-free args), only for their presence.
     * Empty args ('') doesn't count as ones.
     *
     * @param {object} args Hash with args
     * @param {boolean} removeBuilt Will delete `args` members 
     *                  that were incorporated to the result string
     */
    build: function(args, removeBuilt) {
        var i, l;
        for (i = 0, l = this.args.length; i < l; i++) {
            var v = args[this.args[i]];
            if (v === null || v === undefined || v === '' || ('' + v) === '') return; 
        }
        var res = '';
        for (i = 0, l = this.segments.length; i < l; i++) {
            if (this.segments[i] instanceof Array) {
                res += '' + args[this.segments[i][0]];
                if (removeBuilt) delete args[this.segments[i][0]];
            }
            else res += this.segments[i];
        }
        return res;
    }
    
};
