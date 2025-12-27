/**
 * HelperText Component
 * 
 * Reusable helper text component for form fields.
 * Provides additional context or instructions below labels.
 */

export default function HelperText({ children, ...props }) {
  return (
    <p className="mt-1 text-sm leading-5 text-slate-600" {...props}>
      {children}
    </p>
  );
}

