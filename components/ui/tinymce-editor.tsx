"use client"

import { Editor } from "@tinymce/tinymce-react"
import { Label } from "@/components/ui/label"

interface TinyMCEEditorProps {
  id: string
  name: string
  label?: string
  value: string
  onChange: (value: string) => void
  height?: number
  required?: boolean
  placeholder?: string
}

export function TinyMCEEditor({
  id,
  name,
  label,
  value,
  onChange,
  height = 300,
  required,
  placeholder,
}: TinyMCEEditorProps) {
  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Editor
        id={id}
        apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
        value={value}
        init={{
          height,
          menubar: false,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'charmap', 'preview',
            'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
          ],
          toolbar: 'undo redo | blocks | ' +
            'bold italic forecolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | help',
          content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif; font-size: 14px }',
          placeholder: placeholder,
          branding: false,
          elementpath: false,
          statusbar: false,
          entity_encoding: 'raw',
          forced_root_block: 'p',
          remove_linebreaks: false,
          paste_as_text: true,
          valid_elements: 'p[style],br,strong/b,em/i,ul,ol,li,a[href],h1,h2,h3,h4,h5,h6,blockquote,code,pre',
          valid_styles: {
            '*': 'font-size,font-family,color,text-decoration,text-align'
          },
          formats: {
            p: { block: 'p', remove: 'all' }
          }
        }}
        onEditorChange={onChange}
      />
    </div>
  )
}