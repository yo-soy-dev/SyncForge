import { useState, useCallback } from "react"
import { filesApi } from "../services/api"
import { toast } from "sonner"

export const useFiles = (roomId) => {
  const [files, setFiles]   = useState([])
  const [saving, setSaving] = useState(false)

  const loadFiles = useCallback(async () => {
    if (!roomId) return
    try {
      const data = await filesApi.getByRoom(roomId)
      setFiles(data.files || [])
    } catch (err) {
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
      toast.success(`${filename} saved to cloud!`)
    } catch (err) {
      console.error("Save error:", err)
      toast.error("Save failed: " + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }, [roomId])

  
  const saveToDevice = useCallback((filename, content) => {
    try {
      
      const blob = new Blob([content], { type: "text/plain" })

      
      const url  = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href     = url
      link.download = filename  

      
      document.body.appendChild(link)
      link.click()

      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`${filename} downloaded to your device!`)
    } catch (err) {
      console.error("Device save error:", err)
      toast.error("Download failed: " + err.message)
    }
  }, [])

  const loadFile = useCallback((file) => {
    return file.content || ""
  }, [])

  return { files, saving, loadFiles, saveFile, saveToDevice, loadFile }
}
