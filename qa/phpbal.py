#!/usr/bin/env python3
"""phpbal.py — the sandbox has no php binary, so this is the cheapest honest
check available: strip comments and string literals with a small state machine,
then confirm every { } ( ) [ ] balances and that the file ends at depth 0.

It is NOT a parser. It cannot catch a misplaced semicolon or a wrong keyword.
It does catch the class of mistake that actually happens when a 580 KB file is
spliced by script: a brace swallowed by a heredoc, an unbalanced paren in an
inserted route, a string quote left open. Run it after every api.php edit.
"""
import sys

path = sys.argv[1] if len(sys.argv) > 1 else 'cms/api.php'
src = open(path, encoding='utf-8', errors='replace').read()

i, n = 0, len(src)
out = []
state = 'code'          # code | line | block | sq | dq | heredoc
pairs = {'}': '{', ')': '(', ']': '['}
stack = []
line = 1
heredoc_tag = ''
errors = []

while i < n:
    c = src[i]
    nxt = src[i + 1] if i + 1 < n else ''
    if c == '\n':
        line += 1
    if state == 'code':
        if c == '/' and nxt == '/':
            state = 'line'; i += 2; continue
        if c == '#':
            state = 'line'; i += 1; continue
        if c == '/' and nxt == '*':
            state = 'block'; i += 2; continue
        if c == "'":
            state = 'sq'; i += 1; continue
        if c == '"':
            state = 'dq'; i += 1; continue
        if c == '<' and src.startswith('<<<', i):
            j = i + 3
            while j < n and src[j] in ' \t':
                j += 1
            if j < n and src[j] == "'":
                j += 1
                k = src.index("'", j)
                heredoc_tag = src[j:k]
                state = 'heredoc'; i = k + 1; continue
            k = j
            while k < n and (src[k].isalnum() or src[k] == '_'):
                k += 1
            if k > j:
                heredoc_tag = src[j:k]
                state = 'heredoc'; i = k; continue
        if c in '{([':
            stack.append((c, line))
        elif c in '})]':
            if not stack:
                errors.append('line %d: unmatched %r' % (line, c))
            else:
                op, ol = stack.pop()
                if op != pairs[c]:
                    errors.append('line %d: %r closes %r opened on line %d' % (line, c, op, ol))
        i += 1
        continue
    if state == 'line':
        if c == '\n':
            state = 'code'
        i += 1; continue
    if state == 'block':
        if c == '*' and nxt == '/':
            state = 'code'; i += 2; continue
        i += 1; continue
    if state == 'sq':
        if c == '\\':
            i += 2; continue
        if c == "'":
            state = 'code'
        i += 1; continue
    if state == 'dq':
        if c == '\\':
            i += 2; continue
        if c == '"':
            state = 'code'
        i += 1; continue
    if state == 'heredoc':
        if src.startswith(heredoc_tag, i) and (i == 0 or src[i - 1] == '\n'):
            state = 'code'; i += len(heredoc_tag); continue
        i += 1; continue

for op, ol in stack:
    errors.append('unclosed %r opened on line %d' % (op, ol))
if state != 'code':
    errors.append('file ends inside a %s' % state)

print('%s: %d chars, %d lines' % (path, len(src), line))
if errors:
    print('BALANCE FAIL (%d)' % len(errors))
    for e in errors[:20]:
        print('  - ' + e)
    sys.exit(1)
print('BALANCED')
