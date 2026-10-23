"""
Unit tests for File I/O & OS Module Operations.

Meets Capstone Specification Section 15:
- File processing
- Text statistics
- Delimited record parsing
- Deduplication
- File archiving and OS operations
- Custom exceptions (FileProcessingError)
"""

import os
import shutil
import pytest

from app.utils.file_handler import FileHandler
from app.utils.exceptions import FileProcessingError


@pytest.fixture
def temp_dir(tmp_path):
    """Provides temporary directory for file processing tests."""
    return str(tmp_path)


def test_file_write_and_read(temp_dir):
    """Tests writing and reading text files."""
    file_path = os.path.join(temp_dir, "test_note.txt")
    FileHandler.write_file(file_path, "Hello Python Capstone")

    content = FileHandler.read_file(file_path)
    assert content == "Hello Python Capstone"


def test_file_statistics(temp_dir):
    """Tests line, word, and character counting."""
    file_path = os.path.join(temp_dir, "stats.txt")
    FileHandler.write_file(file_path, "Line one\nLine two with five words\nLine three")

    stats = FileHandler.get_text_statistics(file_path)
    assert stats["line_count"] == 3
    assert stats["word_count"] == 9
    assert stats["char_count"] > 0


def test_parse_delimited_records(temp_dir):
    """Tests parsing pipe-delimited records into dictionaries."""
    file_path = os.path.join(temp_dir, "data.txt")
    content = (
        "id | name | department\n"
        "101 | Sarah | Engineering\n"
        "102 | John | Design\n"
    )
    FileHandler.write_file(file_path, content)

    records = FileHandler.parse_delimited_records(file_path, delimiter="|")
    assert len(records) == 2
    assert records[0]["name"] == "Sarah"
    assert records[1]["department"] == "Design"


def test_deduplicate_records():
    """Tests removing duplicates by key."""
    records = [
        {"id": "A1", "name": "Device 1"},
        {"id": "A2", "name": "Device 2"},
        {"id": "A1", "name": "Device 1 Duplicate"},
    ]
    unique = FileHandler.deduplicate_records(records, primary_key="id")
    assert len(unique) == 2
    assert unique[0]["id"] == "A1"
    assert unique[1]["id"] == "A2"


def test_read_missing_file_raises_error():
    """Validates that reading non-existent file raises FileProcessingError."""
    with pytest.raises(FileProcessingError):
        FileHandler.read_file("non_existent_directory/missing_file.txt")
