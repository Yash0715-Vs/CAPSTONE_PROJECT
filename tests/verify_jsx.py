import re

with open(r'frontend/js/app.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Void elements in HTML
VOID = {'input', 'img', 'br', 'hr', 'line', 'circle', 'rect', 'path', 'polyline', 'polygon'}

lines = text.split('\n')
stack = []
errors = []

for line_no, raw_line in enumerate(lines, 1):
    line = raw_line.strip()
    if line.startswith('//') or line.startswith('/*') or line.startswith('*'):
        continue
    
    # Strip string literals safely
    line_clean = re.sub(r'"(?:\\.|[^"\\])*"', '""', raw_line)
    line_clean = re.sub(r"'(?:\\.|[^'\\])*'", "''", line_clean)
    line_clean = re.sub(r"`(?:\\.|[^`\\])*`", "``", line_clean)

    # Find tags
    for m in re.finditer(r'</([a-zA-Z0-9_\-]+)>|<([a-zA-Z0-9_\-]+)(?:\s+[^>]*?)?(?:/?>|(?=>))', line_clean):
        full = m.group(0)
        close_tag = m.group(1)
        open_tag = m.group(2)

        if close_tag:
            if not stack:
                errors.append(f'Line {line_no}: Unexpected closing tag </{close_tag}>')
            elif stack[-1][0] == close_tag:
                stack.pop()
            else:
                errors.append(f'Line {line_no}: Mismatched closing tag </{close_tag}>, expected </{stack[-1][0]}> opened at line {stack[-1][1]}')
        elif open_tag:
            if open_tag.lower() in VOID:
                continue
            if full.endswith('/>'):
                continue
            stack.append((open_tag, line_no))

if errors:
    print(f'FOUND {len(errors)} ERRORS:')
    for e in errors[:25]:
        print(' ', e)
else:
    print('NO CLOSING TAG MISMATCHES!')

if stack:
    print(f'UNCLOSED TAGS ({len(stack)}):')
    for s in stack[:25]:
        print(f'  <{s[0]}> opened at line {s[1]}')
else:
    print('ALL TAGS PERFECTLY BALANCED!')
