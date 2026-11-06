import { useEffect, useRef } from "react"

// Same order and hash as the avatars in UserList, so a person's cursor
// matches the color of their avatar.
export const CURSOR_COLORS = ["#FF6A3D", "#4DD6C8", "#9B8CFF", "#FFC857"]

export const colorIndexFor = (name = "") => {
  let sum = 0
  for (const ch of name) sum += ch.charCodeAt(0)
  return sum % CURSOR_COLORS.length
}

const STYLE_ID = "coduet-remote-cursors"
const safe = (value) => String(value).replace(/[^\w-]/g, "")

export const useRemoteCursors = (editor, users, cursors, myUserId, followSocketId) => {
  const collectionRef = useRef(null)

  // One decorations collection per editor instance
  useEffect(() => {
    if (!editor) return
    collectionRef.current = editor.createDecorationsCollection([])

    return () => {
      collectionRef.current?.clear()
      collectionRef.current = null
      document.getElementById(STYLE_ID)?.remove()
    }
  }, [editor])

  // Draw everyone else's cursor + selection
  useEffect(() => {
    const collection = collectionRef.current
    const model = editor?.getModel()
    if (!collection || !model) return

    let styleEl = document.getElementById(STYLE_ID)
    if (!styleEl) {
      styleEl = document.createElement("style")
      styleEl.id = STYLE_ID
      document.head.appendChild(styleEl)
    }

    let css = ""
    const decorations = []

    users.forEach((u) => {
      if (u.userId === myUserId) return
      const c = cursors[u.socketId]
      if (!c) return

      const idx = colorIndexFor(u.username)
      const anchor = model.validatePosition({ lineNumber: c.aL, column: c.aC })
      const head = model.validatePosition({ lineNumber: c.hL, column: c.hC })

      // Only plain characters go into the stylesheet (no CSS injection from names)
      const label = (u.username || "").replace(/[^\w .-]/g, "").slice(0, 24)
      const id = safe(u.socketId)
      css += `.rc-${id}{--c:${CURSOR_COLORS[idx]};--n:"${label}";}`

      const forward =
        anchor.lineNumber < head.lineNumber ||
        (anchor.lineNumber === head.lineNumber && anchor.column <= head.column)
      const start = forward ? anchor : head
      const end = forward ? head : anchor

      if (start.lineNumber !== end.lineNumber || start.column !== end.column) {
        decorations.push({
          range: {
            startLineNumber: start.lineNumber,
            startColumn: start.column,
            endLineNumber: end.lineNumber,
            endColumn: end.column,
          },
          options: { className: `rs rs-${idx}`, stickiness: 1 },
        })
      }

      decorations.push({
        range: {
          startLineNumber: head.lineNumber,
          startColumn: head.column,
          endLineNumber: head.lineNumber,
          endColumn: head.column,
        },
        options: { afterContentClassName: `rc rc-${id}`, stickiness: 1 },
      })
    })

    styleEl.textContent = css
    collection.set(decorations)
  }, [editor, users, cursors, myUserId])

  // Follow mode: keep the followed person's cursor in view
  useEffect(() => {
    if (!editor || !followSocketId) return
    const c = cursors[followSocketId]
    if (!c) return

    const position = editor
      .getModel()
      ?.validatePosition({ lineNumber: c.hL, column: c.hC })
    if (position) editor.revealPositionInCenterIfOutsideViewport(position, 0) // 0 = smooth
  }, [editor, cursors, followSocketId])
}