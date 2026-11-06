export const RATING_KEYS = ["problemSolving", "codeQuality", "communication", "testing"]
export const RECOMMENDATIONS = ["strong_no", "no", "yes", "strong_yes"]
export const MAX_NOTES = 5000

// Pure: returns { value } or { error }. Ratings are 1-4 or null (not rated yet).
export const validateScorecard = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Invalid body" }
  for (const k of Object.keys(body)) {
    if (!["ratings", "notes", "recommendation"].includes(k)) return { error: `Unknown field: ${k}` }
  }

  const ratings = {}
  if (body.ratings !== undefined) {
    if (!body.ratings || typeof body.ratings !== "object" || Array.isArray(body.ratings)) {
      return { error: "ratings must be an object" }
    }
    for (const [k, v] of Object.entries(body.ratings)) {
      if (!RATING_KEYS.includes(k)) return { error: `Unknown rating: ${k}` }
      if (v !== null && !(Number.isInteger(v) && v >= 1 && v <= 4)) return { error: `${k} must be 1-4 or null` }
      ratings[k] = v
    }
  }

  const value = { ratings }
  if (body.notes !== undefined) {
    if (typeof body.notes !== "string") return { error: "notes must be a string" }
    if (body.notes.length > MAX_NOTES) return { error: `notes exceed ${MAX_NOTES} characters` }
    value.notes = body.notes
  }
  if (body.recommendation !== undefined) {
    if (body.recommendation !== null && !RECOMMENDATIONS.includes(body.recommendation)) {
      return { error: "Invalid recommendation" }
    }
    value.recommendation = body.recommendation
  }
  return { value }
}