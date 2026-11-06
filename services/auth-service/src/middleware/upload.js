import multer from "multer"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /^image\/(jpeg|png|webp)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG or WEBP images are allowed")),
})

export const avatarUpload = (req, res, next) =>
  upload.single("avatar")(req, res, (err) => {
    if (err) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "Image must be under 2MB" : err.message
      return res.status(400).json({ success: false, message })
    }
    next()
  })