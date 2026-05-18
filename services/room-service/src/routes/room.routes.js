import { Router } from "express"
import * as roomController from "../controllers/room.controller.js"

const router = Router()

// Room CRUD
router.post("/create",    roomController.createRoom)
router.post("/join",      roomController.joinRoom)
router.get("/my-rooms",   roomController.getMyRooms)
router.get("/code/:code",    roomController.getRoomByCode)
router.get("/:roomId",    roomController.getRoomById)
router.delete("/:roomId", roomController.deleteRoom)
router.post("/:roomId/leave",  roomController.leaveRoom)

export default router