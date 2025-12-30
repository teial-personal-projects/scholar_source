/**
 * TextLabel Component
 * 
 * Reusable label component for form fields with consistent typography.
 * Supports required indicator via required prop.
 */

export default function TextLabel({ htmlFor, required, children, ...props }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-semibold text-slate-900"
      {...props}
    >
      {children}
      {required && <span className="text-red-600"> *</span>}
    </label>
  );
}

