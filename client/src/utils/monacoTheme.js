export const defineCoduetTheme = (monaco) => {
  monaco.editor.defineTheme("coduet", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "FF6A3D" },
      { token: "string", foreground: "4DD6C8" },
      { token: "number", foreground: "FFC857" },
      { token: "type", foreground: "9B8CFF" },
      { token: "comment", foreground: "6B7080", fontStyle: "italic" },
    ],
    colors: {
      "editor.background": "#0E0F13",
      "editor.lineHighlightBackground": "#16171D",
      "editorLineNumber.foreground": "#50535E",
      "editorLineNumber.activeForeground": "#ECE9E2",
      "editorCursor.foreground": "#FF6A3D",
      "editor.selectionBackground": "#FF6A3D33",
      "editorWidget.background": "#16171D",
      "editorGutter.background": "#0E0F13",
    },
  })
}