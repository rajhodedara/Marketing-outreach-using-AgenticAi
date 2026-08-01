from __future__ import annotations
import re
from typing import List, Tuple, Dict, Any

class PIIMasker:
    """PII Masker using regex patterns."""

    def __init__(self):
        # The order of rules matters. SSN must run before Phone to avoid conflicts.
        self.rules = [
            ("SSN", r"\d{3}-\d{2}-\d{4}", "[SSN_REDACTED]"),
            ("Email", r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "[EMAIL_REDACTED]"),
            ("US Phone", r"(\+?1[-.]?\s?)?\(?\d{3}\)?[-.]?\s?\d{3}[-.]?\s?\d{4}", "[PHONE_REDACTED]"),
            ("Intl Phone", r"\+\d{1,3}[-\s]?\d{1,4}[-\s]?\d{1,4}[-\s]?\d{1,9}", "[PHONE_REDACTED]"),
            ("Credit Card", r"\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}", "[CC_REDACTED]"),
            ("IP Address", r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", "[IP_REDACTED]"),
        ]
        
        self.compiled_rules = [(name, re.compile(pattern), replacement) for name, pattern, replacement in self.rules]

    def mask_text(self, text: str) -> Tuple[str, List[Dict[str, Any]]]:
        if not text:
            return text, []

        detections = []
        masked_text = text

        for name, pattern, replacement in self.compiled_rules:
            # Find all matches before replacing, so positions reflect current state
            for match in pattern.finditer(masked_text):
                detections.append({
                    "type": name,
                    "original": match.group(0),
                    "position": (match.start(), match.end()),
                    "replacement": replacement
                })
            
            masked_text = pattern.sub(replacement, masked_text)

        return masked_text, detections

    def mask_texts(self, texts: List[str]) -> List[Tuple[str, List[Dict[str, Any]]]]:
        return [self.mask_text(t) for t in texts]
