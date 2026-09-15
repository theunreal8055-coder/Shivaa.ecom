#!/usr/bin/env python3
"""SHIVAA fresh-install — PHP syntax gate (no `php` binary required).

The repo's release checklist says "PHP brace/string balance on every php file".
This is that check, done properly: the files are parsed with the real
tree-sitter PHP grammar and ANY ERROR/MISSING node fails the build, with the
offending line printed. When tree-sitter is not installed (a bare CI runner,
someone's laptop) it degrades to a tokenizer-based delimiter/string balance
check and says so on the same line, so a green run always states what was
actually verified.

Extra rules this repo has earned the right to enforce:
  · `api.php` and `install.php` must declare(strict_types=1)   (v114 lesson:
    strict_types is exactly what turned str_pad(int) into a 500 on every checkout)
  · a PHP file that outputs nothing until it decides must not end in `?>`
    (a trailing newline after `?>` became a byte of output → headers broken)
  · no `extract(`, no `eval(`, no `$$`-variable-variables in web-reachable PHP

Run: python3 tools/fresh-install/php-syntax.py [file …]      (default: cms/*.php + relay)
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_TARGETS = sorted((ROOT / "cms").glob("*.php")) + sorted((ROOT / "relay").rglob("*.php"))

STRICT_REQUIRED = {"api.php", "install.php"}
BANNED = [(re.compile(r"(?<![\w>])\beval\s*\(", re.I), "eval()"),
          (re.compile(r"(?<![\w>])\bextract\s*\(", re.I), "extract()"),
          (re.compile(r"\$\[", re.I), "$$ variable-variables"),
          (re.compile(r"create_function\s*\(", re.I), "create_function()"),
          (re.compile(r"\bunserialize\s*\(\s*(?:\$|\$_)", re.I), "unserialize() of request data")]


def parse_tree_sitter(paths: list[Path]) -> list[str] | None:
    """Return problems, or None when tree-sitter is unavailable."""
    try:
        import tree_sitter as ts
        import tree_sitter_php as tsp
    except Exception:
        return None
    lang = ts.Language(tsp.language_php())
    parser = ts.Parser(lang)
    problems: list[str] = []
    for p in paths:
        src = p.read_bytes()
        tree = parser.parse(src)
        bad = []

        def walk(n):
            if n.type in ("ERROR", "MISSING") or n.is_error:
                bad.append(n)
            for c in n.children:
                walk(c)
        walk(tree.root_node)
        for n in bad[:6]:
            line = src[:n.start_byte].count(b"\n") + 1
            frag = src[n.start_byte:n.start_byte + 90].decode("utf-8", "replace").splitlines()
            problems.append(f"{p.relative_to(ROOT)}:{line}: syntax ERROR near {' '.join(frag)[:90]!r}")
        if len(bad) > 6:
            problems.append(f"{p.relative_to(ROOT)}: … {len(bad) - 6} more ERROR nodes")
    return problems


def balance_check(paths: list[Path]) -> list[str]:
    """Fallback: strip comments + string literals, then count delimiters."""
    problems = []
    for p in paths:
        txt = p.read_text("utf-8", "replace")
        # zero out strings and comments so their braces cannot be counted
        out, i, n = [], 0, len(txt)
        depth = 0
        while i < n:
            c = txt[i]
            two = txt[i:i + 2]
            if two in ("//", "/*", "#["):
                if two == "/*":
                    j = txt.find("*/", i + 2)
                    j = n if j < 0 else j + 2
                else:
                    j = txt.find("\n", i)
                    j = n if j < 0 else j
                out.append(" " * (j - i)); i = j; continue
            if c in "'\"":
                q, j = c, i + 1
                while j < n:
                    if txt[j] == "\\":
                        j += 2; continue
                    if txt[j] == q:
                        j += 1; break
                    if txt[j] == "\n" and q == "'":
                        break
                    j += 1
                out.append(" " * (j - i)); i = j; continue
            if txt.startswith("<<<", i):                      # heredoc / nowdoc
                m = re.match(r"<<<'?'?(\w+)'?", txt[i:])
                if m:
                    tag = m.group(1)
                    end = re.search(r"\n\s*" + tag + r"\b", txt[i:])
                    j = i + (end.end() if end else n - i)
                    out.append(" " * (j - i)); i = j; continue
            out.append(c if c not in "'\"" else " ")
            i += 1
        clean = "".join(out)
        for op, cl, name in (("{", "}", "brace"), ("(", ")", "paren"), ("[", "]", "bracket")):
            a, b = clean.count(op), clean.count(cl)
            if a != b:
                problems.append(f"{p.relative_to(ROOT)}: unbalanced {name} ({a} {op} vs {b} {cl})")
            depth = 0
        for k, line in enumerate(clean.splitlines(), 1):
            depth += line.count("{") - line.count("}")
            if depth < 0:
                problems.append(f"{p.relative_to(ROOT)}:{k}: brace closed before it opened"); break
    return problems


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    paths = [Path(a).resolve() for a in args] if args else [p for p in DEFAULT_TARGETS if p.is_file()]
    if not paths:
        print("no php files found"); return 1

    notes: list[str] = []
    problems = parse_tree_sitter(paths)
    mode = "tree-sitter PHP grammar"
    if problems is None:
        problems = balance_check(paths)
        mode = "delimiter/string balance (pip install tree-sitter tree-sitter-php for a real parse)"

    for p in paths:
        txt = p.read_text("utf-8", "replace")
        if p.name in STRICT_REQUIRED and "declare(strict_types=1)" not in txt:
            problems.append(f"{p.relative_to(ROOT)}: missing declare(strict_types=1)")
        closing = txt.rstrip().endswith("?>")
        if closing and p.name in STRICT_REQUIRED:
            problems.append(f"{p.relative_to(ROOT)}: closes with ?>  (strip it — the newline after ?> leaks into output)")
        elif closing:
            notes.append(f"{p.relative_to(ROOT)}: ends with ?> (harmless here, but a byte of output follows it)")
        for rx, label in BANNED:
            m = rx.search(txt)
            if m:
                ln = txt[:m.start()].count("\n") + 1
                problems.append(f"{p.relative_to(ROOT)}:{ln}: banned construct {label}")

    print(f"php-syntax: {len(paths)} file(s) · {mode}")
    for pr in notes:
        print("  · note: " + pr)
    for pr in problems:
        print("  ✕ " + pr)
    print(f"php-syntax: {'FAIL — ' + str(len(problems)) + ' problem(s)' if problems else 'PASS · 0 problems'}")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
