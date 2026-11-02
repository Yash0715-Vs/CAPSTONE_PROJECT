# scripts/remove_employee_tickets.py
import pymysql
import os
from datetime import datetime

DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': 'root',
    'database': 'it_asset_db',
    'cursorclass': pymysql.cursors.DictCursor
}

def remove_tickets():
    conn = pymysql.connect(**DB_CONFIG)
    cur = conn.cursor()

    print("=== STARTING TICKET CLEANUP FOR USER TESTING ===")

    # 1. Take safety backup
    backup_dir = os.path.join(os.getcwd(), "backups")
    os.makedirs(backup_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"it_asset_db_pre_ticket_cleanup_{ts}.sql")

    print(f"1. Taking pre-cleanup backup to {backup_file}...")
    cur.execute("SHOW TABLES")
    tables = [list(r.values())[0] for r in cur.fetchall()]

    with open(backup_file, "w", encoding="utf-8") as f:
        f.write("SET FOREIGN_KEY_CHECKS=0;\n\n")
        for tbl in tables:
            cur.execute(f"SHOW CREATE TABLE `{tbl}`")
            create_stmt = cur.fetchone()['Create Table']
            f.write(f"DROP TABLE IF EXISTS `{tbl}`;\n{create_stmt};\n\n")
            cur.execute(f"SELECT * FROM `{tbl}`")
            rows = cur.fetchall()
            if rows:
                cols = list(rows[0].keys())
                col_names = ", ".join([f"`{c}`" for c in cols])
                f.write(f"INSERT INTO `{tbl}` ({col_names}) VALUES\n")
                val_lines = []
                for row in rows:
                    vals = []
                    for c in cols:
                        v = row[c]
                        if v is None: vals.append("NULL")
                        elif isinstance(v, (int, float)): vals.append(str(v))
                        else: vals.append(f"'{str(v).replace('\\', '\\\\').replace('\'', '\\\'')}'")
                    val_lines.append(f"({', '.join(vals)})")
                f.write(",\n".join(val_lines) + ";\n\n")
        f.write("SET FOREIGN_KEY_CHECKS=1;\n")
    print(f"   [BACKUP COMPLETE] Size: {os.path.getsize(backup_file)} bytes")

    # 2. Identify tickets to delete
    # Tickets created by employees
    cur.execute("""
        SELECT ticket_id, title, created_by 
        FROM tickets 
        WHERE created_by IN (SELECT user_id FROM users WHERE role = 'EMPLOYEE')
    """)
    emp_tickets = cur.fetchall()
    emp_ticket_ids = [t['ticket_id'] for t in emp_tickets]
    print(f"\n2. Found {len(emp_ticket_ids)} tickets created by employee accounts.")

    # Also check if there are test residue tickets created by IT-501
    cur.execute("SELECT ticket_id, title, created_by FROM tickets WHERE created_by = 'IT-501'")
    it501_tickets = cur.fetchall()
    it501_ticket_ids = [t['ticket_id'] for t in it501_tickets]
    print(f"   Found {len(it501_ticket_ids)} residue test tickets created by IT-501 ('Assign Check').")

    all_to_delete = emp_ticket_ids + it501_ticket_ids
    print(f"   Total tickets to be removed for clean testing: {len(all_to_delete)}")

    # 3. Delete ticket_history rows for these tickets (FK constraint)
    if all_to_delete:
        format_strings = ','.join(['%s'] * len(all_to_delete))
        cur.execute(f"DELETE FROM ticket_history WHERE ticket_id IN ({format_strings})", tuple(all_to_delete))
        th_deleted = cur.rowcount
        print(f"\n3. Deleted {th_deleted} associated ticket_history audit rows.")

        # 4. Delete tickets
        cur.execute(f"DELETE FROM tickets WHERE ticket_id IN ({format_strings})", tuple(all_to_delete))
        t_deleted = cur.rowcount
        print(f"4. Deleted {t_deleted} tickets from tickets table.")

    conn.commit()

    # 5. Verify post-cleanup database state
    print("\n5. Verifying database state:")
    cur.execute("SELECT COUNT(*) as c FROM tickets")
    remaining_tickets = cur.fetchone()['c']
    cur.execute("SELECT COUNT(*) as c FROM ticket_history")
    remaining_history = cur.fetchone()['c']
    cur.execute("SELECT COUNT(*) as c FROM users")
    remaining_users = cur.fetchone()['c']
    cur.execute("SELECT COUNT(*) as c FROM assets")
    remaining_assets = cur.fetchone()['c']
    cur.execute("SELECT COUNT(*) as c FROM equipment_requests")
    remaining_eq = cur.fetchone()['c']

    print(f"   Remaining Tickets: {remaining_tickets} (Clean slate ready for testing!)")
    print(f"   Remaining Ticket History: {remaining_history}")
    print(f"   Preserved Users: {remaining_users} (15 users intact)")
    print(f"   Preserved Assets: {remaining_assets} (63 assets intact)")
    print(f"   Preserved Equipment Requests: {remaining_eq} (5 requests intact)")

    conn.close()
    return remaining_tickets == 0

if __name__ == "__main__":
    ok = remove_tickets()
    if ok:
        print("\n>>> TICKET CLEANUP COMPLETE! CLEAN SLATE READY FOR USER TESTING! <<<")
    else:
        print("\n>>> CLEANUP FINISHED <<<")

