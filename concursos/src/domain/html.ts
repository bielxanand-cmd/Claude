/** Mini-parser do HTML gerado pelo editor de resumos (simples e bem formado). */

export interface HtmlNode {
  tag: string
  children: (HtmlNode | string)[]
}

const VOID = new Set(['br', 'hr', 'img', 'input'])

function decode(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

export function parseHtml(html: string): HtmlNode {
  const root: HtmlNode = { tag: 'root', children: [] }
  const stack = [root]
  for (const m of html.matchAll(/<(\/?)([a-zA-Z0-9]+)[^>]*?(\/?)>|([^<]+)/g)) {
    const [, closing, rawTag, selfClosing, text] = m
    const top = stack[stack.length - 1]
    if (text !== undefined) {
      top.children.push(decode(text))
      continue
    }
    const tag = rawTag.toLowerCase()
    if (closing) {
      const index = stack.map((n) => n.tag).lastIndexOf(tag)
      if (index > 0) stack.length = index
    } else if (tag === 'br') {
      top.children.push(' ')
    } else if (!VOID.has(tag) && !selfClosing) {
      const node: HtmlNode = { tag, children: [] }
      top.children.push(node)
      stack.push(node)
    }
  }
  return root
}

/** Texto de um nó, ignorando listas aninhadas. */
export function textOf(node: HtmlNode | string, skipLists = true): string {
  if (typeof node === 'string') return node
  if (skipLists && (node.tag === 'ul' || node.tag === 'ol')) return ''
  const blocky = ['p', 'div', 'li', 'h2', 'h3', 'blockquote']
  return node.children.map((c) => textOf(c, skipLists) + (typeof c !== 'string' && blocky.includes(c.tag) ? ' ' : '')).join('')
}
