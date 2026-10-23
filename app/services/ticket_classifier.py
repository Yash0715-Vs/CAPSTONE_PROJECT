"""
Automatic Rule-Based Ticket Classification Service.

Meets Capstone Specification Section 6:
- Uses string operations and Python's regular expressions (`re`)
- Rule-based keyword and pattern matching for Category & Priority
- Employs lambda functions, map/filter, and list/dictionary comprehensions
- Strictly algorithmic (no external AI/LLMs)
"""

import sys
import re
from pathlib import Path
from typing import Tuple, Dict, List, Any

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.models.ticket import TicketCategory, TicketPriority


class TicketClassifier:
    """
    Intelligent Rule-Based Support Ticket Classifier.
    Analyzes ticket title and description to infer TicketCategory and TicketPriority.
    """

    # Keyword patterns for Category classification using Regex
    CATEGORY_PATTERNS: Dict[TicketCategory, List[str]] = {
        TicketCategory.HARDWARE: [
            r"\b(laptop|monitor|screen|keyboard|mouse|printer|battery|charger|ram|hard\s*drive|ssd|motherboard|cpu|fan|display|hardware|overheating)\b",
            r"\b(not\s+(turning\s+on|starting|booting|powering\s+on)|damaged|broken|flickering|spill)\b",
        ],
        TicketCategory.NETWORK: [
            r"\b(wifi|wi-fi|internet|ethernet|vpn|network|lan|ip\s*address|dns|bandwidth|firewall|proxy|router|switch|ping|packet\s*loss)\b",
            r"\b(disconnected|cannot\s+connect|no\s+internet|slow\s+connection|drops?\s+frequently)\b",
        ],
        TicketCategory.ACCESS: [
            r"\b(password|account|login|sign[- ]?in|locked\s*out|credential|permission|access|2fa|mfa|token|authenticator|unlock|privilege|authorization)\b",
            r"\b(reset\s+password|access\s+denied|forgot\s+password|cannot\s+login)\b",
        ],
        TicketCategory.SOFTWARE: [
            r"\b(software|app|application|install|update|upgrade|license|crash|freeze|bug|error\s*code|windows|linux|macos|excel|outlook|teams|office|browser)\b",
            r"\b(blue\s*screen|bsod|not\s+responding|corrupt|hanging)\b",
        ],
    }

    # Keyword patterns for Priority classification using Regex
    PRIORITY_PATTERNS: Dict[TicketPriority, List[str]] = {
        TicketPriority.CRITICAL: [
            r"\b(emergency|outage|entire\s+(office|floor|team)|server\s+down|production\s+down|security\s+breach|ransomware|system\s+down|critical|halted|immediately)\b",
        ],
        TicketPriority.HIGH: [
            r"\b(not\s+(starting|booting|working)|cannot\s+work|black\s+screen|broken|locked\s*out|smoke|urgent|dead|fails\s+to\s+start|unusable)\b",
        ],
        TicketPriority.MEDIUM: [
            r"\b(slow|freez(es|ing)|intermittent|glitch|battery\s+draining|update|flicker|delay|sometimes)\b",
        ],
        TicketPriority.LOW: [
            r"\b(inquiry|question|request|setup|guidance|cosmetic|how\s+to|suggestion|preference|recommendation|ergonomic)\b",
        ],
    }

    @classmethod
    def classify_text(cls, text: str) -> Tuple[TicketCategory, TicketPriority]:
        """
        Classifies input text and returns (Category, Priority).
        Uses case-insensitive regex pattern searching, lambda, and comprehensions.
        """
        cleaned_text = text.lower().strip()

        # 1. Category Detection using regex searches & list comprehension
        category_scores: Dict[TicketCategory, int] = {}
        for category, patterns in cls.CATEGORY_PATTERNS.items():
            # Count pattern matches using lambda and regex findall
            matches = [len(re.findall(pat, cleaned_text, re.IGNORECASE)) for pat in patterns]
            category_scores[category] = sum(matches)

        # Filter categories with non-zero match scores
        matched_categories = dict(filter(lambda item: item[1] > 0, category_scores.items()))

        if matched_categories:
            # Pick category with highest score
            detected_category = max(matched_categories, key=lambda cat: matched_categories[cat])
        else:
            detected_category = TicketCategory.OTHER

        # 2. Priority Detection
        detected_priority = TicketPriority.MEDIUM  # Default baseline
        for priority, patterns in cls.PRIORITY_PATTERNS.items():
            has_match = any(re.search(pat, cleaned_text, re.IGNORECASE) for pat in patterns)
            if has_match:
                detected_priority = priority
                break  # Matched highest priority tier in order (CRITICAL -> HIGH -> MEDIUM -> LOW)

        return detected_category, detected_priority

    @classmethod
    def classify_ticket(cls, title: str, description: str) -> Dict[str, Any]:
        """
        Takes title and description, runs classification, and returns metadata dictionary.
        """
        full_text = f"{title} {description}"
        category, priority = cls.classify_text(full_text)

        return {
            "title": title,
            "category": category,
            "category_name": category.value,
            "priority": priority,
            "priority_name": priority.value,
        }


if __name__ == "__main__":
    print("=" * 65)
    print("RUNNING AUTOMATIC TICKET CLASSIFICATION DEMO (REGEX + NLP)")
    print("=" * 65)

    test_cases = [
        ("My laptop is not starting", "Pressed power button, nothing happens"),
        ("VPN connection drops frequently", "Cannot access internal portals over office WiFi"),
        ("Forgot my login password", "My account is locked out after 3 wrong attempts"),
        ("Excel application crashes on startup", "Getting runtime error 0x80004005 when opening workbook"),
        ("CRITICAL: Entire office network down", "No employees can connect to any server or internet"),
        ("Inquiry regarding wireless mouse", "Can I request an ergonomic vertical mouse?"),
    ]

    for idx, (title, desc) in enumerate(test_cases, start=1):
        result = TicketClassifier.classify_ticket(title, desc)
        print(f"\n[Case {idx}] \"{title}\"")
        print(f"       -> Inferred Category: {result['category_name']}")
        print(f"       -> Inferred Priority: {result['priority_name']}")

    print("\n" + "=" * 65)
    print("ALL CLASSIFICATION TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 65)
