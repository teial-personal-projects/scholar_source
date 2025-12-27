/**
 * TextInput Component
 * 
 * Unified input component that handles input, select, and textarea elements.
 * Ensures consistent styling, 16px minimum font size, and accessible focus states.
 */

export default function TextInput({
  as = 'input', // 'input', 'select', or 'textarea'
  className = '',
  children,
  ...props
}) {
  const baseClasses = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[16px] leading-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed";

  const selectClasses = `${baseClasses} cursor-pointer bg-blue-50 border-blue-200 font-semibold hover:bg-blue-100`;
  const inputClasses = baseClasses;
  const textareaClasses = `${baseClasses} resize-y`;
  
  const classes = as === 'select' 
    ? selectClasses 
    : as === 'textarea'
    ? textareaClasses
    : inputClasses;
  
  const finalClassName = `${classes} ${className}`.trim();
  
  if (as === 'select') {
    return (
      <select
        className={finalClassName}
        {...props}
      >
        {children}
      </select>
    );
  }
  
  if (as === 'textarea') {
    return (
      <textarea
        className={finalClassName}
        {...props}
      >
        {children}
      </textarea>
    );
  }
  
  return (
    <input
      className={finalClassName}
      {...props}
    />
  );
}

