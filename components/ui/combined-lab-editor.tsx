"use client"

import { useState } from "react"
import { Editor } from "@tinymce/tinymce-react"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CombinedLabEditorProps {
  description: string
  objectives: string
  audience: string
  prerequisites: string
  onDescriptionChange: (value: string) => void
  onObjectivesChange: (value: string) => void
  onAudienceChange: (value: string) => void
  onPrerequisitesChange: (value: string) => void
  height?: number
}

export function CombinedLabEditor({
  description,
  objectives,
  audience,
  prerequisites,
  onDescriptionChange,
  onObjectivesChange,
  onAudienceChange,
  onPrerequisitesChange,
  height = 400,
}: CombinedLabEditorProps) {
  const [activeTab, setActiveTab] = useState("description")
  
  // Function to strip HTML tags
  const stripHtmlTags = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  // Editor configuration
  const editorConfig = {
    height,
    menubar: false,
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
    ] as string[],
    toolbar: 'undo redo | blocks | ' +
      'bold italic forecolor | alignleft aligncenter ' +
      'alignright alignjustify | bullist numlist outdent indent | ' +
      'removeformat | help',
    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif; font-size: 14px }',
    branding: false,
    elementpath: false,
    statusbar: false,
    entity_encoding: 'raw',
    forced_root_block: 'p',
    convert_newlines_to_brs: false,
    remove_linebreaks: false,
    valid_elements: 'p[style],br,strong/b,em/i,ul,ol,li,a[href],h1,h2,h3,h4,h5,h6,blockquote,code,pre',
    valid_styles: {
      '*': 'font-size,font-family,color,text-decoration,text-align'
    } as Record<string, string>,
    paste_preprocess: function (
      plugin: any,
      args: { content: string }
    ): void {
      args.content = args.content.replace(/<p>&nbsp;<\/p>/g, '<br />');
    },
    setup: function(editor) {
      editor.on('GetContent', function(e) {
        // This ensures we get clean text without HTML tags when requesting content
        if (e.format === 'text') {
          const div = document.createElement('div');
          div.innerHTML = e.content;
          e.content = div.textContent || div.innerText || '';
        }
      });
    }
  }

  // Handle editor changes with proper HTML cleanup
  const handleEditorChange = (setter: (value: string) => void) => (content: string) => {
    // For objectives field, we need to extract clean text content for the JSON array
    if (setter === onObjectivesChange) {
      setter(content);
    } else {
      setter(content);
    }
  };

  return (
    <div className="space-y-4">
      <Label>Lab Content</Label>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="objectives">Objectives</TabsTrigger>
          <TabsTrigger value="audience">Target Audience</TabsTrigger>
          <TabsTrigger value="prerequisites">Prerequisites</TabsTrigger>
        </TabsList>
        
        <TabsContent value="description" className="mt-0">
          <Editor
            id="description-editor"
            apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
            value={description}
            init={{
              ...editorConfig,
              placeholder: "Enter lab description...",
            }}
            onEditorChange={handleEditorChange(onDescriptionChange)}
          />
        </TabsContent>
        
        <TabsContent value="objectives" className="mt-0">
          <Editor
            id="objectives-editor"
            apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
            value={objectives}
            init={{
              ...editorConfig,
              placeholder: "Enter lab objectives (one per line)...",
            }}
            onEditorChange={handleEditorChange(onObjectivesChange)}
          />
        </TabsContent>
        
        <TabsContent value="audience" className="mt-0">
          <Editor
            id="audience-editor"
            apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
            value={audience}
            init={{
              ...editorConfig,
              placeholder: "Describe the target audience...",
            }}
            onEditorChange={handleEditorChange(onAudienceChange)}
          />
        </TabsContent>
        
        <TabsContent value="prerequisites" className="mt-0">
          <Editor
            id="prerequisites-editor"
            apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
            value={prerequisites}
            init={{
              ...editorConfig,
              placeholder: "List any prerequisites...",
            }}
            onEditorChange={handleEditorChange(onPrerequisitesChange)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}