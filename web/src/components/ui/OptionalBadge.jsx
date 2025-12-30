/**
 * OptionalBadge Component
 * 
 * Badge indicating that a field is optional.
 * De-emphasized styling to differentiate from required fields.
 */

export default function OptionalBadge({ ...props }) {
  return (
    <span className="optional-badge" {...props}>
      Optional
    </span>
  );
}

