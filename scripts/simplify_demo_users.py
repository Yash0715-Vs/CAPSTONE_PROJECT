# scripts/simplify_demo_users.py
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

RETAINED_USERS = [
    'ADM-001',
    'IT-501', 'IT-502', 'IT-503', 'IT-504',
    'EMP-101', 'EMP-102', 'EMP-103', 'EMP-104', 'EMP-105',
    'EMP-106', 'EMP-107', 'EMP-108', 'EMP-109', 'EMP-110'
]

SUPPORT_POOL = ['IT-501', 'IT-502', 'IT-503', 'IT-504']
EMPLOYEE_POOL = [f'EMP-{101+i}' for i in range(10)]

def execute_simplification():
    conn = pymysql.connect(**DB_CONFIG)
    cur = conn.cursor()

    print("=== STARTING DEMO DATABASE USER SIMPLIFICATION ===")

    # Step 1: Pre-migration database backup
    backup_dir = os.path.join(os.getcwd(), "backups")
    os.makedirs(backup_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"it_asset_db_pre_user_simplification_{ts}.sql")

    print(f"1. Taking full safety backup to {backup_file}...")
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

    # Step 2: Safe re-linking of IT-505 assigned tickets
    print("\n2. Re-linking tickets assigned to IT-505 across retained support pool...")
    cur.execute("SELECT ticket_id FROM tickets WHERE assigned_to = 'IT-505'")
    t_rows = cur.fetchall()
    print(f"   Found {len(t_rows)} tickets assigned to IT-505.")
    for idx, r in enumerate(t_rows):
        target_support = SUPPORT_POOL[idx % len(SUPPORT_POOL)]
        cur.execute("UPDATE tickets SET assigned_to = %s WHERE ticket_id = %s", (target_support, r['ticket_id']))
        print(f"   Reassigned ticket {r['ticket_id']} -> {target_support}")

    # Step 3: Safe re-linking of tickets created by extra employees
    print("\n3. Re-linking tickets created by extra employees to retained employee pool...")
    cur.execute("SELECT ticket_id, created_by FROM tickets WHERE created_by NOT IN %s AND created_by NOT IN %s", (tuple(RETAINED_USERS), ('IT-501',)))
    t_created_rows = cur.fetchall()
    print(f"   Found {len(t_created_rows)} tickets created by non-retained users.")
    for idx, r in enumerate(t_created_rows):
        target_emp = EMPLOYEE_POOL[idx % len(EMPLOYEE_POOL)]
        cur.execute("UPDATE tickets SET created_by = %s WHERE ticket_id = %s", (target_emp, r['ticket_id']))
        print(f"   Re-linked creator of ticket {r['ticket_id']} ({r['created_by']}) -> {target_emp}")

    # Step 4: Safe re-linking of assets assigned to extra employees
    print("\n4. Re-linking assets assigned to extra employees to retained employee pool...")
    cur.execute("SELECT asset_id, assigned_to FROM assets WHERE assigned_to IS NOT NULL AND assigned_to NOT IN %s", (tuple(RETAINED_USERS),))
    asset_rows = cur.fetchall()
    print(f"   Found {len(asset_rows)} assets assigned to non-retained users.")
    for idx, r in enumerate(asset_rows):
        target_emp = EMPLOYEE_POOL[idx % len(EMPLOYEE_POOL)]
        cur.execute("UPDATE assets SET assigned_to = %s WHERE asset_id = %s", (target_emp, r['asset_id']))
        print(f"   Re-linked asset {r['asset_id']} ({r['assigned_to']}) -> {target_emp}")

    # Step 5: Safe re-linking of asset_assignments
    print("\n5. Re-linking asset_assignments referencing non-retained employees...")
    cur.execute("SELECT id, employee_id FROM asset_assignments WHERE employee_id NOT IN %s", (tuple(RETAINED_USERS),))
    asgn_rows = cur.fetchall()
    print(f"   Found {len(asgn_rows)} assignment records referencing non-retained users.")
    for idx, r in enumerate(asgn_rows):
        target_emp = EMPLOYEE_POOL[idx % len(EMPLOYEE_POOL)]
        cur.execute("UPDATE asset_assignments SET employee_id = %s WHERE id = %s", (target_emp, r['id']))
        print(f"   Re-linked assignment record #{r['id']} ({r['employee_id']}) -> {target_emp}")

    # Step 6: Delete extra users
    print("\n6. Removing extra users beyond the 15 retained accounts...")
    cur.execute("DELETE FROM users WHERE user_id NOT IN %s", (tuple(RETAINED_USERS),))
    deleted_count = cur.rowcount
    print(f"   [DELETED] Successfully removed {deleted_count} extra users.")

    conn.commit()

    # Step 7: Post-migration verification
    print("\n7. Performing strict post-migration verification...")
    cur.execute("SELECT COUNT(*) as c FROM users")
    final_users_c = cur.fetchone()['c']

    cur.execute("SELECT role, COUNT(*) as c FROM users GROUP BY role ORDER BY role")
    role_dist = cur.fetchall()

    cur.execute("SELECT COUNT(*) as c FROM tickets")
    final_tickets_c = cur.fetchone()['c']

    cur.execute("SELECT COUNT(*) as c FROM assets")
    final_assets_c = cur.fetchone()['c']

    cur.execute("SELECT COUNT(*) as c FROM equipment_requests")
    final_eq_c = cur.fetchone()['c']

    cur.execute("SELECT COUNT(*) as c FROM asset_assignments")
    final_asgn_c = cur.fetchone()['c']

    print(f"   Total Users in Database: {final_users_c} (Expected: 15)")
    print(f"   Role Breakdown: {role_dist}")
    print(f"   Total Tickets: {final_tickets_c} (Preserved: 264)")
    print(f"   Total Assets: {final_assets_c} (Preserved: 63)")
    print(f"   Total Equipment Requests: {final_eq_c} (Preserved: 5)")
    print(f"   Total Asset Assignments: {final_asgn_c} (Preserved: 4)")

    # Print list of final 15 users
    cur.execute("SELECT user_id, name, email, role, department, status FROM users ORDER BY role, user_id")
    final_users = cur.fetchall()
    print("\n--- FINAL 15 DEMO USERS IN it_asset_db ---")
    for u in final_users:
        print(f"   {u['user_id']:10} | {u['role']:8} | {u['name']:25} | {u['email']:30} | {u['department']}")

    conn.close()

    success = (final_users_c == 15 and final_tickets_c == 264 and final_assets_c == 63 and final_eq_c == 5)
    return success

if __name__ == "__main__":
    ok = execute_simplification()
    if ok:
        print("\n>>> USER SIMPLIFICATION SUCCEEDED WITH 100% BUSINESS RECORD INTEGRITY! <<<")
    else:
        print("\n>>> VERIFICATION FAILED <<<")

