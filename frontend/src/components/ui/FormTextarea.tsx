import { forwardRef } from 'react';
import clsx from 'clsx';
import { FormLabel } from './FormLabel';
import { FormError } from './FormError';

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  required?: boolean;
  error?: string;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, required, error, className, id, ...rest }, ref) => {
    const textareaId = id || label.replace(/\s+/g, '-').toLowerCase();
    const hasError = !!error;

    return (
      <div className={className}>
        <FormLabel htmlFor={textareaId} required={required}>{label}</FormLabel>
        <textarea
          ref={ref}
          id={textareaId}
          className={clsx(
            'block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900',
            'placeholder-gray-400',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            hasError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20',
            'resize-none',
          )}
          aria-invalid={hasError}
          {...rest}
        />
        <FormError message={error} />
      </div>
    );
  }
);
FormTextarea.displayName = 'FormTextarea';
