import { forwardRef } from 'react';
import clsx from 'clsx';
import { FormLabel } from './FormLabel';
import { FormError } from './FormError';

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, required, error, children, className, id, ...rest }, ref) => {
    const selectId = id || label.replace(/\s+/g, '-').toLowerCase();
    const hasError = !!error;

    return (
      <div className={className}>
        <FormLabel htmlFor={selectId} required={required}>{label}</FormLabel>
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            hasError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20',
          )}
          aria-invalid={hasError}
          {...rest}
        >
          {children}
        </select>
        <FormError message={error} />
      </div>
    );
  }
);
FormSelect.displayName = 'FormSelect';
