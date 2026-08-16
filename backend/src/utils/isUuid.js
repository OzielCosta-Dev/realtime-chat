const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Postgres throws a database error if you compare a uuid column against a
 * malformed string, which would surface as a 500. Checking the shape first
 * lets us return an honest 400 instead.
 */
export default function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}
