/**
 * The backend returns two error shapes we need to handle:
 *   { error: "Invalid email or password" }                       — generic
 *   { error: "Validation failed", details: [{ field, message }] } — per-field
 * (see backend/src/app.js's error handler). This flattens both into one
 * string, and falls back to something readable when the request never even
 * reached the server (e.g. the backend isn't running).
 */
export default function extractErrorMessage(error) {
  const data = error?.response?.data;

  if (!data) {
    return 'Could not reach the server. Is the backend running?';
  }

  if (data.details?.length) {
    return data.details.map((d) => d.message).join(' ');
  }

  return data.error || 'Something went wrong. Please try again.';
}
