"""
Input validation utilities for SyncHire prompt testing
"""

import re
from typing import Any, Dict, List


def validate_test_input(input_data: Any, max_length: int = 10000) -> Any:
    """
    Validate test input data to prevent injection attacks.

    Args:
        input_data: Input data to validate (str, dict, list)
        max_length: Maximum length for string inputs

    Returns:
        Validated input data

    Raises:
        ValueError: If input contains dangerous patterns
    """
    if isinstance(input_data, str):
        if len(input_data) > max_length:
            raise ValueError(f"Input exceeds maximum length of {max_length}")

        # Check for prompt injection patterns
        dangerous_patterns = [
            r'ignore\s+(all\s+)?(previous|earlier)\s+instructions',
            r'forget\s+(everything|all\s+previous)',
            r'disregard\s+(all\s+)?(previous|earlier)\s+instructions',
            r'override\s+(system|previous)\s+instructions',
        ]

        for pattern in dangerous_patterns:
            if re.search(pattern, input_data, re.IGNORECASE):
                raise ValueError(f"Input contains potentially dangerous pattern")

        # Remove control characters
        return re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]', '', input_data)

    elif isinstance(input_data, dict):
        return {k: validate_test_input(v, max_length) for k, v in input_data.items()}

    elif isinstance(input_data, list):
        return [validate_test_input(item, max_length) for item in input_data]

    else:
        return input_data


def sanitize_prompt_output(output: str) -> str:
    """
    Sanitize prompt output to ensure it doesn't contain malicious content.

    Args:
        output: Output string to sanitize

    Returns:
        Sanitized output string
    """
    if not isinstance(output, str):
        return output

    # Remove any potential script injections or dangerous HTML
    sanitized = re.sub(r'<script[^>]*>.*?</script>', '', output, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r'<iframe[^>]*>.*?</iframe>', '', sanitized, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r'<object[^>]*>.*?</object>', '', sanitized, flags=re.IGNORECASE | re.DOTALL)

    # Remove control characters
    sanitized = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]', '', sanitized)

    return sanitized
