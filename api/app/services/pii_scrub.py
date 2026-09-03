"""PII scrubbing for outbound LLM payloads.

Data minimization for the AI features (resume optimization, JD parsing):
text that is about to leave the machine for a third-party LLM provider
(OpenAI / Anthropic) is masked for direct identifiers - email addresses,
mainland China mobile numbers, international phone numbers with a ``+``
prefix, and China resident ID card numbers - while keeping enough format
hints (prefix/suffix) for the model to reason about the document.

Standard library only: this module intentionally has no third-party
dependencies so it can ship inside the local-first Lite build.

Masking patterns inspired by Microsoft Presidio (not a dependency).
"""

import re
from dataclasses import dataclass

EMAIL = "email"
MOBILE = "mobile"
PHONE_INTL = "phone_intl"
ID_CARD = "id_card"

_MOBILE_RE = re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)")
_PHONE_INTL_RE = re.compile(r"(?<!\d)\+\d{1,3}[-\s]?\d{7,12}(?!\d)")
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_ID_CARD_RE = re.compile(
    r"(?<!\d)\d{6}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])"
    r"(?:0[1-9]|[12]\d|3[01])\d{3}[0-9Xx](?![0-9Xx])"
)

# GB 11643 weights and check-character table for 18-digit resident IDs.
_ID_WEIGHTS = (7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2)
_ID_CHECK_CHARS = "10X98765432"

_TYPE_PRIORITY = {ID_CARD: 0, EMAIL: 1, PHONE_INTL: 2, MOBILE: 3}


@dataclass(frozen=True)
class PiiFinding:
    """A detected PII span plus the masked replacement for it."""

    type: str
    start: int
    end: int
    masked: str


def _is_valid_id_card(number: str) -> bool:
    """Validate the GB 11643 checksum of an 18-digit resident ID number."""
    total = sum(int(char) * weight for char, weight in zip(number[:17], _ID_WEIGHTS))
    return _ID_CHECK_CHARS[total % 11] == number[17].upper()


def _mask_mobile(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    return f"{digits[:3]}****{digits[-4:]}"


def _mask_phone_intl(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    return f"+{digits[:2]}****{digits[-4:]}"


def _mask_email(value: str) -> str:
    local, _, domain = value.partition("@")
    return f"{local[:1]}***@{domain}"


def _mask_id_card(value: str) -> str:
    return f"{value[:6]}********{value[-4:]}"


def detect_pii(text: str) -> list[PiiFinding]:
    """Detect PII spans in ``text``; overlapping matches keep the longest."""
    candidates: list[PiiFinding] = []

    for match in _ID_CARD_RE.finditer(text):
        # Only checksum-valid IDs are flagged: invalid 18-digit runs (order
        # numbers, timestamps) must stay untouched and must not surface as
        # shorter nested matches either.
        if _is_valid_id_card(match.group(0)):
            candidates.append(
                PiiFinding(
                    ID_CARD, match.start(), match.end(), _mask_id_card(match.group(0))
                )
            )
    for match in _MOBILE_RE.finditer(text):
        candidates.append(
            PiiFinding(MOBILE, match.start(), match.end(), _mask_mobile(match.group(0)))
        )
    for match in _PHONE_INTL_RE.finditer(text):
        candidates.append(
            PiiFinding(
                PHONE_INTL, match.start(), match.end(), _mask_phone_intl(match.group(0))
            )
        )
    for match in _EMAIL_RE.finditer(text):
        candidates.append(
            PiiFinding(EMAIL, match.start(), match.end(), _mask_email(match.group(0)))
        )

    selected: list[PiiFinding] = []
    for finding in sorted(
        candidates,
        key=lambda f: (-(f.end - f.start), f.start, _TYPE_PRIORITY[f.type]),
    ):
        if not any(
            finding.start < kept.end and kept.start < finding.end for kept in selected
        ):
            selected.append(finding)
    return sorted(selected, key=lambda f: f.start)


def scrub_text_mapped(text: str) -> tuple[str, dict[str, str]]:
    """Scrub ``text`` and also return the masked -> original mapping."""
    findings = detect_pii(text)
    mapping = {
        finding.masked: text[finding.start : finding.end] for finding in findings
    }
    scrubbed = text
    for finding in sorted(findings, key=lambda f: f.start, reverse=True):
        scrubbed = scrubbed[: finding.start] + finding.masked + scrubbed[finding.end :]
    return scrubbed, mapping


def scrub_text(text: str) -> str:
    """Return ``text`` with detected PII replaced by format-preserving masks."""
    return scrub_text_mapped(text)[0]


def restore_text(text: str, mapping: dict[str, str]) -> str:
    """Put original values back wherever their masks survived a round-trip."""
    for masked, original in mapping.items():
        if masked in text:
            text = text.replace(masked, original)
    return text


def scrub_resume_payload(content):
    """Recursively scrub string leaves of str/dict/list/tuple payloads.

    The input structure is never mutated; non-string leaves (numbers,
    booleans, ``None``) are returned as-is.
    """
    if isinstance(content, str):
        return scrub_text(content)
    if isinstance(content, dict):
        return {key: scrub_resume_payload(value) for key, value in content.items()}
    if isinstance(content, list):
        return [scrub_resume_payload(item) for item in content]
    if isinstance(content, tuple):
        return tuple(scrub_resume_payload(item) for item in content)
    return content
