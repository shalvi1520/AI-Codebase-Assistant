"use client"

import Editor from "@monaco-editor/react"
import { useRef } from "react"

interface Props {
  code: string
  highlight?: { start: number; end: number }
}

export default function CodeViewer({ code, highlight }: Props) {

  const editorRef = useRef<any>(null)

  function handleMount(editor: any, monaco: any) {

    editorRef.current = editor

    if (highlight) {

      editor.revealLine(highlight.start)

      editor.deltaDecorations([], [
        {
          range: new monaco.Range(
            highlight.start,
            1,
            highlight.end,
            1
          ),
          options: {
            className: "highlight-code"
          }
        }
      ])
    }
  }

  return (
    <Editor
      height="500px"
      defaultLanguage="python"
      value={code}
      onMount={handleMount}
    />
  )
}