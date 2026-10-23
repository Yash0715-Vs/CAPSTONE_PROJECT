"""
File I/O and OS Processing Module.

Meets Capstone Specification Section 8:
- Read, write, and append text files safely using context managers (`with open(...)`)
- Text analytics: count lines, words, and characters
- Parse structured records (e.g., CSV / pipe / colon-delimited)
- Deduplication of records
- OS module usage for directory creation, listing, existence checks, and file archiving
"""

import os
import shutil
import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.utils.exceptions import FileProcessingError


class FileHandler:
    """
    Handles robust file I/O operations and directory archiving using the os module.
    """

    @staticmethod
    def ensure_directory(directory_path: str) -> None:
        """Creates directory if it does not already exist."""
        if not os.path.exists(directory_path):
            os.makedirs(directory_path, exist_ok=True)

    @staticmethod
    def write_file(file_path: str, content: str) -> None:
        """Writes text content to a file, creating parent directories if needed."""
        try:
            parent_dir = os.path.dirname(file_path)
            if parent_dir and not os.path.exists(parent_dir):
                os.makedirs(parent_dir, exist_ok=True)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
        except OSError as err:
            raise FileProcessingError(f"Failed to write file '{file_path}': {err}")

    @staticmethod
    def append_file(file_path: str, content: str) -> None:
        """Appends text content to a file."""
        try:
            with open(file_path, "a", encoding="utf-8") as f:
                f.write(content)
        except OSError as err:
            raise FileProcessingError(f"Failed to append to file '{file_path}': {err}")

    @staticmethod
    def read_file(file_path: str) -> str:
        """Reads and returns the complete content of a file."""
        if not os.path.isfile(file_path):
            raise FileProcessingError(f"File not found: '{file_path}'")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except OSError as err:
            raise FileProcessingError(f"Error reading file '{file_path}': {err}")

    @staticmethod
    def get_text_statistics(file_path: str) -> Dict[str, int]:
        """
        Counts lines, words, and characters in a given file.
        """
        content = FileHandler.read_file(file_path)
        lines = content.splitlines()
        words = content.split()
        return {
            "line_count": len(lines),
            "word_count": len(words),
            "char_count": len(content),
        }

    @staticmethod
    def parse_delimited_records(file_path: str, delimiter: str = "|") -> List[Dict[str, str]]:
        """
        Parses records from a delimited text file where line 1 contains headers.
        Ignores blank lines and strips whitespace.
        """
        content = FileHandler.read_file(file_path)
        lines = [line.strip() for line in content.splitlines() if line.strip() and not line.startswith("#")]
        if not lines:
            return []

        headers = [h.strip() for h in lines[0].split(delimiter)]
        records = []
        for line in lines[1:]:
            values = [v.strip() for v in line.split(delimiter)]
            if len(values) == len(headers):
                records.append(dict(zip(headers, values)))
        return records

    @staticmethod
    def deduplicate_records(records: List[Dict[str, Any]], primary_key: str) -> List[Dict[str, Any]]:
        """
        Removes duplicate dictionary records based on a unique key.
        Preserves original ordering.
        """
        seen_keys = set()
        unique_records = []
        for record in records:
            key_val = record.get(primary_key)
            if key_val and key_val not in seen_keys:
                seen_keys.add(key_val)
                unique_records.append(record)
        return unique_records

    @staticmethod
    def archive_file(source_file: str, archive_dir: str) -> str:
        """
        Moves a processed file into an archive directory using the os and shutil modules.
        """
        if not os.path.isfile(source_file):
            raise FileProcessingError(f"Cannot archive non-existent file: {source_file}")

        os.makedirs(archive_dir, exist_ok=True)
        filename = os.path.basename(source_file)
        destination_path = os.path.join(archive_dir, filename)

        shutil.move(source_file, destination_path)
        return destination_path


if __name__ == "__main__":
    print("=" * 65)
    print("RUNNING FILE I/O AND OS PROCESSING DEMO")
    print("=" * 65)

    data_dir = os.path.join(ROOT_DIR, "data")
    assets_file = os.path.join(data_dir, "assets.txt")

    # 1. Text Statistics on data/assets.txt
    print(f"\n[+] Analyzing file: {assets_file}")
    stats = FileHandler.get_text_statistics(assets_file)
    print(f"  -> File Statistics: {stats['line_count']} lines, {stats['word_count']} words, {stats['char_count']} chars")

    # 2. Parse Delimited Records
    records = FileHandler.parse_delimited_records(assets_file, delimiter="|")
    print(f"  -> Total records parsed: {len(records)}")

    # 3. Deduplicate
    unique_records = FileHandler.deduplicate_records(records, primary_key="asset_id")
    print(f"  -> Unique records: {len(unique_records)}")
    for r in unique_records[:4]:
        print(f"     * {r['asset_id']} - {r['type']} ({r['brand']} {r['model']}) -> {r['status']}")

    # 4. Demonstrate Archiving on a sample copy
    archive_dir = os.path.join(data_dir, "archive")
    sample_copy = os.path.join(data_dir, "assets_batch_run.tmp")
    FileHandler.write_file(sample_copy, "temporary batch content")
    archived_loc = FileHandler.archive_file(sample_copy, archive_dir)
    print(f"\n[+] Archived batch file to: {archived_loc}")

    # Clean up temp file in archive
    if os.path.exists(archived_loc):
        os.remove(archived_loc)
    if os.path.exists(archive_dir) and not os.listdir(archive_dir):
        os.rmdir(archive_dir)

    print("\n" + "=" * 65)
    print("ALL FILE I/O AND OS TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 65)
