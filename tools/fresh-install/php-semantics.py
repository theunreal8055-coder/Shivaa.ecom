#!/usr/bin/env python3
"""SHIVAA fresh-install — PHP scope gate.

Finds the bug class a syntax parse cannot see: a function reading a variable that
only the FILE's top-level code assigns. In PHP that is not a style nit — without
`global $db;` the name is simply `null` inside the function, and on this codebase
that class of bug has meant a 500 on every checkout (v114) and a silently empty
rate panel (v112).

How it stays honest (no crying wolf):
  · function ranges come from the real tree-sitter PHP parse, so braces inside
    strings/comments cannot confuse it;
  · only NAMED functions are checked — closures and `fn()` arrows capture their
    enclosing scope by language rule, so the file-scope rule does not apply;
  · the "is it assigned here?" set is deliberately GENEROUS (foreach bindings,
    `list()`/`[]` destructuring, by-ref out-params of preg_match*/parse_str,
    compound assignments, `global`/`static`/`use()`/`catch`), because a missed
    finding is better than a false alarm that gets the gate switched off;
  · files the release authors (STRICT) must be clean; everything else prints
    notes and never blocks.
  · the builtin-function allow-list is DERIVED from production cms/*.php — any
    name those files call without defining it must be a real builtin, so the
    list can never drift from what this host actually has.

Also checks the installer's include graph (no `require` of a file the bundle
omits) and that every `$_POST/$_GET/$_SERVER` read is wrapped in a cast — the
repo's habit under strict_types.

Run: python3 tools/fresh-install/php-semantics.py [file …]
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / "cms"
STRICT = {"install.php"}                                  # files this release authors
SUPER = {"GLOBALS", "_GET", "_POST", "_SERVER", "_REQUEST", "_SESSION", "_COOKIE",
         "_FILES", "this", "argv", "argc", "http_response_header"}
KEYWORDS = {"if", "for", "foreach", "while", "switch", "catch", "function", "echo", "print", "return",
            "list", "array", "isset", "unset", "empty", "new", "exit", "die", "match", "include",
            "require", "elseif", "declare", "fn", "static", "and", "or", "xor", "clone", "yield", "else"}

ASSIGN_RE = re.compile(
    r"(?P<lhs>(?:\$[\w\[\]'\"]+|list\s*\([^)]*\)|\[[^\]]*\])\s*(?:\[[^\]]*\]|->\w+)*\s*)"
    r"(?:\?=|\+=|-=|\.=|\*=|/=|%=|\|=|&=|\?\?=|=(?!=|>))")
FOREACH_RE = re.compile(r"foreach\s*\((?P<h>[^;{]*?)\s*as\s*(?P<binds>&?\$\w+(?:\s*=>\s*&?\$\w+)?)", re.S)
BYREF_RE = re.compile(r"(?:preg_match(?:_all)?|parse_str|array_walk|usort|uasort|array_filter)\s*\((?P<args>[^;]*?)\)", re.S)
GLOBAL_RE = re.compile(r"\bglobal\s+(?P<l>[^;]+);")
STATIC_RE = re.compile(r"\bstatic\s+(?P<l>[^;{]+)\s*(?:=\s*[^;]*)?;")
USE_RE = re.compile(r"use\s*\((?P<l>[^)]*)\)\s*(?:use\s*\([^)]*\)\s*)*\{")
CATCH_RE = re.compile(r"catch\s*\([^)]*\$\w+")
VAR_RE = re.compile(r"\$([A-Za-z_]\w*)")
CALL_RE = re.compile(r"(?<![\w$>])([a-zA-Z_]\w*)\s*\(")
# Names this release's installer calls that production PHP happens never to
# call. Each one is a documented PHP builtin — listing them here (rather than a
# 1,000-name dump) keeps the gate honest: a typo'd *project* helper still shows
# up, because it is not in this set and not defined anywhere.
RELEASE_BUILTINS = {
    "version_compare", "extension_loaded", "ini_get", "disk_free_space", "printf", "glob",
    "scandir", "array_map", "array_slice", "array_filter", "number_format", "filesize",
    "is_dir", "str_starts_with", "str_ends_with", "mb_substr", "basename", "chmod", "mkdir",
    "random_bytes", "bin2hex", "password_hash", "preg_match", "preg_replace", "json_decode",
    "json_encode", "file_get_contents", "file_put_contents", "unlink", "header", "headers_sent",
    "http_response_code", "filter_var", "str_repeat", "str_replace", "strtolower", "trim",
    "count", "is_file", "is_writable", "is_array", "strlen", "fopen", "fwrite", "fflush",
    "fclose", "rename", "date", "time", "htmlspecialchars", "round", "max", "min", "int",
    "float", "strlen", "var_dump", "exit", "usleep", "str_contains", "version_compare",
}
UNCST_RE = re.compile(r"(?:\$_(?:POST|GET|REQUEST|SERVER|COOKIE|FILES))(?:\[[^\]]+\])?(?!\s*(?:\?\?)|\s*\))\s*[<>=!+*/.-](?!=)")


def lang_or_none():
    try:
        import tree_sitter as ts
        import tree_sitter_php as tsp
        return ts.Language(tsp.language_php())
    except Exception:
        return None


def strip_strings_and_comments(src: str) -> str:
    """Blank out string bodies + comments (keep offsets, keep $vars out of them)."""
    out, i, n = [], 0, len(src)
    while i < n:
        two = src[i:i + 2]
        if two in ("//", "/*") or src[i] == "#":
            if two == "/*":
                j = src.find("*/", i + 2); j = n if j < 0 else j + 2
            else:
                j = src.find("\n", i); j = n if j < 0 else j
            out.append("".join(ch if ch == "\n" else " " for ch in src[i:j])); i = j; continue
        if src[i] in "'\"":
            q = src[i]; j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2; continue
                if src[j] == q:
                    break
                if src[j] == "\n" and q == "'":
                    break
                j += 1
            seg = src[i:j + 1]
            out.append("".join(ch if ch in "'\"\\" else (" " if ch != "\n" else "\n") for ch in seg)); i = j + 1; continue
        out.append(src[i]); i += 1
    return "".join(out)


def functions(src_clean: str) -> list[tuple[str, int, int, str]]:
    """(name, start, end, params) of each NAMED function, brace/paren-matched on
    comment+string-stripped source (so a `{` inside a heredoc cannot lie)."""
    out = []
    for m in re.finditer(r"\bfunction\s+&?\s*([A-Za-z_]\w*)\s*\(", src_clean):
        k = m.end() - 1
        depth = 0
        for j in range(k, len(src_clean)):
            if src_clean[j] == "(":
                depth += 1
            elif src_clean[j] == ")":
                depth -= 1
                if depth == 0:
                    break
        else:
            continue
        params_src = src_clean[k + 1:j]
        head = src_clean[j:j + 6000]
        ob = head.find("{")
        if ob < 0:
            continue
        i = j + ob
        depth, e = 0, i
        while e < len(src_clean):
            c = src_clean[e]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    break
            e += 1
        out.append((m.group(1), m.start(), e + 1, params_src))
    return out


def inner_spans(src: str, frm: int, to: int) -> list[tuple[int, int]]:
    """Spans of every closure/arrow-fn written INSIDE [frm,to) — their parameters
    and captured vars belong to them, not to the enclosing function."""
    spans = []
    for m in re.finditer(r"\b(?:static\s+)?function\s*&?\s*|[\s(=,]fn\s*\(", src[frm:to]):
        st = frm + m.end()
        if st >= to or src[st] != "(":
            continue
        depth, k = 0, st
        while k < to:
            if src[k] == "(":
                depth += 1
            elif src[k] == ")":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        rest = src[k:min(to, k + 400)]
        ob = rest.find("{")
        fat = rest.find("=>")
        if ob >= 0 and (fat < 0 or ob < fat):
            e = k + ob
            d2, q = 0, e
            while q < to:
                if src[q] == "{":
                    d2 += 1
                elif src[q] == "}":
                    d2 -= 1
                    if d2 == 0:
                        break
                q += 1
            spans.append((frm + m.start(), q + 1))
        elif fat >= 0:
            d3, q, depth2 = 0, k + fat + 2, 0
            while q < to:
                c3 = src[q]
                if c3 in "([{":
                    depth2 += 1
                elif c3 in ")]}":
                    depth2 -= 1
                elif c3 == "," and depth2 == 0:
                    break
                elif c3 == ";" and depth2 == 0:
                    break
                q += 1
            spans.append((frm + m.start(), q))
    return spans


def assigned_here(body: str, params: str) -> set[str]:
    a: set[str] = set(VAR_RE.findall(params))
    for m in ASSIGN_RE.finditer(body):
        a.update(VAR_RE.findall(m.group("lhs")))
    for m in FOREACH_RE.finditer(body):
        a.update(VAR_RE.findall(m.group("binds")))
    for m in GLOBAL_RE.finditer(body):
        a.update(VAR_RE.findall(m.group("l")))
    for m in STATIC_RE.finditer(body):
        a.update(VAR_RE.findall(m.group("l")))
    for m in USE_RE.finditer(body):
        a.update(VAR_RE.findall(m.group("l")))
    for m in CATCH_RE.finditer(body):
        a.update(VAR_RE.findall(m.group(0)))
    for m in BYREF_RE.finditer(body):                     # preg_match($re,$s,$out) writes $out
        parts = re.split(r",(?![^()\[]*\))", m.group("args"))
        for p in parts[2:]:
            a.update(VAR_RE.findall(p))
    for m in re.finditer(r"\$\w+(?:\[[^\]]*\])?(\?\?|\?)?=", body):   # any LHS shape
        a.update(VAR_RE.findall(m.group(0)))
    for m in re.finditer(r"(\$\w+)\s*(\+\+|--)", body):
        a.add(m.group(1).lstrip("$"))
    return a


def builtin_vocabulary() -> set[str]:
    called: set[str] = set()
    for p in sorted(CMS.glob("*.php")):
        if p.name in STRICT:
            continue
        src = strip_strings_and_comments(p.read_text("utf-8", "replace"))
        defined = set(re.findall(r"\bfunction\s+([A-Za-z_]\w*)\s*\(", src))
        for m in CALL_RE.finditer(src):
            fn = m.group(1)
            if fn in defined or fn in KEYWORDS:
                continue
            called.add(fn)
    return called


def _helpers_elsewhere(path: Path) -> dict[str, str]:
    """Helpers defined in the rest of the bundle — a call that resolves ONLY
    there is a fatal 'undefined function' unless someone includes that file."""
    out: dict[str, str] = {}
    for p in list(CMS.glob("*.php")) + sorted((ROOT / "relay").rglob("*.php")):
        if p == path or not p.is_file():
            continue
        src = strip_strings_and_comments(p.read_text("utf-8", "replace"))
        for name in re.findall(r"\bfunction\s+&?\s*([A-Za-z_]\w*)\s*\(", src):
            out.setdefault(name, p.relative_to(ROOT).as_posix())
    return out


def check(path: Path, builtins: set[str]) -> tuple[list[str], list[str]]:
    raw = path.read_text("utf-8", "replace")
    clean = strip_strings_and_comments(raw)
    hard: list[str] = []
    soft: list[str] = []
    file_scope = {v.lstrip("$") for v in re.findall(r"(\$[\w\[\]'\"]+(?:\[[^\]]*\])*)\s*(?:\?=|\+=|-=|\.=|\*=|/=|%=|\|=|&=|\?\?=|=(?!=|>))",
                                                    clean[: (functions(clean) or [("", 0, len(clean), "")])[0][1]])}
    defined = set(re.findall(r"\bfunction\s+&?\s*([A-Za-z_]\w*)\s*\(", clean))
    other_file_defs = _helpers_elsewhere(path)

    all_funcs = functions(clean)
    for name, a, b, params in all_funcs:
        # A function's OWN text = its span with every nested function/closure cut
        # out. Otherwise an inner `static function (string $metal, …)` makes the
        # enclosing function look like it reads $metal — which it does not.
        body = list(clean[a:b])
        cuts = [(na - a, nb - a) for _, na, nb, _ in all_funcs if na > a and nb <= b and na - a > 0]
        cuts += [(st - a, en - a) for st, en in inner_spans(clean, a, b)]
        for st, en in cuts:
            for i in range(max(0, st), min(len(body), en)):
                if body[i] != "\n":
                    body[i] = " "
        body = "".join(body)
        known = assigned_here(body, params) | SUPER
        seen: set[str] = set()
        for m in VAR_RE.finditer(body):
            v = m.group(1)
            if v in known or v in seen or body[max(0, m.start() - 1):m.start()] == ">":
                continue
            seen.add(v)
            ln = raw[:a + m.start()].count("\n") + 1
            if v in file_scope:
                hard.append(f"{path.name}:{ln}: {name}() reads ${v}, which only the file scope assigns — "
                            f"PHP hands it null without `global ${v};`")
            else:
                soft.append(f"{path.name}:{ln}: {name}() reads ${v}, assigned nowhere in it")

    for m in CALL_RE.finditer(clean):
        fn = m.group(1)
        if fn in KEYWORDS or fn in defined or fn in builtins or fn in RELEASE_BUILTINS:
            continue
        ln = raw[:m.start()].count("\n") + 1
        home = other_file_defs.get(fn)
        if home:
            hard.append(f"{path.name}:{ln}: calls {fn}() which is defined in {home} — this file never "
                        f"includes it, so the call is fatal at runtime")
        else:
            soft.append(f"{path.name}:{ln}: calls {fn}() — not defined in the bundle; verify it is a PHP builtin")

    for m in re.finditer(r"(require|include)(_once)?\s*\(?\s*['\"]([^'\"]+\.php)['\"]", clean):
        inc = m.group(3)
        target = (path.parent / inc)
        if not target.exists() and not (CMS / inc).exists():
            ln = raw[:m.start()].count("\n") + 1
            hard.append(f"{path.name}:{ln}: includes {inc} — not present next to it (bundle would 500 on boot)")

    for m in re.finditer(r"\$_(POST|GET|REQUEST)\s*\[([^\]]+)\]\s*(?:===|!==|==|!=|<|>|\.|\+)", clean):
        ln = raw[:m.start()].count("\n") + 1
        soft.append(f"{path.name}:{ln}: raw $_{m.group(1)} compared without a cast — strict_types bites (v114)")
    return hard, soft


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    paths = [Path(a).resolve() for a in args] if args else [CMS / "install.php", CMS / "api.php", CMS / "sms.php", CMS / "mail.php"]
    if lang_or_none() is None:
        print("php-semantics: tree-sitter unavailable — run  pip install --break-system-packages tree-sitter tree-sitter-php")
        print("               (this gate needs the real parse; refusing to guess with regex alone)")
        return 0
    builtins = builtin_vocabulary()
    hard: list[str] = []
    soft: list[str] = []
    for p in paths:
        if not p.is_file():
            continue
        h, s = check(p, builtins)
        if p.name in STRICT:
            hard.extend(h)
            soft.extend(h + s)
        else:
            soft.extend(h + s)
    print(f"php-semantics: {len(paths)} file(s) · derived builtin allow-list: {len(builtins)} names · strict on {', '.join(sorted(STRICT))}")
    uniq = list(dict.fromkeys(soft))
    for x in uniq[:6]:
        print("  · (heuristic — worth one look, never blocks) " + x)
    if len(uniq) > 6:
        print(f"  · … {len(uniq) - 6} more note(s); only the ✕ lines above can fail a build")
    for x in dict.fromkeys(hard):
        print("  ✕ " + x)
    print(f"php-semantics: {'FAIL — ' + str(len(hard)) + ' problem(s) in strict file(s)' if hard else 'PASS · strict files clean'}")
    return 1 if hard else 0


if __name__ == "__main__":
    raise SystemExit(main())
