# markdown-it-wrap-alphabet

> Wrap alphabets between CJK for [markdown-it](https://github.com/markdown-it/markdown-it) markdown parser.

Markdown:
```
精神分析中的「享乐」这一概念常常使用法语的 *jouissance* 一词。
```
HTML:
```html
<p>精神分析中的「享乐」这一概念常常使用法语的<span class='before after'><em>jouissance</em></span>一词。</p>
```

Then you can add CSS in your website to add space between alphabets and CJK glyphs, for instance:
```css
.before::before {
  content: '\2006';
}
.after::after {
  content: '\2006';
}
```
(U+2006 refers to the white space that is one sixth of an em wide. For a detailed list of all white spaces avaible, see [Whitespace character - Wiki](https://en.wikipedia.org/wiki/Whitespace_character).)

_Note:_
1. This plugin will automatically remove the space between alphabets and CJK glyphs. 
2. Space won't be added between alphabets and punctuations. For example, `自由是一个 regulative ideal。` will be rendered as `<p>自由是一个<span class='before'>regulative ideal</span>。</p>`, omitting the `after` class.


## Install

Node.JS:

```bash
npm i markdown-it-wrap-english
```

## Use

```js
const md = require('markdown-it')()
const wrap = require('markdown-it-wrap-alphabet')

md.use(wrap)
```

## Configuration

You can pass an object to customize its output.
```js
const md = require('markdown-it')()
const wrap = require('markdown-it-wrap-alphabet')

md.use(wrap, {
  before: 'space-before', // default: 'before'
  after:  'space-after',  // default: 'after'
  lang:   'en'            // default: ''
                          // Add lang attribute to span
  wrapAll: true           // default: false
  shouldWrap: state => {  // default: always return true
    if (...) return true
    return false
  }
})
```

Generally speaking, you don't need to customize `wrapAll` and `shouldWrap` options. Here are their explanations:

`wrapAll`: By default, this plugin skips paragraphs without CJK glyphs. However, in the case that you use the language attribute to apply different styles (i.e., you set different font sizes depending on languages), you may want to wrap all alphabets even when there is no CJK glyphs in a certain paragraph.

`shouldWrap`: Normally this plugin leaves alone all paragraphs without CJK glyphs, not to mention a post without CJK glyphs at all. However, there is a possible edge case in which you have some CJK glyphs in a post written in, say, English. In that case, it is preferable to wrap manually that part of CJK glyphs instead of letting the plugin wrap all the English. Here is where the necessity of having a filter function to only implement this plugin to a certain set of posts comes in. 

The argument of `shouldWrap` is the `state` property of `parser_block`. (See `state`'s source code [here](https://github.com/markdown-it/markdown-it/blob/cbf639ab0fdd97b52202c3471ded2e2f0337a049/lib/rules_core/state_core.js)) That being said, what we need is more likely to depend on the environment `markdown-it` is utilized in. For instance, if you use [Eleventy](https://www.11ty.dev/) as your SSG (static site generator) and have `lang` attribute in the frontmatter of every posts, you can pass a function as follows to skip all posts that are marked as English.

```js
state => {
  const lang = state.env && state.env.lang
  if (lang !== undefined && lang === 'en') return false
  else return true
}
```

## License

[MIT](https://github.com/Alexs7zzh/markdown-it-wrap-english/blob/main/LICENSE)
