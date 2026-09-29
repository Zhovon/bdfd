/**
 * The house emblem — a single upright rice ear (paddy), echoing both the food
 * service's remit and the sheaf on Bangladesh's national emblem. Drawn in
 * `currentColor` so it inherits its surroundings (cream on the green seal,
 * green on light panels). Frame it with the `.seal` ring for a crest.
 */
export default function Emblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden focusable="false">
      {/* stalk */}
      <path d="M12 20.4V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      {/* base leaves — a hint of a route sweeping out from the stem */}
      <path
        d="M12 19.4c-1.7-.15-3-1.25-3.6-3M12 19.4c1.7-.15 3-1.25 3.6-3"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* grains */}
      <g fill="currentColor">
        <ellipse cx="12" cy="4.7" rx="1.25" ry="2.9" />
        <ellipse cx="14.05" cy="7.7" rx="1.25" ry="2.9" transform="rotate(30 14.05 7.7)" />
        <ellipse cx="9.95" cy="7.7" rx="1.25" ry="2.9" transform="rotate(-30 9.95 7.7)" />
        <ellipse cx="14.45" cy="11.35" rx="1.25" ry="2.9" transform="rotate(30 14.45 11.35)" />
        <ellipse cx="9.55" cy="11.35" rx="1.25" ry="2.9" transform="rotate(-30 9.55 11.35)" />
        <ellipse cx="14.3" cy="15" rx="1.2" ry="2.7" transform="rotate(30 14.3 15)" />
        <ellipse cx="9.7" cy="15" rx="1.2" ry="2.7" transform="rotate(-30 9.7 15)" />
      </g>
    </svg>
  );
}
