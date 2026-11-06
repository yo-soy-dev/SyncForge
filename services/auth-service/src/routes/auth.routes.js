import { Router } from "express"
import * as authController from "../controllers/auth.controller.js"
import { protect } from "../middleware/auth.middleware.js"
import { validateSignup, validateLogin } from "../middleware/validate.js"
import { avatarUpload } from "../middleware/upload.js"

const router = Router()

router.post("/signup", validateSignup, authController.signup)   
router.post("/login",  validateLogin,  authController.login)
router.post("/guest", authController.guest)
router.post("/forgot-password", authController.forgotPassword)
router.post("/reset-password", authController.resetPassword)
router.post("/avatar", protect, avatarUpload, authController.uploadAvatar)
router.post("/logout", protect, authController.logout) 
router.get("/verify-token", authController.verifyToken) 

export default router