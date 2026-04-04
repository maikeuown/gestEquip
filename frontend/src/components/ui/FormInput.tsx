import { forwardRef } from 'react';
import clsx from 'clsx';
import { FormLabel } from './FormLabel';
import { FormError } from './FormError';

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, required, error, leftIcon, className, id, ...rest }, ref) => {
    const inputId = id || label.replace(/\s+/g, '-').toLowerCase();
    const hasError = !!error;

    return (
      <div className={className}>
        <FormLabel htmlFor={inputId} required={required}>{label}</FormLabel>
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900',
              'placeholder-gray-400',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              hasError
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20',
              leftIcon && 'pl-10',
            )}
            aria-invalid={hasError}
            {...rest}
          />
        </div>
        <FormError message={error} />
      </div>
    );
  }
);
FormInput.displayName = 'FormInput';
