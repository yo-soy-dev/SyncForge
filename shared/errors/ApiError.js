export class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message)
    this.statusCode = statusCode
    this.errors = errors       
    this.success = false
    this.name = "ApiError"

    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Resource nahi mila") {
    super(404, message)
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Login karo pehle") {
    super(401, message)
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Permission nahi hai") {
    super(403, message)
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Invalid data", errors = []) {
    super(400, message, errors)
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Already exists") {
    super(409, message)
  }
}