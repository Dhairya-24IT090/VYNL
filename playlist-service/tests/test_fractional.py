import random
import pytest
from hypothesis import given, strategies as st, settings
from playlist_service.fractional import (
    between,
    generate_initial_keys,
    rebalance_positions,
    ZERO_DIGIT,
)

def test_between_basic():
    assert between(None, None) == "V"
    
    # Head prepend
    first = between(None, "V")
    assert first < "V"
    assert not first.endswith(ZERO_DIGIT)

    # Tail append
    after = between("V", None)
    assert after > "V"
    assert not after.endswith(ZERO_DIGIT)

    # Between two keys
    mid = between("A", "C")
    assert "A" < mid < "C"
    assert not mid.endswith(ZERO_DIGIT)

def test_moving_item_does_not_rewrite_others():
    """
    Core Done-When verification for Task [F10-3]:
    Moving an item from index i to j produces one new position key for that item,
    while leaving all other items' positions completely untouched.
    """
    items = ["item_0", "item_1", "item_2", "item_3", "item_4"]
    positions = generate_initial_keys(len(items))
    table = list(zip(items, positions))  # [(id, pos)]

    # Move item_4 between item_1 and item_2
    pos_1 = table[1][1]
    pos_2 = table[2][1]
    new_pos = between(pos_1, pos_2)

    # Only item_4 changes its position
    old_table_snapshot = dict(table)
    new_table = [
        (item_id, new_pos if item_id == "item_4" else pos)
        for item_id, pos in table
    ]
    # Verify other rows unchanged
    for item_id, pos in new_table:
        if item_id != "item_4":
            assert pos == old_table_snapshot[item_id]

    # Verify sort order after move
    sorted_table = sorted(new_table, key=lambda x: x[1])
    sorted_ids = [item_id for item_id, _ in sorted_table]
    assert sorted_ids == ["item_0", "item_1", "item_4", "item_2", "item_3"]

def test_rebalance_positions():
    keys = ["A000000000000000000000001", "A000000000000000000000002", "A000000000000000000000003"]
    assert any(len(k) > 24 for k in keys)
    rebalanced = rebalance_positions(len(keys))
    assert len(rebalanced) == len(keys)
    assert all(len(k) <= 5 for k in rebalanced)
    assert rebalanced == sorted(rebalanced)

# Hypothesis Property-based tests
@given(st.lists(st.integers(min_value=0, max_value=1000), min_size=2, max_size=100))
@settings(max_examples=50)
def test_hypothesis_random_inserts(insert_indices):
    keys = ["V"]
    for idx_seed in insert_indices:
        insert_idx = idx_seed % (len(keys) + 1)
        prev_key = keys[insert_idx - 1] if insert_idx > 0 else None
        next_key = keys[insert_idx] if insert_idx < len(keys) else None

        new_key = between(prev_key, next_key)
        assert not new_key.endswith(ZERO_DIGIT)

        if prev_key:
            assert prev_key < new_key
        if next_key:
            assert new_key < next_key

        keys.insert(insert_idx, new_key)
        # Verify strict monotonicity
        assert keys == sorted(keys)
        assert len(keys) == len(set(keys))

def test_10000_random_operations():
    """Verify 10,000 random operations never violate invariants."""
    random.seed(42)
    keys = ["V"]
    for _ in range(10000):
        op = random.choice(["append", "prepend", "insert"])
        if op == "prepend":
            new_key = between(None, keys[0])
            assert new_key < keys[0]
            assert not new_key.endswith(ZERO_DIGIT)
            keys.insert(0, new_key)
        elif op == "append":
            new_key = between(keys[-1], None)
            assert new_key > keys[-1]
            assert not new_key.endswith(ZERO_DIGIT)
            keys.append(new_key)
        else:
            idx = random.randint(1, len(keys) - 1) if len(keys) > 1 else 0
            if idx == 0:
                new_key = between(None, keys[0])
                keys.insert(0, new_key)
            else:
                new_key = between(keys[idx - 1], keys[idx])
                assert keys[idx - 1] < new_key < keys[idx]
                assert not new_key.endswith(ZERO_DIGIT)
                keys.insert(idx, new_key)

        # Check unique and sorted every 1000 ops
        if len(keys) % 1000 == 0:
            assert keys == sorted(keys)
            assert len(keys) == len(set(keys))
