import './Avatar.css';

// A small curated set rather than a computed HSL — hand-picked colors stay
// visually balanced with each other (similar saturation/lightness) in a way
// an arbitrary hash-to-hue formula tends not to.
const PALETTE = ['#5046e5', '#0891b2', '#c026d3', '#d97706', '#16a34a', '#e11d48', '#4f46e5', '#0d9488'];

function colorForName(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

function initialsForName(name = '') {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/**
 * Deterministic per-name color + initials, no images or uploads involved —
 * the same lightweight approach Slack and Linear both use for a user who
 * hasn't set a profile picture.
 */
export default function Avatar({ name, size = 32 }) {
  return (
    <div
      className="avatar"
      style={{ backgroundColor: colorForName(name), width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {initialsForName(name)}
    </div>
  );
}
