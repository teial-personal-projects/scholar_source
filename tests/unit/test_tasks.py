"""Unit tests for shared task-output handling."""

from backend.tasks import _extract_crew_error


def test_extract_crew_error_returns_top_level_error() -> None:
    """A crew-level error at the start of output should fail the job."""
    assert _extract_crew_error("\nERROR: Could not access the course\n") == (
        "Could not access the course"
    )


def test_extract_crew_error_ignores_resource_error() -> None:
    """An error inside one resource should be handled by resource filtering."""
    markdown_content = """
**1. Valid Resource**
- **Link:** https://example.com/valid
- **What it covers:** Good content

**2. Error Resource**
- **Link:** https://broken.com/error
- **What it covers:** ERROR: Could not fetch https://broken.com/error
"""

    assert _extract_crew_error(markdown_content) is None
