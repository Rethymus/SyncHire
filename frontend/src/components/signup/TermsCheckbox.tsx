/**
 * 服务条款复选框组件
 */

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { memo } from 'react';

interface TermsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  onClearError?: () => void;
}

export const TermsCheckbox = memo(function TermsCheckbox({ checked, onChange, error, onClearError }: TermsCheckboxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
    if (error && onClearError) {
      onClearError();
    }
  };

  return (
    <>
      <div className="flex items-start">
        <input
          id="terms"
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={error ? "terms-error" : undefined}
          className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label
          htmlFor="terms"
          className="ml-2 block text-sm text-gray-700"
        >
          我同意{" "}
          <Link href="/terms" className="text-blue-600 hover:underline">
            服务条款
          </Link>{" "}
          和{" "}
          <Link href="/privacy" className="text-blue-600 hover:underline">
            隐私政策
          </Link>
        </label>
      </div>
      {error && (
        <p id="terms-error" className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </>
  );
});
