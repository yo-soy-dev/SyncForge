import * as roomService from "../services/room.service.js"
import { asyncHandler } from "../../shared/utils/asyncHandler.js"
import { NotFoundError } from "../../shared/errors/ApiError.js"
import { createLogger } from "../../shared/utils/logger.js"

const logger = createLogger("room-service")


export const createRoom = async (req, res) => {
  // try {
    const userId = req.headers["x-user-id"]
    const userData = JSON.parse(req.headers["x-user-data"] || "{}")

    const room = await roomService.createRoom({
      ...req.body,
      userId,
      username: userData.username || "Anonymous"
    })

    logger.info("Room created", { roomId: room._id, userId })
    res.status(201).json({ success: true, room })
  // } catch (error) {
  //   res.status(400).json({ success: false, message: error.message })
  // }
}

export const joinRoom = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"]
    const userData = JSON.parse(req.headers["x-user-data"] || "{}")

    const room = await roomService.joinRoom({
      code: req.body.code,
      userId,
      username: userData.username || "Anonymous"
    })

    res.status(200).json({ success: true, room })
  } catch (error) {
    res.status(404).json({ success: false, message: error.message })
  }
}

export const getMyRooms = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"]
    const rooms = await roomService.getMyRooms(userId)
    res.status(200).json({ success: true, rooms })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getRoomById = async (req, res) => {
  // try {
    const room = await roomService.getRoomById(req.params.roomId)
    if (!room) throw new NotFoundError("Room not found")
    res.status(200).json({ success: true, room })

  // } catch (error) {
  //   res.status(404).json({ success: false, message: error.message })
  // }
}

export const deleteRoom = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"]
    await roomService.deleteRoom(req.params.roomId, userId)
    res.status(200).json({ success: true, message: "Room deleted" })
  } catch (error) {
    res.status(403).json({ success: false, message: error.message })
  }
}



export const getRoomByCode = async (req, res) => {
  try {
    const { code } = req.params
    const room = await roomService.getRoomByCode(code)
    if (!room) return res.status(404).json({ success: false, message: "Room nahi mila" })
    res.status(200).json({ success: true, room })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}



export const leaveRoom = asyncHandler(async (req, res) => {
  const userId = req.headers["x-user-id"]
  await roomService.leaveRoom(req.params.roomId, userId)
  res.status(200).json({ success: true, message: "Room left successfully" })
})