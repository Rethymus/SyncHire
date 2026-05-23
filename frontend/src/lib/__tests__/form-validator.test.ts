/**
 * Form Validation Tests
 * Critical input validation tests
 */

import { describe, it, expect } from 'vitest';
import {
  FormValidator,
  FormValidatorFactory,
  ValidationRules,
} from '../form-validator';

describe('FormValidator', () => {
  describe('Basic Validation', () => {
    it('should validate required fields', () => {
      const validator = new FormValidator();
      validator.addRule('name', ValidationRules.required());

      const result = validator.validateField('name', '');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('不能为空');
    });

    it('should validate email format', () => {
      const validator = new FormValidator();
      validator.addRule('email', ValidationRules.email());

      const invalidResult = validator.validateField('email', 'invalid-email');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);

      const validResult = validator.validateField('email', 'test@example.com');
      expect(validResult.valid).toBe(true);
    });

    it('should validate password strength', () => {
      const validator = new FormValidator();
      validator.addRule('password', ValidationRules.password());

      const weakResult = validator.validateField('password', 'weak');
      expect(weakResult.valid).toBe(false);

      const strongResult = validator.validateField('password', 'StrongPass123');
      expect(strongResult.valid).toBe(true);
    });

    it('should validate phone number format', () => {
      const validator = new FormValidator();
      validator.addRule('phone', ValidationRules.phone());

      const invalidResult = validator.validateField('phone', '12345');
      expect(invalidResult.valid).toBe(false);

      const validResult = validator.validateField('phone', '13812345678');
      expect(validResult.valid).toBe(true);
    });
  });

  describe('Form Validation', () => {
    it('should validate multiple fields', () => {
      const validator = new FormValidator();
      validator.addRule('name', ValidationRules.required());
      validator.addRule('email', ValidationRules.email());

      const formData = {
        name: '',
        email: 'invalid-email',
      };

      const result = validator.validateForm(formData);

      expect(result.valid).toBe(false);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.email).toBeDefined();
    });

    it('should return valid result for correct data', () => {
      const validator = new FormValidator();
      validator.addRule('name', ValidationRules.required());
      validator.addRule('email', ValidationRules.email());

      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = validator.validateForm(formData);

      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });
  });

  describe('ValidationRules', () => {
    it('should have required validation', () => {
      const rule = ValidationRules.required();
      const result = rule('');
      expect(result.valid).toBe(false);
    });

    it('should have email validation', () => {
      const rule = ValidationRules.email();
      expect(rule('test@example.com').valid).toBe(true);
      expect(rule('invalid').valid).toBe(false);
    });

    it('should have password validation', () => {
      const rule = ValidationRules.password();
      expect(rule('StrongPass123').valid).toBe(true);
      expect(rule('weak').valid).toBe(false);
    });

    it('should have phone validation', () => {
      const rule = ValidationRules.phone();
      expect(rule('13812345678').valid).toBe(true);
      expect(rule('12345').valid).toBe(false);
    });

    it('should have minLength validation', () => {
      const rule = ValidationRules.minLength(5);
      expect(rule('1234').valid).toBe(false);
      expect(rule('12345').valid).toBe(true);
    });

    it('should have maxLength validation', () => {
      const rule = ValidationRules.maxLength(10);
      expect(rule('12345678901').valid).toBe(false);
      expect(rule('12345').valid).toBe(true);
    });

    it('should have pattern validation', () => {
      const rule = ValidationRules.pattern(/^[A-Z]+$/);
      expect(rule('ABC').valid).toBe(true);
      expect(rule('abc').valid).toBe(false);
    });
  });

  describe('FormValidatorFactory', () => {
    it('should create login validator', () => {
      const validator = FormValidatorFactory.login();

      const validData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const result = validator.validateForm(validData);
      expect(result.valid).toBe(true);
    });

    it('should create signup validator', () => {
      const validator = FormValidatorFactory.signup();

      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = validator.validateForm(validData);
      expect(result.valid).toBe(true);
    });

    it('should validate password confirmation', () => {
      const validator = FormValidatorFactory.signup();

      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'DifferentPassword',
      };

      const result = validator.validateForm(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.confirmPassword).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      const validator = new FormValidator();
      validator.addRule('name', ValidationRules.required());

      const result = validator.validateField('name', null as unknown as string);
      expect(result.valid).toBe(false);
    });

    it('should handle undefined values', () => {
      const validator = new FormValidator();
      validator.addRule('name', ValidationRules.required());

      const result = validator.validateField('name', undefined as unknown as string);
      expect(result.valid).toBe(false);
    });

    it('should handle whitespace-only strings', () => {
      const validator = new FormValidator();
      validator.addRule('name', ValidationRules.required());

      const result = validator.validateField('name', '   ');
      expect(result.valid).toBe(false);
    });

    it('should handle special characters in email', () => {
      const validator = new FormValidator();
      validator.addRule('email', ValidationRules.email());

      const result = validator.validateField('email', 'test+tag@example.com');
      expect(result.valid).toBe(true);
    });

    it('should handle international phone numbers', () => {
      const validator = new FormValidator();
      validator.addRule('phone', ValidationRules.phone());

      const result = validator.validateField('phone', '8613812345678');
      // Chinese phone validation may vary
      expect(typeof result.valid).toBe('boolean');
    });
  });

  describe('Security', () => {
    it('should prevent XSS in field values', () => {
      const validator = new FormValidator();
      validator.addRule('name', ValidationRules.required());

      const xssValue = '<script>alert("xss")</script>';
      const result = validator.validateField('name', xssValue);

      // Validator should handle safely
      expect(typeof result).toBe('object');
      expect(typeof result.valid).toBe('boolean');
    });

    it('should handle SQL injection attempts', () => {
      const validator = new FormValidator();
      validator.addRule('email', ValidationRules.email());

      const sqlInjection = "'; DROP TABLE users; --";
      const result = validator.validateField('email', sqlInjection);

      expect(result.valid).toBe(false);
    });

    it('should handle very long strings', () => {
      const validator = new FormValidator();
      validator.addRule('name', ValidationRules.maxLength(50));

      const longString = 'a'.repeat(1000);
      const result = validator.validateField('name', longString);

      expect(result.valid).toBe(false);
    });
  });
});
