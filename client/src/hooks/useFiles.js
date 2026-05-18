// import { useState, useCallback } from "react"
// import { filesApi } from "../services/api"
// import { toast } from "sonner"

// export const useFiles = (roomId) => {
//   const [files, setFiles]   = useState([])
//   const [saving, setSaving] = useState(false)

//   const loadFiles = useCallback(async () => {
//     try {
//       const data = await filesApi.getByRoom(roomId)
//       setFiles(data.files || [])
//     } catch (err) {
//       console.error("Files load error:", err)
//     }
//   }, [roomId])

//   const saveFile = useCallback(async (filename, content, language) => {
//     setSaving(true)
//     try {
//       const data = await filesApi.save({ roomId, filename, content, language })
//       setFiles(prev => {
//         // Already hai toh update, nahi toh add
//         const exists = prev.find(f => f.filename === filename)
//         if (exists) {
//           return prev.map(f => f.filename === filename ? data.file : f)
//         }
//         return [data.file, ...prev]
//       })
//       toast.success(`${filename} saved!`)
//     } catch (err) {
//       toast.error("Save failed")
//     } finally {
//       setSaving(false)
//     }
//   }, [roomId])

//   const loadFile = useCallback((file) => {
//     return file.content
//   }, [])

//   return { files, saving, loadFiles, saveFile, loadFile }
// }






import { useState, useCallback } from "react"
import { filesApi } from "../services/api"
import { toast } from "sonner"

export const useFiles = (roomId) => {
  const [files, setFiles]   = useState([])
  const [saving, setSaving] = useState(false)

  const loadFiles = useCallback(async () => {
    try {
      const data = await filesApi.getByRoom(roomId)
      setFiles(data.files || [])
    } catch (err) {
      // File service abhi available nahi — silently ignore
      console.warn("File service unavailable:", err.message)
      setFiles([])
    }
  }, [roomId])

  const saveFile = useCallback(async (filename, content, language) => {
    setSaving(true)
    try {
      const data = await filesApi.save({ roomId, filename, content, language })
      setFiles(prev => {
        const exists = prev.find(f => f.filename === filename)
        if (exists) {
          return prev.map(f => f.filename === filename ? data.file : f)
        }
        return [data.file, ...prev]
      })
      toast.success(`${filename} saved!`)
    } catch (err) {
      // File service nahi hai toh quietly fail karo
      console.warn("Save failed (file service unavailable):", err.message)
      toast.warning("File service coming soon — code editor mein kaam karta rahega!")
    } finally {
      setSaving(false)
    }
  }, [roomId])

  const loadFile = useCallback((file) => {
    return file.content
  }, [])

  return { files, saving, loadFiles, saveFile, loadFile }
}