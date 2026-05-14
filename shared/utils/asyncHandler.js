// Har controller mein try-catch likhna boring hai
// Ye wrapper khud try-catch karta hai

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
    // catch(next) = error errorHandler ko de do
  }
}