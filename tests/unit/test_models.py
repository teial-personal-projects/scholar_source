"""
Unit tests for models.py

Tests Pydantic model validation and data transformation.
"""

import pytest
from pydantic import ValidationError
from backend.models import (
    CourseInputRequest,
    JobSubmitResponse,
    Resource,
    JobStatusResponse,
    TextbookInfo
)


class TestCourseInputRequest:
    """Test CourseInputRequest model validation."""

    def test_valid_course_url_input(self):
        """Should accept valid course URL."""
        data = {
            "course_url": "https://ocw.mit.edu/courses/math",
            "course_name": "Mathematics"
        }
        request = CourseInputRequest(**data)

        assert request.course_url == "https://ocw.mit.edu/courses/math"
        assert request.course_name == "Mathematics"
        assert request.book_title is None

    def test_valid_book_title_input(self):
        """Should accept valid book title."""
        data = {
            "book_title": "Introduction to Algorithms",
            "book_author": "Cormen, Leiserson, Rivest, Stein"
        }
        request = CourseInputRequest(**data)

        assert request.book_title == "Introduction to Algorithms"
        assert request.book_author == "Cormen, Leiserson, Rivest, Stein"
        assert request.course_url is None

    def test_empty_strings_converted_to_none(self):
        """Should convert empty strings to None."""
        data = {
            "course_url": "https://example.com",
            "book_title": "",  # Empty string
            "topics_list": "   ",  # Whitespace only
            "isbn": ""
        }
        request = CourseInputRequest(**data)

        assert request.book_title is None
        assert request.topics_list is None
        assert request.isbn is None

    def test_desired_resource_types_list(self):
        """Should accept list of resource types."""
        data = {
            "course_url": "https://example.com",
            "desired_resource_types": ["textbooks", "practice_problem_sets"]
        }
        request = CourseInputRequest(**data)

        assert len(request.desired_resource_types) == 2
        assert "textbooks" in request.desired_resource_types
        assert "practice_problem_sets" in request.desired_resource_types

    def test_excluded_sites_string(self):
        """Should accept excluded_sites as string."""
        data = {
            "course_url": "https://example.com",
            "excluded_sites": "khanacademy.org, coursera.org"
        }
        request = CourseInputRequest(**data)

        assert request.excluded_sites == "khanacademy.org, coursera.org"

    def test_bypass_cache_flag(self):
        """Should accept bypass_cache boolean flag."""
        data = {
            "course_url": "https://example.com",
            "bypass_cache": True
        }
        request = CourseInputRequest(**data)

        assert request.bypass_cache is True

    def test_bypass_cache_defaults_to_false(self):
        """Should default bypass_cache to False."""
        data = {"course_url": "https://example.com"}
        request = CourseInputRequest(**data)

        assert request.bypass_cache is False

    def test_all_fields_optional_allows_empty_object(self):
        """Should allow empty object (all fields optional)."""
        data = {}
        request = CourseInputRequest(**data)

        # All fields should be None or default
        assert request.course_url is None
        assert request.book_title is None
        assert request.bypass_cache is False

    def test_isbn_field(self):
        """Should accept ISBN."""
        data = {
            "isbn": "978-0262046305",
            "book_title": "Algorithms"
        }
        request = CourseInputRequest(**data)

        assert request.isbn == "978-0262046305"

    def test_book_pdf_path_field(self):
        """Should accept local PDF path."""
        data = {
            "book_pdf_path": "/path/to/book.pdf",
            "book_title": "Algorithms"
        }
        request = CourseInputRequest(**data)

        assert request.book_pdf_path == "/path/to/book.pdf"

    def test_book_url_field(self):
        """Should accept book URL."""
        data = {
            "book_url": "https://example.com/book.pdf",
            "book_title": "Algorithms"
        }
        request = CourseInputRequest(**data)

        assert request.book_url == "https://example.com/book.pdf"

    def test_email_field_accepted_but_ignored(self):
        """Should accept email field (for API compatibility) but not validate it."""
        data = {
            "course_url": "https://example.com",
            "email": "user@example.com"
        }
        request = CourseInputRequest(**data)

        assert request.email == "user@example.com"


class TestJobSubmitResponse:
    """Test JobSubmitResponse model."""

    def test_valid_job_submit_response(self):
        """Should create valid job submit response."""
        data = {
            "job_id": "123e4567-e89b-12d3-a456-426614174000",
            "status": "pending",
            "message": "Job created successfully"
        }
        response = JobSubmitResponse(**data)

        assert response.job_id == "123e4567-e89b-12d3-a456-426614174000"
        assert response.status == "pending"
        assert response.message == "Job created successfully"

    def test_missing_required_field_fails(self):
        """Should reject response missing required fields."""
        data = {
            "job_id": "123",
            # Missing status and message
        }

        with pytest.raises(ValidationError):
            JobSubmitResponse(**data)


class TestResource:
    """Test Resource model."""

    def test_valid_resource(self):
        """Should create valid resource."""
        data = {
            "type": "Textbook",
            "title": "Introduction to Algorithms",
            "source": "MIT Press",
            "url": "https://mitpress.mit.edu/books/introduction-algorithms",
            "description": "Comprehensive algorithms textbook"
        }
        resource = Resource(**data)

        assert resource.type == "Textbook"
        assert resource.title == "Introduction to Algorithms"
        assert resource.source == "MIT Press"
        assert resource.url == "https://mitpress.mit.edu/books/introduction-algorithms"
        assert resource.description == "Comprehensive algorithms textbook"

    def test_resource_without_description(self):
        """Should allow resource without description."""
        data = {
            "type": "Video",
            "title": "Lecture 1",
            "source": "MIT OCW",
            "url": "https://example.com/lecture1"
        }
        resource = Resource(**data)

        assert resource.description is None

    def test_missing_required_fields_fails(self):
        """Should reject resource missing required fields."""
        data = {
            "type": "Textbook",
            # Missing title, source, url
        }

        with pytest.raises(ValidationError):
            Resource(**data)

    def test_all_required_fields_present(self):
        """Should require type, title, source, and url."""
        # Missing type
        with pytest.raises(ValidationError):
            Resource(title="Title", source="Source", url="https://example.com")

        # Missing title
        with pytest.raises(ValidationError):
            Resource(type="Type", source="Source", url="https://example.com")

        # Missing source
        with pytest.raises(ValidationError):
            Resource(type="Type", title="Title", url="https://example.com")

        # Missing url
        with pytest.raises(ValidationError):
            Resource(type="Type", title="Title", source="Source")


class TestJobStatusResponse:
    """Test JobStatusResponse model."""

    def test_pending_job_status(self):
        """Should create pending job status."""
        data = {
            "job_id": "123",
            "status": "pending",
            "status_message": "Job created",
            "results": [],
            "metadata": {},
            "created_at": "2024-01-01T00:00:00Z"
        }
        response = JobStatusResponse(**data)

        assert response.status == "pending"
        assert response.results == []

    def test_completed_job_status_with_results(self):
        """Should create completed job status with results."""
        data = {
            "job_id": "123",
            "status": "completed",
            "status_message": "Job completed successfully",
            "results": [
                {
                    "type": "Textbook",
                    "title": "Algorithms",
                    "source": "MIT",
                    "url": "https://example.com",
                    "description": "Great book"
                }
            ],
            "metadata": {"resource_count": 1},
            "created_at": "2024-01-01T00:00:00Z",
            "completed_at": "2024-01-01T00:10:00Z"
        }
        response = JobStatusResponse(**data)

        assert response.status == "completed"
        assert len(response.results) == 1
        assert response.completed_at == "2024-01-01T00:10:00Z"

    def test_failed_job_status_with_error(self):
        """Should create failed job status with error."""
        data = {
            "job_id": "123",
            "status": "failed",
            "status_message": "Job failed",
            "error": "CrewAI execution error",
            "results": [],
            "metadata": {},
            "created_at": "2024-01-01T00:00:00Z"
        }
        response = JobStatusResponse(**data)

        assert response.status == "failed"
        assert response.error == "CrewAI execution error"

    def test_job_status_optional_fields(self):
        """Should allow optional fields to be None."""
        data = {
            "job_id": "123",
            "status": "running",
            "status_message": "Processing",
            "results": [],
            "metadata": {},
            "created_at": "2024-01-01T00:00:00Z"
        }
        response = JobStatusResponse(**data)

        assert response.raw_output is None
        assert response.error is None
        assert response.completed_at is None


class TestTextbookInfo:
    """Test TextbookInfo model."""

    def test_valid_textbook_info(self):
        """Should create valid textbook info."""
        data = {
            "title": "Introduction to Algorithms",
            "author": "Cormen, Leiserson, Rivest, Stein",
            "edition": "4th",
            "isbn": "978-0262046305"
        }
        textbook = TextbookInfo(**data)

        assert textbook.title == "Introduction to Algorithms"
        assert textbook.author == "Cormen, Leiserson, Rivest, Stein"
        assert textbook.edition == "4th"
        assert textbook.isbn == "978-0262046305"

    def test_textbook_info_all_optional(self):
        """Should allow all fields to be None."""
        data = {}
        textbook = TextbookInfo(**data)

        assert textbook.title is None
        assert textbook.author is None
        assert textbook.edition is None
        assert textbook.isbn is None


class TestModelSerialization:
    """Test model serialization to JSON."""

    def test_course_input_request_to_dict(self):
        """Should serialize CourseInputRequest to dict."""
        request = CourseInputRequest(
            course_url="https://example.com",
            course_name="Test Course",
            bypass_cache=True
        )
        data = request.model_dump()

        assert data['course_url'] == "https://example.com"
        assert data['course_name'] == "Test Course"
        assert data['bypass_cache'] is True

    def test_resource_to_dict(self):
        """Should serialize Resource to dict."""
        resource = Resource(
            type="Textbook",
            title="Test Book",
            source="Test Source",
            url="https://example.com"
        )
        data = resource.model_dump()

        assert data['type'] == "Textbook"
        assert data['title'] == "Test Book"
        assert 'description' in data  # Optional field should be present (as None)

    def test_job_status_response_to_json(self):
        """Should serialize JobStatusResponse to JSON."""
        response = JobStatusResponse(
            job_id="123",
            status="completed",
            status_message="Done",
            results=[],
            metadata={},
            created_at="2024-01-01T00:00:00Z"
        )
        json_str = response.model_dump_json()

        assert '"job_id":"123"' in json_str
        assert '"status":"completed"' in json_str
