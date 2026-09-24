import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Redo2,
  Underline,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface RichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  ariaLabel: string
  minHeight?: number
  className?: string
}

const EMPTY = '<p></p>'
export const isEmptyHtml = (html: string) => !html || html === EMPTY || html.replace(/<[^>]+>/g, '').trim() === ''

export function RichEditor({ value, onChange, placeholder, ariaLabel, minHeight = 140, className }: RichEditorProps) {
  const onChangeRef = useRef(onChange)
  useLayoutEffect(() => {
    onChangeRef.current = onChange
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
        codeBlock: false,
      }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: placeholder ?? 'Comece a escrever…' }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'rich-content px-4 py-3 sm:px-5',
        'aria-label': ariaLabel,
        'aria-multiline': 'true',
        role: 'textbox',
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => onChangeRef.current(editor.isEmpty ? '' : editor.getHTML()),
  })

  // Sincroniza quando o valor muda externamente (ex.: resumo carregado).
  useEffect(() => {
    if (!editor || editor.isFocused) return
    const current = editor.isEmpty ? '' : editor.getHTML()
    if ((value || '') !== current) editor.commands.setContent(value || '', { emitUpdate: false })
  }, [editor, value])

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-surface transition focus-within:border-primary focus-within:ring-4 focus-within:ring-ring/20',
        className,
      )}
    >
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [url, setUrl] = useState('')

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      task: e.isActive('taskList'),
      quote: e.isActive('blockquote'),
      highlight: e.isActive('highlight'),
      link: e.isActive('link'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })

  const chain = () => editor.chain().focus()
  const groups: { icon: LucideIcon; label: string; active?: boolean; disabled?: boolean; run: () => void }[][] = [
    [
      { icon: Bold, label: 'Negrito (Ctrl+B)', active: state.bold, run: () => chain().toggleBold().run() },
      { icon: Italic, label: 'Itálico (Ctrl+I)', active: state.italic, run: () => chain().toggleItalic().run() },
      { icon: Underline, label: 'Sublinhado (Ctrl+U)', active: state.underline, run: () => chain().toggleUnderline().run() },
      { icon: Highlighter, label: 'Destacar', active: state.highlight, run: () => chain().toggleHighlight().run() },
    ],
    [
      { icon: Heading2, label: 'Título', active: state.h2, run: () => chain().toggleHeading({ level: 2 }).run() },
      { icon: Heading3, label: 'Subtítulo', active: state.h3, run: () => chain().toggleHeading({ level: 3 }).run() },
    ],
    [
      { icon: List, label: 'Lista', active: state.bullet, run: () => chain().toggleBulletList().run() },
      { icon: ListOrdered, label: 'Lista numerada', active: state.ordered, run: () => chain().toggleOrderedList().run() },
      { icon: ListChecks, label: 'Checklist', active: state.task, run: () => chain().toggleTaskList().run() },
      { icon: Quote, label: 'Citação', active: state.quote, run: () => chain().toggleBlockquote().run() },
      {
        icon: Link2,
        label: 'Link',
        active: state.link,
        run: () => {
          if (state.link) return chain().unsetLink().run()
          setUrl(editor.getAttributes('link').href ?? '')
          setLinkOpen((o) => !o)
        },
      },
    ],
    [
      { icon: Undo2, label: 'Desfazer', disabled: !state.canUndo, run: () => chain().undo().run() },
      { icon: Redo2, label: 'Refazer', disabled: !state.canRedo, run: () => chain().redo().run() },
    ],
  ]

  const applyLink = (e: React.FormEvent) => {
    e.preventDefault()
    const href = url.trim()
    if (href) chain().extendMarkRange('link').setLink({ href: /^https?:\/\//.test(href) ? href : `https://${href}` }).run()
    setLinkOpen(false)
    setUrl('')
  }

  return (
    <div className="border-b border-border bg-surface-2/60">
      <div role="toolbar" aria-label="Formatação" className="flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 [scrollbar-width:none]">
        {groups.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && <span className="mx-1 h-5 w-px bg-border" aria-hidden />}
            {group.map(({ icon: Icon, label, active, disabled, run }) => (
              <button
                key={label}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={active}
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={run}
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-30',
                  active && 'bg-primary-tint text-primary hover:bg-primary-tint hover:text-primary dark:text-primary-soft',
                )}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        ))}
      </div>
      {linkOpen && (
        <form onSubmit={applyLink} className="flex gap-2 border-t border-border px-3 py-2">
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Cole o endereço do link…"
            aria-label="Endereço do link"
            className="h-8 flex-1 rounded-lg border border-border bg-surface px-2.5 text-sm outline-none focus:border-primary"
            onKeyDown={(e) => e.key === 'Escape' && setLinkOpen(false)}
          />
          <button type="submit" className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-white">
            Aplicar
          </button>
        </form>
      )}
    </div>
  )
}
