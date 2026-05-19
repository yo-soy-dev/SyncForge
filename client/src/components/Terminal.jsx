// import { useRef, useEffect } from "react"
// import { motion, AnimatePresence } from "framer-motion"

// export const Terminal = ({ output = [], running, onClear, isOpen }) => {
//   const bottomRef = useRef(null)

//   useEffect(() => {
//     bottomRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [output])

//   const getColor = (type) => {
//     switch (type) {
//       case "error":
//         return "text-red-400"
//       case "info":
//         return "text-gray-500"
//       case "output":
//         return "text-green-400"
//       default:
//         return "text-gray-300"
//     }
//   }

//   return (
//     <AnimatePresence>
//       {isOpen && (
//         <motion.div
//           initial={{ height: 0, opacity: 0 }}
//           animate={{ height: "35vh", opacity: 1 }}
//           exit={{ height: 0, opacity: 0 }}
//           transition={{ type: "spring", damping: 25, stiffness: 200 }}
//           className="
//             border-t border-gray-800
//             bg-gray-950
//             flex flex-col
//             overflow-hidden
//             w-full
//             max-h-[60vh]
//           "
//         >
//           {/* Header */}
//           <div className="
//             flex items-center justify-between
//             px-3 sm:px-4 py-2
//             border-b border-gray-800
//             bg-gray-900
//             shrink-0
//             gap-2
//           ">
//             {/* traffic lights */}
//             <div className="flex items-center gap-1 sm:gap-2 min-w-0">
//               <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/70" />
//               <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/70" />
//               <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/70" />

//               <span className="text-gray-500 text-[10px] sm:text-xs ml-2 font-mono truncate">
//                 Terminal
//               </span>
//             </div>

//             {/* actions */}
//             <div className="flex items-center gap-2 sm:gap-3 shrink-0">
//               {running && (
//                 <motion.span
//                   animate={{ opacity: [1, 0.3, 1] }}
//                   transition={{ repeat: Infinity, duration: 1 }}
//                   className="text-[10px] sm:text-xs text-amber-400 font-mono whitespace-nowrap"
//                 >
//                   Running...
//                 </motion.span>
//               )}

//               <button
//                 onClick={onClear}
//                 className="
//                   text-[10px] sm:text-xs
//                   text-gray-600 hover:text-gray-400
//                   transition font-mono
//                   px-2 py-1
//                 "
//               >
//                 Clear
//               </button>
//             </div>
//           </div>

//           {/* Output */}
//           <div
//             className="
//               flex-1 overflow-y-auto
//               p-2 sm:p-3
//               font-mono
//               text-[10px] sm:text-xs
//               leading-relaxed
//               break-words
//             "
//           >
//             {output.length === 0 ? (
//               <p className="text-gray-700 text-[10px] sm:text-xs">
//                 Press the Run button or use Ctrl + Enter — output will appear here
//               </p>
//             ) : (
//               output.map((line, i) => (
//                 <motion.div
//                   key={i}
//                   initial={{ opacity: 0, x: -4 }}
//                   animate={{ opacity: 1, x: 0 }}
//                   transition={{ delay: i * 0.02 }}
//                   className={`whitespace-pre-wrap ${getColor(line.type)}`}
//                 >
//                   {line.type === "output"
//                     ? line.text
//                     : line.type === "error"
//                     ? `✗ ${line.text}`
//                     : line.text}
//                 </motion.div>
//               ))
//             )}

//             <div ref={bottomRef} />
//           </div>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   )
// }




import { useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export const Terminal = ({
  output = [],
  running,
  onClear,
  isOpen,
  stdin,
  setStdin,
  needsInput = false,
}) => {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [output])

  const getColor = (type) => {
    switch (type) {
      case "error":
        return "text-red-400"
      case "info":
        return "text-gray-500"
      case "output":
        return "text-green-400"
      default:
        return "text-gray-300"
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "35vh", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="
            border-t border-gray-800
            bg-gray-950
            flex flex-col
            overflow-hidden
            w-full
            max-h-[60vh]
          "
        >
          <div
            className="
              flex items-center justify-between
              px-3 sm:px-4 py-2
              border-b border-gray-800
              bg-gray-900
              shrink-0
              gap-2
            "
          >
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/70" />
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/70" />
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/70" />

              <span className="text-gray-500 text-[10px] sm:text-xs ml-2 font-mono truncate">
                Terminal
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {running && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="text-[10px] sm:text-xs text-amber-400 font-mono whitespace-nowrap"
                >
                  Running...
                </motion.span>
              )}

              <button
                onClick={onClear}
                className="
                  text-[10px] sm:text-xs
                  text-gray-600 hover:text-gray-400
                  transition font-mono
                  px-2 py-1
                "
              >
                Clear
              </button>
            </div>
          </div>

          <div
            className="
              flex-1 overflow-y-auto
              p-2 sm:p-3
              font-mono
              text-[10px] sm:text-xs
              leading-relaxed
              break-words
            "
          >
            {output.length === 0 ? (
              <p className="text-gray-700 text-[10px] sm:text-xs">
                Press the Run button or use Ctrl + Enter — output will appear here
              </p>
            ) : (
              output.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`whitespace-pre-wrap ${getColor(line.type)}`}
                >
                  {line.type === "output"
                    ? line.text
                    : line.type === "error"
                      ? `✗ ${line.text}`
                      : line.text}
                </motion.div>
              ))
            )}

            <div ref={bottomRef} />
          </div>

          {needsInput && (
            <div className={`border-t bg-gray-900 p-2 transition-all ${!stdin.trim()
                ? "border-t-amber-400/60"   
                : "border-t-gray-800"       
              }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] sm:text-xs font-mono ${!stdin.trim() ? "text-amber-400" : "text-gray-500"
                  }`}>
                  {!stdin.trim() ? "⚠ stdin required — enter input below" : "stdin / custom input"}
                </span>

                {stdin?.length > 0 && (
                  <button
                    onClick={() => setStdin("")}
                    className="text-[10px] text-gray-600 hover:text-gray-400 transition font-mono"
                  >
                    clear input
                  </button>
                )}
              </div>

              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder={`Example:\n5\n10 20\nhello`}
                spellCheck={false}
                className={`
        w-full min-h-[70px] max-h-[120px] resize-y
        rounded-lg border bg-gray-950
        px-3 py-2 text-green-400
        placeholder:text-gray-600 font-mono text-xs outline-none
        transition-all
        ${!stdin.trim()
                    ? "border-amber-400/40 focus:border-amber-400"
                    : "border-gray-800 focus:border-emerald-500/40"
                  }
      `}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}