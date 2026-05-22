'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Image as ImageIcon, Link as LinkIcon, Heading2, Minus,
} from 'lucide-react'
import { useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ value, onChange, placeholder = '내용을 입력하세요', className }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'min-h-[200px] px-4 py-3 text-sm text-gray-800 leading-relaxed focus:outline-none',
      },
    },
  })

  const insertImage = useCallback((src: string) => {
    editor?.chain().focus().setImage({ src }).run()
  }, [editor])

  const handleImageFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      if (src) insertImage(src)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [insertImage])

  const setLink = useCallback(() => {
    const url = window.prompt('링크 URL을 입력하세요')
    if (url === null) return
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  if (!editor) return null

  const ToolBtn = ({ onClick, active, title, children }: {
    onClick: () => void, active?: boolean, title: string, children: React.ReactNode
  }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors',
        active
          ? 'bg-gray-200 text-gray-900'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      )}
    >
      {children}
    </button>
  )

  return (
    <div className={cn('border rounded-lg overflow-hidden bg-white', className)}>
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-gray-50">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="굵게">
          <Bold className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="기울임">
          <Italic className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="밑줄">
          <UnderlineIcon className="w-4 h-4" />
        </ToolBtn>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="제목">
          <Heading2 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="글머리 목록">
          <List className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="번호 목록">
          <ListOrdered className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="구분선">
          <Minus className="w-4 h-4" />
        </ToolBtn>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <ToolBtn onClick={setLink} active={editor.isActive('link')} title="링크">
          <LinkIcon className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => fileInputRef.current?.click()} active={false} title="이미지 삽입">
          <ImageIcon className="w-4 h-4" />
        </ToolBtn>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      </div>

      {/* 본문 에디터 */}
      <EditorContent editor={editor} />
    </div>
  )
}

/** 게시물 본문 HTML 렌더링 (XSS 방지 필요 시 sanitize 적용) */
export function RichTextContent({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn('prose prose-sm max-w-none text-gray-800', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
