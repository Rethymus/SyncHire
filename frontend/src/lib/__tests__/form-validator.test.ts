/**
 * Form Validation Tests
 * Critical input validation tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FormValidator,
  FormValidatorFactory,
  ValidationRules,
} from '../form-validator';

describe('FormValidator', () => {
  let validator: FormValidator;

  beforeEach(() => {
    validator = new FormValidator();
  });

  describe('Basic Validation', () => {
    it('should validate required fields', () => {
      validator.addRule('name', ValidationRules.required());

      const result = validator.validateField('name', '');
      expect(result).not.toBe(null);
      expect(result).toContain('不能为空');
    });

    it('should return null for valid required field', () => {
      validator.addRule('name', ValidationRules.required());

      const result = validator.validateField('name', 'John');
      expect(result).toBe(null);
    });

    it('should validate email format', () => {
      validator.addRule('email', ValidationRules.email());

      const invalidResult = validator.validateField('email', 'invalid-email');
      expect(invalidResult).not.toBe(null);

      const validResult = validator.validateField('email', 'test@example.com');
      expect(validResult).toBe(null);
    });

    it('should validate password strength', () => {
      validator.addRule('password', ValidationRules.password());

      const weakResult = validator.validateField('password', 'weak');
      expect(weakResult).not.toBe(null);

      const strongResult = validator.validateField('password', 'StrongPass123');
      expect(strongResult).toBe(null);
    });

    it('should validate phone number format', () => {
      validator.addRule('phone', ValidationRules.phone());

      const invalidResult = validator.validateField('phone', '12345');
      expect(invalidResult).not.toBe(null);

      const validResult = validator.validateField('phone', '13812345678');
      expect(validResult).toBe(null);
    });
  });

  describe('Form Validation', () => {
    it('should validate multiple fields', () => {
      validator.addRule('name', ValidationRules.required());
      validator.addRule('email', ValidationRules.email());

      const formData = {
        name: '',
        email: 'invalid-email',
      };

      const result = validator.validateForm(formData);

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.email).toBeDefined();
    });

    it('should return valid result for correct data', () => {
      validator.addRule('name', ValidationRules.required());
      validator.addRule('email', ValidationRules.email());

      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = validator.validateForm(formData);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });
  });

  describe('Field Management', () => {
    it('should remove field rules', () => {
      validator.addRule('name', ValidationRules.required());

      let result = validator.validateField('name', '');
      expect(result).not.toBe(null);

      validator.removeField('name');

      result = validator.validateField('name', '');
      expect(result).toBe(null);
    });

    it('should clear all rules', () => {
      validator.addRule('name', ValidationRules.required());
      validator.addRule('email', ValidationRules.email());

      validator.clear();

      const nameResult = validator.validateField('name', '');
      expect(nameResult).toBe(null);

      const emailResult = validator.validateField('email', '');
      expect(emailResult).toBe(null);
    });
  });

  describe('ValidationRules', () => {
    it('should have required validation', () => {
      const rule = ValidationRules.required();
      expect(rule.validate('')).toBe(false);
      expect(rule.validate('value')).toBe(true);
    });

    it('should have email validation', () => {
      const rule = ValidationRules.email();
      expect(rule.validate('test@example.com')).toBe(true);
      expect(rule.validate('invalid')).toBe(false);
    });

    it('should have password validation', () => {
      const rule = ValidationRules.password();
      expect(rule.validate('StrongPass123')).toBe(true);
      expect(rule.validate('weak')).toBe(false);
    });

    it('should have phone validation', () => {
      const rule = ValidationRules.phone();
      expect(rule.validate('13812345678')).toBe(true);
      expect(rule.validate('12345')).toBe(false);
    });

    it('should have minLength validation', () => {
      const rule = ValidationRules.minLength(5);
      expect(rule.validate('1234')).toBe(false);
      expect(rule.validate('12345')).toBe(true);
    });

    it('should have maxLength validation', () => {
      const rule = ValidationRules.maxLength(10);
      expect(rule.validate('12345678901')).toBe(false);
      expect(rule.validate('12345')).toBe(true);
    });
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
    expect(result.isValid).toBe(true);
  });

  it('should create login validator with invalid data', () => {
    const validator = FormValidatorFactory.login();

    const invalidData = {
      email: '',
      password: '',
    };

    const result = validator.validateForm(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toBeDefined();
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
    expect(result.isValid).toBe(true);
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
    expect(result.isValid).toBe(false);
    expect(result.errors.confirmPassword).toBeDefined();
  });

  it('should create resume validator', () => {
    const validator = FormValidatorFactory.resume();

    const validData = {
      title: 'Software Engineer',
      name: 'John Doe',
      phone: '13812345678',
      email: 'john@example.com',
    };

    const result = validator.validateForm(validData);
    expect(result.isValid).toBe(true);
  });

  it('should validate resume with invalid data', () => {
    const validator = FormValidatorFactory.resume();

    const invalidData = {
      title: '',
      name: '',
      phone: '123',
      email: 'invalid',
    };

    const result = validator.validateForm(invalidData);
    expect(result.isValid).toBe(false);
  });
});
