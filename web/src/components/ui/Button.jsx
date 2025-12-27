/**
 * Button Component
 * 
 * Unified button component with primary and secondary variants.
 * Ensures consistent styling, 44px minimum height for touch targets, and accessible focus states.
 */

export default function Button({ 
  variant = 'primary', // 'primary' or 'secondary'
  className = '',
  children,
  ...props 
}) {
  const baseClasses = "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px] whitespace-nowrap transition-all";
  
  const primaryClasses = "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed";
  const secondaryClasses = "border border-slate-300 bg-white text-blue-700 hover:bg-slate-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed";
  
  const variantClasses = variant === 'primary' ? primaryClasses : secondaryClasses;
  
  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

