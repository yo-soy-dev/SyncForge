const levels = {
  error: "ERROR",
  warn:  "WARN ",
  info:  "INFO ",
  debug: "DEBUG"
}

const colors = {
  ERROR: "\x1b[31m",  
  WARN:  "\x1b[33m",  
  INFO:  "\x1b[32m",  
  DEBUG: "\x1b[36m",  
  RESET: "\x1b[0m"
}

const formatMessage = (level, service, message, data) => {
  const time = new Date().toISOString()
  const color = colors[levels[level]]
  const reset = colors.RESET
  const lvl = levels[level]

  let log = `${color}[${lvl}]${reset} ${time} [${service}] ${message}`

  if (data) {
    log += `\n${JSON.stringify(data, null, 2)}`
  }

  return log
}

export const createLogger = (serviceName) => ({
  info: (message, data) =>
    console.log(formatMessage("info", serviceName, message, data)),

  warn: (message, data) =>
    console.warn(formatMessage("warn", serviceName, message, data)),

  error: (message, data) =>
    console.error(formatMessage("error", serviceName, message, data)),

  debug: (message, data) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(formatMessage("debug", serviceName, message, data))
    }
  }
})