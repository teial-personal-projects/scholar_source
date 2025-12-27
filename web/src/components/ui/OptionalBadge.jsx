/**
 * OptionalBadge Component
 * 
 * Badge indicating that a field is optional.
 * De-emphasized styling to differentiate from required fields.
 */

export default function OptionalBadge({ ...props }) {
  return (
    <span 
      className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full"
      {...props}
    >
      Optional
    </span>
  );
}

