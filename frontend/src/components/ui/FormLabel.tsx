import { forwardRef } from 'react';
import clsx from 'clsx';

interface FormLabelProps {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}

export const FormLabel = forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ children, required, htmlFor, className }, ref) => (
    <label
      ref={ref}
      htmlFor={htmlFor}
      className={clsx('block text-sm font-medium text-gray-700 mb-1.5', className)}
    >
      {children}
      {required && <span className="ml-0.5 text-red-400">*</span>}
    </label>
  )
);
FormLabel.displayName = 'FormLabel';
