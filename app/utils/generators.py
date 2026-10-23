"""
Generator-Based Processing Utilities.

Meets Capstone Specification Section 9:
- Uses Python `yield` statement for lazy, on-demand evaluation
- Streams large ticket and asset datasets without storing entire sets in memory
- Demonstrates memory efficiency (O(1) memory overhead vs O(N) list allocation)
"""

import sys
from pathlib import Path
from typing import Generator, List, Iterable

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.models.ticket import Ticket, TicketCategory, TicketPriority


def ticket_stream_generator(total_count: int = 1000) -> Generator[Ticket, None, None]:
    """
    Simulates streaming a large collection of tickets from a data source or file.
    Uses 'yield' so each ticket is produced on-demand, preventing high RAM usage.
    """
    for i in range(1, total_count + 1):
        yield Ticket(
            ticket_id=f"INC-{10000 + i}",
            title=f"Sample Incident #{i}",
            description=f"Auto-generated diagnostic report for ticket #{i}",
            created_by=f"EMP-{(i % 100) + 1}",
            category=TicketCategory.HARDWARE if i % 2 == 0 else TicketCategory.SOFTWARE,
            priority=TicketPriority.HIGH if i % 5 == 0 else TicketPriority.LOW
        )


def ticket_batch_generator(
    iterable_tickets: Iterable[Ticket], batch_size: int = 100
) -> Generator[List[Ticket], None, None]:
    """
    Yields tickets in memory-friendly batches of `batch_size`.
    Useful for chunked database bulk inserts and batch API payloads.
    """
    batch: List[Ticket] = []
    for ticket in iterable_tickets:
        batch.append(ticket)
        if len(batch) >= batch_size:
            yield batch
            batch = []
    if batch:
        yield batch


def report_csv_line_generator(iterable_tickets: Iterable[Ticket]) -> Generator[str, None, None]:
    """
    Yields CSV lines one at a time for streaming report downloads without buffering all rows in memory.
    """
    yield "ticket_id,title,category,priority,status,created_by\n"
    for ticket in iterable_tickets:
        yield f"{ticket.ticket_id},\"{ticket.title}\",{ticket.category.value},{ticket.priority.value},{ticket.status.value},{ticket.created_by}\n"


if __name__ == "__main__":
    print("=" * 65)
    print("RUNNING GENERATOR-BASED PROCESSING DEMO (YIELD & MEMORY)")
    print("=" * 65)

    NUM_ITEMS = 50_000

    print(f"\n[1] Benchmarking Memory Usage for {NUM_ITEMS:,} items:")

    # Generator creation (O(1) memory)
    gen = ticket_stream_generator(NUM_ITEMS)
    gen_memory_bytes = sys.getsizeof(gen)
    print(f"  -> Memory consumed by Generator object: {gen_memory_bytes} bytes (Constant O(1) Memory)")

    # Complete list simulation calculation
    # In Python, a list of 50,000 pointers alone takes ~400 KB, plus individual object overhead
    sample_list = list(range(NUM_ITEMS))
    list_memory_bytes = sys.getsizeof(sample_list)
    print(f"  -> Memory consumed by List pointer container: {list_memory_bytes:,} bytes")
    print("  => Generator uses ~99.9% less container memory by yielding items on-demand!")

    # 2. Test Streaming / Batching
    print("\n[2] Testing Batch Processing with Generator (Batch Size = 5):")
    stream = ticket_stream_generator(12)
    for batch_num, batch in enumerate(ticket_batch_generator(stream, batch_size=5), start=1):
        print(f"  Batch #{batch_num}: Processed {len(batch)} tickets (First: {batch[0].ticket_id}, Last: {batch[-1].ticket_id})")

    # 3. Test Streaming CSV Export
    print("\n[3] Testing Streaming CSV Line Generator:")
    csv_stream = report_csv_line_generator(ticket_stream_generator(3))
    for line in csv_stream:
        print(f"  CSV Output > {line.strip()}")

    print("\n" + "=" * 65)
    print("ALL GENERATOR DEMOS COMPLETED SUCCESSFULLY!")
    print("=" * 65)
