// import { Router } from "express"
// import { runCode } from "../executors/index.js"

// const router = Router()

// router.post("/run", async (req, res) => {
//   const { code, language, input = "" } = req.body

//   if (!code || !language) {
//     return res.status(400).json({
//       success: false,
//       message: "Both code and language are required"
//     })
//   }

//   if (code.length > 50000) {
//     return res.status(400).json({
//       success: false,
//       message: "Code is too large"
//     })
//   }

//   try {
//     const result = await runCode(code, language, input)
//     res.json({ success: true, ...result })
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       stderr: err.message,
//       stdout: "",
//       executionTime: 0
//     })
//   }
// })

// export default router




import { Router } from "express"
import { runCode } from "../executors/index.js"

const router = Router()

router.post("/run", async (req, res) => {
  const { code, language, input = "" } = req.body  

  if (!code || !language) {
    return res.status(400).json({
      success: false,
      message: "Both code and language are required"
    })
  }

  if (code.length > 50000) {
    return res.status(400).json({
      success: false,
      message: "Code is too large"
    })
  }

  try {
    const result = await runCode(code, language, input)  // ← input pass
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({
      success: false,
      stderr: err.message,
      stdout: "",
      executionTime: 0
    })
  }
})

export default router