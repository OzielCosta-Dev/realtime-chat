import './Brand.css';

/**
 * The app's name and mark, reused everywhere identity shows up (auth
 * pages, sidebar header) so it's defined once instead of copy-pasted SVG
 * and text into three components that would drift apart over time.
 */
export default function Brand({ size = 'md' }) {
  return (
    <div className={`brand brand-${size}`}>
      <svg viewBox="0 0 24 24" fill="none" className="brand-mark" aria-hidden="true">
        <path
          d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5H9l-4 4v-4H5.5C4.67 16 4 15.33 4 14.5v-9Z"
          fill="currentColor"
        />
      </svg>
      <span>Conversa</span>
    </div>
  );
}
