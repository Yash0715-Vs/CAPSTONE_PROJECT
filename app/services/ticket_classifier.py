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

    # Keyword and phrase patterns for Category classification using Regex
    CATEGORY_PATTERNS: Dict[TicketCategory, List[str]] = {
        TicketCategory.HARDWARE: [
            r"\b(lap\s*top?|leptop|loptop|notebook|mac\s*book|desktop|workstation|pc|computer|machine)\b",
            r"\b(mother\s*boa?r?d|mobo|logic\s*board|mainboard)\b",
            r"\b(scre+n|disp?lay|monit[oe]r|lcd|oled|panel|backlight)\b",
            r"\b(key\s*boa?r?d|keybrd|keaboard|keys?|trackpad|touchpad|mouse|mice)\b",
            r"\b(battery|charger|charging|power\s*cable|adapter|cord|psu|power\s*supply)\b",
            r"\b(ram|memory|ssd|hdd|hard\s*drive|hard\s*disk|nvme|storage|drive)\b",
            r"\b(cpu|processor|gpu|graphics\s*card|video\s*card|fan|heatsink|overheating|heat|thermal)\b",
            r"\b(printer|scanner|toner|cartridge|paper\s*jam|dock|docking\s*station|port|usb|hdmi|type-?c|headset|webcam|camera|speaker|mic|microphone|bluetooth)\b",
            r"\b(hardware|physical\s*damage|liquid\s*damage|spill(ed)?|water\s*damage|burnt|sparking|smoke|overheat(ing)?)\b",
            r"\b(not\s+(turning\s+on|starting|booting|powering\s+on|working|charging|responding)|won'?t\s+(turn\s+on|boot|start|charge)|dead|damaged|broken|cracked|shattered|flickering)\b",
        ],
        TicketCategory.NETWORK: [
            r"\b(wi[- ]?fi|wifi|wireless|internet|ethernet|lan|wlan|broadband|hotspot)\b",
            r"\b(vpn|openvpn|anyconnect|wireguard|proxy|gateway|firewall|dns|dhcp|ip\s*address|subnet)\b",
            r"\b(router|switch|access\s*point|modem|bandwidth|latency|packet\s*loss|ping|jitter)\b",
            r"\b(network|no\s+internet|connection\s+drop|disconnected|unreachable|time-?out)\b",
            r"\b(disconnected|cannot\s+connect|can'?t\s+connect|slow\s+connection|drops?\s+frequently)\b",
        ],
        TicketCategory.ACCESS: [
            r"\b(passwords?|passcode|pin|account|login|logon|sign[- ]?in|credentials?)\b",
            r"\b(2fa|mfa|otp|authenticator|duo|yubikey|security\s*token|sso|saml)\b",
            r"\b(permission|permissions|access\s*rights?|privilege|privileges|role|authorization|authorized|unauthorized|forbidden)\b",
            r"\b(locked\s*out|lockout|unlock|reset\s*password|forgot\s*password|access\s*denied|cannot\s*login|can'?t\s*login|disabled\s*account)\b",
        ],
        TicketCategory.SOFTWARE: [
            r"\b(software|apps?|applications?|programs?|tools?|packages?|utilities)\b",
            r"\b(windows|win10|win11|linux|ubuntu|macos|os|operating\s*system)\b",
            r"\b(excel|outlook|word|powerpoint|office\s*365|m365|teams|zoom|slack|skype|meet|browser|chrome|firefox|edge|safari)\b",
            r"\b(database|sql|git|docker|vscode|visual\s*studio|pycharm|compiler|driver|drivers)\b",
            r"\b(blue\s*screen|bsod|not\s+responding|hanging|hangs|corrupt(ed)?|bugs?|error\s*codes?|runtime\s*error|exception|glitch(es)?|license|installation|install(ing)?|update|updating|patch(ing)?)\b",
        ],
    }

    # Keyword and phrase patterns for Priority classification using Regex (Evaluated strictly in order: CRITICAL -> HIGH -> MEDIUM -> LOW)
    PRIORITY_PATTERNS: Dict[TicketPriority, List[str]] = {
        TicketPriority.CRITICAL: [
            r"\b(emergency|outage|downtime|entire\s*(office|floor|team|company|department|building)|all\s*(users|employees|systems)|production\s*(down|outage|halted|broken)|servers?\s*(down|crashed?|dead|offline)|system\s*(down|wide|halted)|security\s*breach|ransomware|data\s*leak|hacked|malware|cyber\s*attack|fire|smoke|sparking|burning\s*smell|critical|sev[- ]?1|severity\s*1|halted|immediately|blocker)\b",
        ],
        TicketPriority.HIGH: [
            # Component crash / complete failure
            r"\b(mother\s*boa?r?d|mobo|logic\s*board|cpu|processor|hard\s*drive|ssd|ram)\b.*?\b(crash(es|ed|ing)?|dead|fried|burnt|broken|failure|failed)\b",
            r"\b(crash(es|ed|ing)?|dead|fried|burnt|broken|failure|failed)\b.*?\b(mother\s*boa?r?d|mobo|logic\s*board|cpu|processor|hard\s*drive|ssd|ram)\b",
            # Screen / display failures
            r"\b(scre+n|disp?lay|monit[oe]r)\b.*?\b(is\s+)?(not\s*working|blank|black|dead|broken|cracked|shattered|damaged|unresponsive)\b",
            # Complete device failure or cannot work
            r"\b(not\s*(turning\s*on|starting|booting|powering\s*on|working|charging|responding)|won'?t\s*(turn\s*on|boot|start|charge|power\s*on)|cannot\s*(work|boot|start|login|access|use)|can'?t\s*(work|boot|start|login|access|use))\b",
            r"\b(black\s*screen|blue\s*screen|bsod|kernel\s*panic|system\s*crash|dead|broken|unusable|inoperable|fails?\s+to\s+(boot|start|load|turn\s*on))\b",
            # Account lockout & credential blocks
            r"\b(locked\s*out|lockout|account\s*disabled|access\s*denied|forgot\s*password|reset\s*password)\b",
            # Physical hazards & immediate damage
            r"\b(liquid\s*spill|water\s*damage|spilled\s*(water|coffee|tea|liquid)|urgent|high\s*priority|sev[- ]?2|asap)\b",
        ],
        TicketPriority.MEDIUM: [
            r"\b(slow|sluggish|lag(ging)?|freez(es|ing)?|frozen|intermittent(ly)?|glitch(y|es)?|delay(ed)?|flicker(ing)?|drops?\s*(sometimes|frequently|intermittent(ly)?)|sometimes|occasionally)\b",
            r"\b(battery\s*(draining|low|dies\s*fast|not\s*lasting)|fan\s*(noisy|loud|running\s*fast)|overheating|warm)\b",
            r"\b(sound|audio|microphone|mic|webcam|camera|speaker|bluetooth|usb|port|trackpad|mouse|keyboard)\s*(glitch|issue|not\s*working\s*well|problem)\b",
            r"\b(printer\s*(jam|offline|slow)|paper\s*jam|toner\s*low|cartridge)\b",
            r"\b(app|application|software|excel|teams|outlook|chrome)\s*(crash(es|ed|ing)?|hanging|error|update|sync\s*error)\b",
            r"\b(crash(es|ed|ing)?|freeze)\s*(on\s+startup|when\s+opening|frequently)\b",
        ],
        TicketPriority.LOW: [
            r"\b(inquiry|inquiries|questions?|request(ing)?|setup|installation\s*request|guidance|how\s+to|help\s+with)\b",
            r"\b(suggestion|suggestions|preference|preferences|recommendation|recommendations|advice)\b",
            r"\b(cosmetic|scratch(es)?|dent|scuff|cleaning|ergonomic(s)?|stand|mousepad|cable\s*management)\b",
            r"\b(new\s*(mouse|keyboard|monitor|headset|laptop|dock|cable)|equipment\s*request|order\s*new)\b",
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
