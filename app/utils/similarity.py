import math
from typing import Dict, Union, Sequence

def compute_cosine_similarity(vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
    """
    Computes cosine similarity between two feature weight maps using pure standard library math.
    Ponytail: zero external ML dependencies required for vector dot product and norms.
    """
    if not vec1 or not vec2:
        return 0.0

    common_keys = set(vec1.keys()).intersection(set(vec2.keys()))
    if not common_keys:
        return 0.0

    dot = sum(float(vec1[k]) * float(vec2[k]) for k in common_keys)
    norm1 = math.sqrt(sum(float(v) ** 2 for v in vec1.values()))
    norm2 = math.sqrt(sum(float(v) ** 2 for v in vec2.values()))

    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0

    return float(dot / (norm1 * norm2))

def compute_list_cosine_similarity(list1: Sequence[float], list2: Sequence[float]) -> float:
    """Computes cosine similarity between two equal-length numerical feature lists."""
    if not list1 or not list2 or len(list1) != len(list2):
        return 0.0
    dot = sum(a * b for a, b in zip(list1, list2))
    norm1 = math.sqrt(sum(a * a for a in list1))
    norm2 = math.sqrt(sum(b * b for b in list2))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return float(dot / (norm1 * norm2))

