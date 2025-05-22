"use client"

import { Editor } from "@tinymce/tinymce-react"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"

interface TinyMCEEditorProps {
  id?: string
  name?: string
  value?: string
  initialValue?: string
  onChange?: (content: string) => void
  onEditorChange?: (value: string) => void
  height?: number
  placeholder?: string
  stripHtml?: boolean
}

export function TinyMCEEditor({
  id,
  value,
  initialValue,
  onChange,
  onEditorChange,
  height = 400,
  placeholder,
  stripHtml = false,
}: TinyMCEEditorProps) {
  const [mounted, setMounted] = useState(false);

  // Set mounted to true after initial render
  useEffect(() => {
    setMounted(true);
  }, []);

  // Return null if not mounted to prevent hydration errors
  if (!mounted) {
    return null;
  }

  // Function to strip HTML tags
  const stripHtmlTags = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  // Handler for editor content changes
  const handleEditorChange = (content: string) => {
    const processedContent = stripHtml ? stripHtmlTags(content) : content;
    
    // Call whichever callback is provided
    if (onChange) {
      onChange(processedContent);
    }
    if (onEditorChange) {
      onEditorChange(processedContent);
    }
  };

  const editorConfig = {
    height: height,
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
    },
    setup: function (editor: import('tinymce').Editor) {
      editor.on('init', () => {
        if (placeholder) {
          editor.on('GetContent', function (e: { content: string }) {
            if (!e.content) {
              editor.setContent(placeholder)
            }
          })
        }
      })
    }
  }

  // Use value or initialValue, prioritizing value
  const editorValue = value !== undefined ? value : initialValue || '';

  return (
    <div className="space-y-2">
      <Label htmlFor={id || "tinymce-editor"}>Editor {stripHtml && <span className="text-red-500">*</span>}</Label>
      <Editor
        id={id || "tinymce-editor"}
        apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
        value={editorValue}
        init={editorConfig}
        onEditorChange={handleEditorChange}
      />
    </div>
  )
}