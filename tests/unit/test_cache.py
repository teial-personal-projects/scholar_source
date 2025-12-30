"""
Unit tests for cache.py

Tests the course analysis caching functionality.
"""

import pytest
from unittest.mock import Mock, patch, mock_open
from backend.cache import (
    _compute_config_hash,
    _generate_cache_key,
    get_cached_analysis,
    store_cached_analysis
)


class TestComputeConfigHash:
    """Test config hash computation."""

    def test_compute_hash_with_existing_files(self, tmp_path):
        """Should compute hash from config files."""
        # Create temporary config files
        agents_file = tmp_path / "agents.yaml"
        tasks_file = tmp_path / "tasks.yaml"

        agents_file.write_text("agent_config: test")
        tasks_file.write_text("task_config: test")

        with patch('backend.cache.AGENTS_CONFIG_PATH', agents_file):
            with patch('backend.cache.TASKS_CONFIG_PATH', tasks_file):
                hash1 = _compute_config_hash()
                hash2 = _compute_config_hash()

                # Hash should be consistent
                assert hash1 == hash2
                assert len(hash1) == 16  # First 16 chars of SHA256

    def test_compute_hash_changes_with_content(self, tmp_path):
        """Should produce different hash when config content changes."""
        agents_file = tmp_path / "agents.yaml"
        tasks_file = tmp_path / "tasks.yaml"

        agents_file.write_text("agent_config: test1")
        tasks_file.write_text("task_config: test")

        with patch('backend.cache.AGENTS_CONFIG_PATH', agents_file):
            with patch('backend.cache.TASKS_CONFIG_PATH', tasks_file):
                hash1 = _compute_config_hash()

                # Modify agents file
                agents_file.write_text("agent_config: test2")
                hash2 = _compute_config_hash()

                # Hash should be different
                assert hash1 != hash2

    def test_compute_hash_with_missing_files(self):
        """Should handle missing config files gracefully."""
        with patch('backend.cache.AGENTS_CONFIG_PATH', Mock(exists=Mock(return_value=False))):
            with patch('backend.cache.TASKS_CONFIG_PATH', Mock(exists=Mock(return_value=False))):
                hash_result = _compute_config_hash()

                # Should still produce a hash
                assert isinstance(hash_result, str)
                assert len(hash_result) == 16


class TestGenerateCacheKey:
    """Test cache key generation."""

    def test_cache_key_from_course_url(self):
        """Should generate key from course URL."""
        inputs = {"course_url": "https://ocw.mit.edu/courses/math"}
        config_hash = "test_hash_12345"

        key = _generate_cache_key(inputs, config_hash)

        assert isinstance(key, str)
        assert len(key) == 64  # SHA256 hex digest

    def test_cache_key_includes_config_hash(self):
        """Should include config hash in key generation."""
        inputs = {"course_url": "https://example.com"}

        key1 = _generate_cache_key(inputs, "hash1")
        key2 = _generate_cache_key(inputs, "hash2")

        # Different config hashes should produce different keys
        assert key1 != key2

    def test_cache_key_from_book_info(self):
        """Should generate key from book title and author."""
        inputs = {
            "book_title": "Introduction to Algorithms",
            "book_author": "Cormen"
        }
        config_hash = "test_hash"

        key = _generate_cache_key(inputs, config_hash)

        assert isinstance(key, str)

    def test_cache_key_from_isbn(self):
        """Should generate key from ISBN."""
        inputs = {"isbn": "978-0262046305"}
        config_hash = "test_hash"

        key = _generate_cache_key(inputs, config_hash)

        assert isinstance(key, str)

    def test_cache_key_normalizes_topics(self):
        """Should normalize topics list for consistent hashing."""
        inputs1 = {
            "course_url": "https://example.com",
            "topics_list": "algorithms, data structures, sorting"
        }
        inputs2 = {
            "course_url": "https://example.com",
            "topics_list": "sorting, algorithms, data structures"  # Different order
        }
        config_hash = "test_hash"

        key1 = _generate_cache_key(inputs1, config_hash)
        key2 = _generate_cache_key(inputs2, config_hash)

        # Keys should be the same (topics are sorted)
        assert key1 == key2

    def test_cache_key_normalizes_resource_types(self):
        """Should normalize resource types for consistent hashing."""
        inputs1 = {
            "course_url": "https://example.com",
            "desired_resource_types": ["textbooks", "videos"]
        }
        inputs2 = {
            "course_url": "https://example.com",
            "desired_resource_types": ["videos", "textbooks"]  # Different order
        }
        config_hash = "test_hash"

        key1 = _generate_cache_key(inputs1, config_hash)
        key2 = _generate_cache_key(inputs2, config_hash)

        # Keys should be the same (resource types are sorted)
        assert key1 == key2

    def test_cache_key_handles_empty_inputs(self):
        """Should handle empty inputs dict."""
        inputs = {}
        config_hash = "test_hash"

        key = _generate_cache_key(inputs, config_hash)

        assert isinstance(key, str)
        assert len(key) == 64


class TestGetCachedAnalysis:
    """Test retrieving cached analysis."""

    def test_bypass_cache_returns_none(self, mock_supabase):
        """Should return None if bypass_cache is True."""
        inputs = {"course_url": "https://example.com"}

        result = get_cached_analysis(inputs, bypass_cache=True)

        assert result is None

    def test_cache_miss_returns_none(self, mock_supabase):
        """Should return None if cache entry not found."""
        inputs = {"course_url": "https://example.com"}

        # Mock cache table to return no results
        mock_supabase.cache_data = {}

        result = get_cached_analysis(inputs)

        assert result is None

    def test_cache_hit_returns_results(self, mock_supabase, mocker):
        """Should return cached results if found and valid."""
        from datetime import datetime, timezone, timedelta

        inputs = {"course_url": "https://example.com"}

        # Mock config hash
        mocker.patch('backend.cache._compute_config_hash', return_value="test_hash")
        mocker.patch('backend.cache._generate_cache_key', return_value="cache_key_123")

        # Add cache entry
        mock_supabase.cache_data["analysis:cache_key_123"] = {
            "cache_key": "analysis:cache_key_123",
            "config_hash": "test_hash",
            "cache_type": "analysis",
            "inputs": inputs,
            "results": {
                "textbook_info": {"title": "Test Book", "author": "Test Author"},
                "topics": ["algorithms", "data structures"]
            },
            "cached_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        }

        result = get_cached_analysis(inputs, cache_type="analysis")

        assert result is not None
        assert "textbook_info" in result
        assert result["textbook_info"]["title"] == "Test Book"

    def test_cache_invalidated_on_config_change(self, mock_supabase, mocker):
        """Should invalidate cache if config hash doesn't match."""
        from datetime import datetime, timezone, timedelta

        inputs = {"course_url": "https://example.com"}

        # Mock config hash to return different value than cached
        mocker.patch('backend.cache._compute_config_hash', return_value="new_hash")
        mocker.patch('backend.cache._generate_cache_key', return_value="cache_key_123")

        # Add cache entry with old config hash
        mock_supabase.cache_data["analysis:cache_key_123"] = {
            "cache_key": "analysis:cache_key_123",
            "config_hash": "old_hash",  # Different from current
            "cache_type": "analysis",
            "inputs": inputs,
            "results": {"textbook_info": {}},
            "cached_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        }

        result = get_cached_analysis(inputs, cache_type="analysis")

        # Should not return cached result (config mismatch)
        assert result is None

    def test_cache_expired_returns_none(self, mock_supabase, mocker):
        """Should return None if cache entry has expired."""
        from datetime import datetime, timezone, timedelta

        inputs = {"course_url": "https://example.com"}

        mocker.patch('backend.cache._compute_config_hash', return_value="test_hash")
        mocker.patch('backend.cache._generate_cache_key', return_value="cache_key_123")
        mocker.patch('backend.cache.COURSE_ANALYSIS_TTL_DAYS', 30)

        # Add expired cache entry (31 days old)
        mock_supabase.cache_data["analysis:cache_key_123"] = {
            "cache_key": "analysis:cache_key_123",
            "config_hash": "test_hash",
            "cache_type": "analysis",
            "inputs": inputs,
            "results": {"textbook_info": {}},
            "cached_at": (datetime.now(timezone.utc) - timedelta(days=31)).isoformat()
        }

        result = get_cached_analysis(inputs, cache_type="analysis")

        # Should not return expired cache
        assert result is None


class TestStoreCachedAnalysis:
    """Test storing analysis to cache."""

    def test_store_analysis_creates_entry(self, mock_supabase, mocker):
        """Should create cache entry with correct data."""
        inputs = {"course_url": "https://example.com"}
        results = {
            "textbook_info": {"title": "Test Book"},
            "topics": ["algorithms"]
        }

        mocker.patch('backend.cache._compute_config_hash', return_value="test_hash")
        mocker.patch('backend.cache._generate_cache_key', return_value="cache_key_123")

        store_cached_analysis(inputs, results, cache_type="analysis")

        # Check cache was stored
        assert "analysis:cache_key_123" in mock_supabase.cache_data
        entry = mock_supabase.cache_data["analysis:cache_key_123"]
        assert entry["results"] == results
        assert entry["config_hash"] == "test_hash"

    def test_store_analysis_upserts_existing(self, mock_supabase, mocker):
        """Should update existing cache entry."""
        inputs = {"course_url": "https://example.com"}

        mocker.patch('backend.cache._compute_config_hash', return_value="test_hash")
        mocker.patch('backend.cache._generate_cache_key', return_value="cache_key_123")

        # Store initial
        store_cached_analysis(inputs, {"old": "data"}, cache_type="analysis")

        # Store again (upsert)
        store_cached_analysis(inputs, {"new": "data"}, cache_type="analysis")

        # Should have updated entry
        entry = mock_supabase.cache_data["analysis:cache_key_123"]
        assert entry["results"] == {"new": "data"}

    def test_store_analysis_different_cache_types(self, mock_supabase, mocker):
        """Should store analysis and full results separately."""
        inputs = {"course_url": "https://example.com"}

        mocker.patch('backend.cache._compute_config_hash', return_value="test_hash")
        mocker.patch('backend.cache._generate_cache_key', return_value="cache_key_123")

        # Store analysis
        store_cached_analysis(inputs, {"textbook": "info"}, cache_type="analysis")

        # Store full results
        store_cached_analysis(inputs, {"resources": []}, cache_type="full")

        # Should have two separate entries
        assert "analysis:cache_key_123" in mock_supabase.cache_data
        assert "full:cache_key_123" in mock_supabase.cache_data


class TestCacheEdgeCases:
    """Test edge cases and error handling."""

    def test_cache_handles_supabase_error(self, mocker):
        """Should handle Supabase errors gracefully."""
        inputs = {"course_url": "https://example.com"}

        # Mock Supabase to raise error
        mock_client = Mock()
        mock_client.table.side_effect = Exception("Database connection error")
        mocker.patch('backend.cache.get_supabase_client', return_value=mock_client)

        # Should not raise exception
        result = get_cached_analysis(inputs)

        assert result is None

    def test_cache_handles_invalid_cached_data(self, mock_supabase, mocker):
        """Should handle corrupted cache data gracefully."""
        inputs = {"course_url": "https://example.com"}

        mocker.patch('backend.cache._compute_config_hash', return_value="test_hash")
        mocker.patch('backend.cache._generate_cache_key', return_value="cache_key_123")

        # Add invalid cache entry (missing required fields)
        mock_supabase.cache_data["analysis:cache_key_123"] = {
            "cache_key": "analysis:cache_key_123",
            # Missing config_hash, results, cached_at
        }

        # Should handle gracefully
        result = get_cached_analysis(inputs)

        assert result is None
