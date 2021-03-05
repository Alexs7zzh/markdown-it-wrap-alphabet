const Token = require('markdown-it/lib/token')

const chinesePunc = '《》「」『』（）”“、。，？！；：'

const isEn = token =>
  token && token.type === 'text' && token.meta && token.meta.isEn

const isCJK = token =>
  token && token.type === 'text' && token.meta && !token.meta.isEn

const en_open = (before = false, after = false) => {
  let open = new Token('en_open', 'span', 1)
  open.meta = {
    before: before,
    after: after,
  }
  return open
}
const en_close = () => new Token('en_close', 'span', -1)

const getEnglish = text => {
  return [...text.matchAll(/([\w,.;'"’‘”“ ()\-–—…+!?&/<>*[\]:@#=]+)/g)].filter(m => /[a-zA-Z]/.test(m[0]))
}

const hasEnglish = text => {
  const matches = getEnglish(text)
  return /\p{Unified_Ideograph}/u.test(text) && matches.length !== 0
}

const fragmentize = text => {
  const matches = getEnglish(text)
  let result = []
  if (matches.length === 0) {
    result.push({
      text: text,
      isEn: false,
    })
    return result
  }
  if (matches[0].index !== 0) 
    result.push({
      text: text.slice(0, matches[0].index),
      isEn: false,
    })
  
  matches.forEach((m, index) => {
    result.push({
      text: m[0],
      isEn: true,
    })
    if (index + 1 < matches.length) 
      result.push({
        text: text.slice(m.index + m[0].length, matches[index + 1].index),
        isEn: false,
      })
    else if (m.index + m[0].length != text.length) 
      result.push({
        text: text.slice(m.index + m[0].length),
        isEn: false,
      })
    
  })
  return result
}

const arrayReplaceAt = (src, pos, newElements) => {
  return [].concat(src.slice(0, pos), newElements, src.slice(pos + 1))
}

const arrayReplaceRange = (src, posStart, posEnd, newElements) => {
  return [].concat(src.slice(0, posStart), newElements, src.slice(posEnd))
}

// const printTokens = tokens => {
//   tokens.forEach((t, index) => {
//     console.log(index, t.type, t.content)
//   })
// }

const tokenize = state => {
  for (let idx = state.tokens.length - 1; idx >= 0; idx--) {
    if (state.tokens[idx].type !== 'inline') continue

    if (!hasEnglish(state.tokens[idx].content)) continue

    let inlineTokens = state.tokens[idx].children
    
    // break text into English and CJK
    for (let i = inlineTokens.length - 1; i >= 0; i--) {
      if (inlineTokens[i].type !== 'text') continue
      if (!inlineTokens[i].content || inlineTokens[i].content === '') continue
      let fragments = fragmentize(inlineTokens[i].content)
      fragments = fragments.map(f => {
        let tmp = new Token('text', '', 0)
        tmp.content = f.text
        tmp.meta = { isEn: f.isEn }
        return tmp
      })
      state.tokens[idx].children = inlineTokens = arrayReplaceAt(inlineTokens, i, fragments)
    }

    if (inlineTokens.length === 0) continue

    let nesting = 0, lastPos = -1
    const terminators = ['en_close', 'footnote_ref', 'hardbreak']

    for (let i = 0; i < inlineTokens.length; i++) {
      nesting += inlineTokens[i].nesting
      if (isCJK(inlineTokens[i])) lastPos = i

      // only stop at English text
      if (!isEn(inlineTokens[i])) continue

      // expand as mush as possible, does not include right
      let left = i, right = i, leftNesting = nesting, rightNesting = nesting, tagsToClose = []
      while (left >= 0 && !terminators.includes(inlineTokens[left].type) && !isCJK(inlineTokens[left]) && inlineTokens[right].nesting !== -1) {
        if (inlineTokens[left].nesting === 1) tagsToClose.push(inlineTokens[left].type.replace('_open', ''))
        leftNesting -= inlineTokens[left--].nesting
      }
      while (right < inlineTokens.length && !terminators.includes(inlineTokens[right].type) && !isCJK(inlineTokens[right])) {
        if (inlineTokens[right].nesting === 1) tagsToClose.push(inlineTokens[right].type.replace('_open', ''))
        if (inlineTokens[right].nesting === -1) 
          if (tagsToClose.includes(inlineTokens[right].type.replace('_close', ''))) {
            const index = tagsToClose.indexOf(inlineTokens[right].type.replace('_close', ''))
            tagsToClose.splice(index, 1)
          } else 
            break
        
        rightNesting += inlineTokens[right++].nesting
      }
      left++

      // adjust left or right pointers
      if (leftNesting !== rightNesting) 
        if (Math.abs(leftNesting - nesting) > Math.abs(rightNesting - nesting)) 
          while (leftNesting !== rightNesting && left < inlineTokens.length) leftNesting += inlineTokens[left++].nesting
        else {
          if (right === inlineTokens.length) right--
          while (!(leftNesting === rightNesting && tagsToClose.length === 0) && right >= 0) {
            rightNesting -= inlineTokens[right].nesting
            if (inlineTokens[right].nesting === 1) {
              const index = tagsToClose.indexOf(inlineTokens[right].type.replace('_open', ''))
              tagsToClose.splice(index, 1)
            }
            if (inlineTokens[right].nesting === -1) tagsToClose.push(inlineTokens[right].type.replace('_close', ''))
            right--
          }
          right++
        }
      
      
      let before = false, after = false, p
      // trim space and add classes
      if ((!inlineTokens[left - 1] || !terminators.includes(inlineTokens[left - 1].type)) && isCJK(inlineTokens[lastPos])) {
        // Trim start of current token array
        p = left
        while (p < right && inlineTokens[p] && inlineTokens[p].type !== 'text') p++
        if (inlineTokens[p]) inlineTokens[p].content = inlineTokens[p].content.trimStart()

        if (inlineTokens[lastPos]) {
          inlineTokens[lastPos].content = inlineTokens[lastPos].content.trimEnd()
          const content = inlineTokens[lastPos].content
          if(!chinesePunc.includes(content[content.length - 1])) before = true
        }
      }

      p = right
      while (p < inlineTokens.length && inlineTokens[p] && inlineTokens[p].type !== 'text') p++
      if (inlineTokens[p] && isCJK(inlineTokens[p])) {
        inlineTokens[p].content = inlineTokens[p].content.trimStart()
        const content = inlineTokens[p].content
        if(!chinesePunc.includes(content[0])) after = true

        p = right - 1
        while (p >= left && inlineTokens[p] && inlineTokens[p].type !== 'text') p--
        if (inlineTokens[p]) inlineTokens[p].content = inlineTokens[p].content.trimEnd()
      }

      // wrapping
      state.tokens[idx].children = inlineTokens = arrayReplaceRange(inlineTokens, left, right, [
        en_open(before, after),
        ...inlineTokens.slice(left, right),
        en_close()
      ])

      lastPos = i
      
      i = i + (right - left)
      if (i < inlineTokens.length) nesting = rightNesting

    }

  }
}

module.exports = (md, opts) => {
  const defaultOptions = {
    before: 'before',
    after: 'after',
    lang: ''
  }
  opts = Object.assign({}, defaultOptions, opts)

  const render_en_open = (tokens, idx) => {
    const meta = tokens[idx].meta
    let classes = []
    if (meta.before) classes.push(opts.before)
    if (meta.after)  classes.push(opts.after)
    return `<span ${opts.lang === '' ? '' : `lang='${opts.lang}' `}class='${classes.join(' ')}'>`
  }
  const render_en_close = () => '</span>'

  md.renderer.rules.en_open = render_en_open
  md.renderer.rules.en_close = render_en_close
  md.core.ruler.push('wrapEnglish', tokenize)
}