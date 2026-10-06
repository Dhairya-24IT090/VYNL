"""
Fractional Indexing implementation over Base-62 digits (0-9A-Za-z).
Ensures pure string collation order matches sequence order (COLLATE "C" in PostgreSQL).
"""
import string
from typing import List, Optional

# Base-62 alphabet in strict ASCII sort order: '0'-'9' (48-57), 'A'-'Z' (65-90), 'a'-'z' (97-122)
BASE62_DIGITS = string.digits + string.ascii_uppercase + string.ascii_lowercase
BASE62_MAP = {c: i for i, c in enumerate(BASE62_DIGITS)}
BASE = len(BASE62_DIGITS)  # 62

ZERO_DIGIT = BASE62_DIGITS[0]  # '0'
MID_DIGIT = BASE62_DIGITS[BASE // 2]  # 'V'

def between(a: Optional[str], b: Optional[str]) -> str:
    """
    Computes a fractional index string between a and b such that a < result < b.
    - a is None: generate key before b
    - b is None: generate key after a
    - both None: return default middle key ('V')
    - Invariant: result never ends with '0'
    """
    if a is not None and b is not None and a >= b:
        raise ValueError(f"Precondition failed: a ({a}) must be strictly less than b ({b})")

    # 1. Both None -> midpoint
    if a is None and b is None:
        return MID_DIGIT

    # 2. a is None: prepend before b
    if a is None:
        assert b is not None
        for i, ch in enumerate(b):
            idx = BASE62_MAP[ch]
            if idx > 1:
                mid_char = BASE62_DIGITS[idx // 2]
                res = b[:i] + mid_char
                if res.endswith(ZERO_DIGIT):
                    res = res[:-1] + "1"
                return res
            elif idx == 1:
                return b[:i] + "0" + MID_DIGIT
        # If all characters are '0'
        return b + MID_DIGIT

    # 3. b is None: append after a
    if b is None:
        assert a is not None
        if len(a) == 1:
            idx = BASE62_MAP[a[0]]
            if idx < BASE - 2:
                mid_char = BASE62_DIGITS[(idx + BASE) // 2]
                if not mid_char.endswith(ZERO_DIGIT):
                    return mid_char
        return a + MID_DIGIT

    # 4. Both a and b are specified with a < b
    # Find common prefix length
    prefix_len = 0
    min_len = min(len(a), len(b))
    while prefix_len < min_len and a[prefix_len] == b[prefix_len]:
        prefix_len += 1

    prefix = a[:prefix_len]
    char_a = a[prefix_len] if prefix_len < len(a) else None
    char_b = b[prefix_len]  # Guaranteed to exist because a < b

    if char_a is None:
        # a is a strict prefix of b: a < b
        # Any string prefix + extension where extension < b[prefix_len:] satisfies a < result < b
        extension = between(None, b[prefix_len:])
        return prefix + extension
    else:
        idx_a = BASE62_MAP[char_a]
        idx_b = BASE62_MAP[char_b]

        if idx_b - idx_a > 1:
            mid_char = BASE62_DIGITS[(idx_a + idx_b) // 2]
            res = prefix + mid_char
            if res.endswith(ZERO_DIGIT):
                res = prefix + BASE62_DIGITS[(idx_a + idx_b) // 2 + 1]
            return res
        else:
            # Adjacent characters (idx_b - idx_a == 1)
            # Find extension > a[prefix_len + 1:]
            sub_a = a[prefix_len + 1:] if prefix_len + 1 < len(a) else None
            extension = between(sub_a, None)
            return prefix + char_a + extension

def generate_initial_keys(count: int) -> List[str]:
    """Generates count evenly-spaced short keys."""
    if count <= 0:
        return []
    keys = []
    current = None
    for _ in range(count):
        current = between(current, None)
        keys.append(current)
    return keys

def rebalance_positions(count: int) -> List[str]:
    """
    Generates a new sequence of short, evenly distributed base-62 position keys
    for count items, resetting bloated keys to short characters.
    """
    return generate_initial_keys(count)
