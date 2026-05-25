/**
 * Enhanced Password Strength Indicator Component
 * Shows password strength with visual requirements checklist
 */

import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  passwordStrength: {
    level: number;
    label: string;
    emoji: string;
    color: string;
    requirements: { met: boolean; text: string }[];
  };
  password: string;
}

export function PasswordStrengthIndicator({
  passwordStrength,
  password,
}: PasswordStrengthIndicatorProps) {
  if (!password) {
    return null;
  }

  const percentage = (passwordStrength.level / 5) * 100;

  return (
    <div className="mt-2 space-y-2" role="region" aria-label="Password strength indicator">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">密码强度:</span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={passwordStrength.level}
            aria-valuemin={0}
            aria-valuemax={5}
            aria-label={`Password strength: ${passwordStrength.label}`}
          />
        </div>
        <span className="text-sm font-semibold" aria-label={`Strength level: ${passwordStrength.label}`}>
          {passwordStrength.emoji} {passwordStrength.label}
        </span>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1">
        <p className="text-xs text-gray-600 mb-1">密码要求:</p>
        {passwordStrength.requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="h-3 w-3 text-green-600" aria-hidden="true" />
            ) : (
              <X className="h-3 w-3 text-red-500" aria-hidden="true" />
            )}
            <span
              className={req.met ? 'text-green-700 line-through' : 'text-gray-600'}
              aria-label={req.met ? `Requirement met: ${req.text}` : `Requirement not met: ${req.text}`}
            >
              {req.text}
            </span>
          </div>
        ))}
      </div>

      {/* Strength description */}
      <div className="text-xs text-gray-500 mt-1">
        {passwordStrength.level <= 2 && '建议: 增加密码复杂度以提高安全性'}
        {passwordStrength.level === 3 && '良好: 密码强度适中'}
        {passwordStrength.level >= 4 && '优秀: 密码强度很高'}
      </div>
    </div>
  );
}
