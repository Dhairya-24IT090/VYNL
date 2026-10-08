import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import Dict

def compute_cosine_similarity(vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
    # Ensure both vectors have the same keys
    all_keys = list(set(vec1.keys()).union(set(vec2.keys())))
    if not all_keys:
        return 0.0

    v1 = np.array([vec1.get(k, 0.0) for k in all_keys]).reshape(1, -1)
    v2 = np.array([vec2.get(k, 0.0) for k in all_keys]).reshape(1, -1)

    return float(cosine_similarity(v1, v2)[0][0])
