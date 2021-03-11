
/*! markdown-it-wrap-alphabet 1.2.1 https://github.com/Alexs7zzh/markdown-it-wrap-alphabet @license MIT */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.markdownitIns = factory());
}(this, (function () { 'use strict';

  // Token class


  /**
   * class Token
   **/

  /**
   * new Token(type, tag, nesting)
   *
   * Create new token and fill passed properties.
   **/
  function Token(type, tag, nesting) {
    /**
     * Token#type -> String
     *
     * Type of the token (string, e.g. "paragraph_open")
     **/
    this.type     = type;

    /**
     * Token#tag -> String
     *
     * html tag name, e.g. "p"
     **/
    this.tag      = tag;

    /**
     * Token#attrs -> Array
     *
     * Html attributes. Format: `[ [ name1, value1 ], [ name2, value2 ] ]`
     **/
    this.attrs    = null;

    /**
     * Token#map -> Array
     *
     * Source map info. Format: `[ line_begin, line_end ]`
     **/
    this.map      = null;

    /**
     * Token#nesting -> Number
     *
     * Level change (number in {-1, 0, 1} set), where:
     *
     * -  `1` means the tag is opening
     * -  `0` means the tag is self-closing
     * - `-1` means the tag is closing
     **/
    this.nesting  = nesting;

    /**
     * Token#level -> Number
     *
     * nesting level, the same as `state.level`
     **/
    this.level    = 0;

    /**
     * Token#children -> Array
     *
     * An array of child nodes (inline and img tokens)
     **/
    this.children = null;

    /**
     * Token#content -> String
     *
     * In a case of self-closing tag (code, html, fence, etc.),
     * it has contents of this tag.
     **/
    this.content  = '';

    /**
     * Token#markup -> String
     *
     * '*' or '_' for emphasis, fence string for fence, etc.
     **/
    this.markup   = '';

    /**
     * Token#info -> String
     *
     * fence infostring
     **/
    this.info     = '';

    /**
     * Token#meta -> Object
     *
     * A place for plugins to store an arbitrary data
     **/
    this.meta     = null;

    /**
     * Token#block -> Boolean
     *
     * True for block-level tokens, false for inline tokens.
     * Used in renderer to calculate line breaks
     **/
    this.block    = false;

    /**
     * Token#hidden -> Boolean
     *
     * If it's true, ignore this element when rendering. Used for tight lists
     * to hide paragraphs.
     **/
    this.hidden   = false;
  }


  /**
   * Token.attrIndex(name) -> Number
   *
   * Search attribute index by name.
   **/
  Token.prototype.attrIndex = function attrIndex(name) {
    var attrs, i, len;

    if (!this.attrs) { return -1; }

    attrs = this.attrs;

    for (i = 0, len = attrs.length; i < len; i++) {
      if (attrs[i][0] === name) { return i; }
    }
    return -1;
  };


  /**
   * Token.attrPush(attrData)
   *
   * Add `[ name, value ]` attribute to list. Init attrs if necessary
   **/
  Token.prototype.attrPush = function attrPush(attrData) {
    if (this.attrs) {
      this.attrs.push(attrData);
    } else {
      this.attrs = [ attrData ];
    }
  };


  /**
   * Token.attrSet(name, value)
   *
   * Set `name` attribute to `value`. Override old value if exists.
   **/
  Token.prototype.attrSet = function attrSet(name, value) {
    var idx = this.attrIndex(name),
        attrData = [ name, value ];

    if (idx < 0) {
      this.attrPush(attrData);
    } else {
      this.attrs[idx] = attrData;
    }
  };


  /**
   * Token.attrGet(name)
   *
   * Get the value of attribute `name`, or null if it does not exist.
   **/
  Token.prototype.attrGet = function attrGet(name) {
    var idx = this.attrIndex(name), value = null;
    if (idx >= 0) {
      value = this.attrs[idx][1];
    }
    return value;
  };


  /**
   * Token.attrJoin(name, value)
   *
   * Join value to existing attribute via space. Or create new attribute if not
   * exists. Useful to operate with token classes.
   **/
  Token.prototype.attrJoin = function attrJoin(name, value) {
    var idx = this.attrIndex(name);

    if (idx < 0) {
      this.attrPush([ name, value ]);
    } else {
      this.attrs[idx][1] = this.attrs[idx][1] + ' ' + value;
    }
  };


  var token = Token;

  const chinesePunc = '《》「」『』（）”“、。，？！；：';

  const isEn = token =>
    token && token.type === 'text' && token.meta && token.meta.isEn;

  const isCJK = token =>
    token && token.type === 'text' && token.meta && !token.meta.isEn;

  const getEnglish = text => {
    return [...text.matchAll(/([\w,.;'"’‘”“ ()\-–—…+!?&/<>*[\]:@#=]+)/g)].filter(m => /[a-zA-Z]/.test(m[0]))
  };

  const hasEnglish = text => {
    const matches = getEnglish(text);
    return matches.length !== 0
  };

  const hasCJK = text => /\p{Unified_Ideograph}/u.test(text);

  const fragmentize = text => {
    const matches = getEnglish(text);
    let result = [];
    if (matches.length === 0) {
      result.push({
        text: text,
        isEn: false,
      });
      return result
    }
    if (matches[0].index !== 0) 
      result.push({
        text: text.slice(0, matches[0].index),
        isEn: false,
      });
    
    matches.forEach((m, index) => {
      result.push({
        text: m[0],
        isEn: true,
      });
      if (index + 1 < matches.length) 
        result.push({
          text: text.slice(m.index + m[0].length, matches[index + 1].index),
          isEn: false,
        });
      else if (m.index + m[0].length != text.length) 
        result.push({
          text: text.slice(m.index + m[0].length),
          isEn: false,
        });
      
    });
    return result
  };

  const arrayReplaceAt = (src, pos, newElements) => {
    return [].concat(src.slice(0, pos), newElements, src.slice(pos + 1))
  };

  const arrayReplaceRange = (src, posStart, posEnd, newElements) => {
    return [].concat(src.slice(0, posStart), newElements, src.slice(posEnd))
  };

  // const printTokens = tokens => {
  //   tokens.forEach((t, index) => {
  //     console.log(index, t.type, t.content)
  //   })
  // }

  var markdownItWrapEnglish = (md, opts) => {
    const defaultOptions = {
      before: 'before',
      after: 'after',
      lang: '',
      wrapAll: false
    };
    opts = Object.assign({}, defaultOptions, opts);

    const en_open = (before = false, after = false) => {
      let open = new token('en_open', 'span', 1);
      if (before) open.attrJoin('class', opts.before);
      if (after)  open.attrJoin('class', opts.after);
      if (opts.lang !== '') open.attrPush(['lang', opts.lang]);
      return open
    };
    const en_close = () => new token('en_close', 'span', -1);

    const tokenize = state => {
      if (!hasCJK(state.src)) return false
      for (let idx = state.tokens.length - 1; idx >= 0; idx--) {
        if (state.tokens[idx].type !== 'inline') continue

        if (!hasEnglish(state.tokens[idx].content)) continue
        if (!opts.wrapAll && !hasCJK(state.tokens[idx].content)) continue

        let inlineTokens = state.tokens[idx].children;
        
        // break text into English and CJK
        for (let i = inlineTokens.length - 1; i >= 0; i--) {
          if (inlineTokens[i].type !== 'text') continue
          if (!inlineTokens[i].content || inlineTokens[i].content === '') continue
          let fragments = fragmentize(inlineTokens[i].content);
          fragments = fragments.map(f => {
            let tmp = new token('text', '', 0);
            tmp.content = f.text;
            tmp.meta = { isEn: f.isEn };
            return tmp
          });
          state.tokens[idx].children = inlineTokens = arrayReplaceAt(inlineTokens, i, fragments);
        }

        if (inlineTokens.length === 0) continue

        let nesting = 0, lastPos = -1;
        const terminators = ['en_close', 'footnote_ref', 'hardbreak'];

        for (let i = 0; i < inlineTokens.length; i++) {
          nesting += inlineTokens[i].nesting;
          if (isCJK(inlineTokens[i])) lastPos = i;

          // only stop at English text
          if (!isEn(inlineTokens[i])) continue

          // expand as mush as possible, does not include right
          let left = i, right = i, leftNesting = nesting, rightNesting = nesting, tagsToClose = [];
          while (left >= 0 && !terminators.includes(inlineTokens[left].type) && !isCJK(inlineTokens[left]) && inlineTokens[right].nesting !== -1) {
            if (inlineTokens[left].nesting === 1) tagsToClose.push(inlineTokens[left].type.replace('_open', ''));
            leftNesting -= inlineTokens[left--].nesting;
          }
          while (right < inlineTokens.length && !terminators.includes(inlineTokens[right].type) && !isCJK(inlineTokens[right])) {
            if (inlineTokens[right].nesting === 1) tagsToClose.push(inlineTokens[right].type.replace('_open', ''));
            if (inlineTokens[right].nesting === -1) 
              if (tagsToClose.includes(inlineTokens[right].type.replace('_close', ''))) {
                const index = tagsToClose.indexOf(inlineTokens[right].type.replace('_close', ''));
                tagsToClose.splice(index, 1);
              } else 
                break
            
            rightNesting += inlineTokens[right++].nesting;
          }
          left++;

          // adjust left or right pointers
          if (leftNesting !== rightNesting) 
            if (Math.abs(leftNesting - nesting) > Math.abs(rightNesting - nesting)) 
              while (leftNesting !== rightNesting && left < inlineTokens.length) leftNesting += inlineTokens[left++].nesting;
            else {
              if (right === inlineTokens.length) right--;
              while (!(leftNesting === rightNesting && tagsToClose.length === 0) && right >= 0) {
                rightNesting -= inlineTokens[right].nesting;
                if (inlineTokens[right].nesting === 1) {
                  const index = tagsToClose.indexOf(inlineTokens[right].type.replace('_open', ''));
                  tagsToClose.splice(index, 1);
                }
                if (inlineTokens[right].nesting === -1) tagsToClose.push(inlineTokens[right].type.replace('_close', ''));
                right--;
              }
              right++;
            }
          
          
          let before = false, after = false, p;
          // trim space and add classes
          if ((!inlineTokens[left - 1] || !terminators.includes(inlineTokens[left - 1].type)) && isCJK(inlineTokens[lastPos])) {
            // Trim start of current token array
            p = left;
            while (p < right && inlineTokens[p] && inlineTokens[p].type !== 'text') p++;
            if (inlineTokens[p]) inlineTokens[p].content = inlineTokens[p].content.trimStart();

            if (inlineTokens[lastPos]) {
              inlineTokens[lastPos].content = inlineTokens[lastPos].content.trimEnd();
              const content = inlineTokens[lastPos].content;
              if(!chinesePunc.includes(content[content.length - 1])) before = true;
            }
          }

          p = right;
          while (p < inlineTokens.length && inlineTokens[p] && inlineTokens[p].type !== 'text') p++;
          if (inlineTokens[p] && isCJK(inlineTokens[p])) {
            inlineTokens[p].content = inlineTokens[p].content.trimStart();
            const content = inlineTokens[p].content;
            if(!chinesePunc.includes(content[0])) after = true;

            p = right - 1;
            while (p >= left && inlineTokens[p] && inlineTokens[p].type !== 'text') p--;
            if (inlineTokens[p]) inlineTokens[p].content = inlineTokens[p].content.trimEnd();
          }

          // wrapping
          state.tokens[idx].children = inlineTokens = arrayReplaceRange(inlineTokens, left, right, [
            en_open(before, after),
            ...inlineTokens.slice(left, right),
            en_close()
          ]);

          lastPos = i;
          
          i = i + (right - left);
          if (i < inlineTokens.length) nesting = rightNesting;

        }

      }
    };

    md.core.ruler.push('wrapEnglish', tokenize);
  };

  return markdownItWrapEnglish;

})));
