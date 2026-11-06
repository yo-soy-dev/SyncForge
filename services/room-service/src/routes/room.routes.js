import { Router } from "express"
import * as roomController from "../controllers/room.controller.js"

const router = Router()

// Room CRUD
router.post("/create", roomController.createRoom)
router.post("/join", roomController.joinRoom)
router.get("/my-rooms", roomController.getMyRooms)
router.get("/code/:code", roomController.getRoomByCode)
router.get("/:roomId", roomController.getRoomById)
router.delete("/:roomId", roomController.deleteRoom)
router.post("/:roomId/leave", roomController.leaveRoom)
router.patch("/:roomId/members/:userId", roomController.updateMemberRole)
router.patch("/:roomId/interview", roomController.updateInterview)
router.post("/:roomId/snapshots", roomController.createSnapshot)
router.get("/:roomId/snapshots", roomController.listSnapshots)
router.get("/:roomId/snapshots/:snapshotId", roomController.getSnapshot)
router.put("/:roomId/scorecard", roomController.saveScorecard)
router.get("/:roomId/scorecards", roomController.listScorecards)
router.get("/:roomId/timeline", roomController.getTimeline)
router.post("/internal/:roomId/call-event", roomController.recordCallEvent)
router.get("/:roomId/summary", roomController.getSummary)
router.put("/:roomId/summary", roomController.saveSummary)
router.get("/:roomId/summary-source", roomController.getSummarySource)

export default router