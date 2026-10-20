# tree-sitter-ahoy — status against the compiler

*2026-10-21. The grammar drifted a long way behind the compiler: it still
spelled the loop condition `till`, used `anif` for `elif`, read dicts with
`{}` (the compiler uses `<>`), accepted the word operators the compiler
removed (`plus`, `minus`, `times`, `div`, `mod`, `greater_than`,
`less_than`, `pow`), and had no rules at all for assignment statements,
`assert`, `defer`, `distinct` newtypes, lambdas, `&fn` address-of, the bitwise
word operators, typed constants or the paren cast form.*

## What this change fixes

* **Keywords.** `loop until` / `loop while` (the compiler has all three:
  `till`, `until`, `while`), `elif` (was `anif`), the word bitwise operators
  (`band`, `bor`, `bxor`, `bnot`, `shl`, `shr`).
* **Removed operators.** The word arithmetic/comparison operators are gone
  from the grammar; the compiler rejects them with "was removed; write `+`
  instead".
* **Dict syntax.** `dict<K,V>` and `d<"k">` use `<>`, the compiler's actual
  spelling. The brackets got their own token so they stop shadowing the `<`
  and `>` comparison operators - the compiler uses both characters for two
  different things, and one token cannot serve both.
* **Block structure.** The compiler requires `$` to close *every* block, the
  inline form included, and reads statements until the `$` - there is no
  separator token. The grammar now models that: the inline and multi-line
  forms of `if` and `loop` are one rule, the struct/enum bodies are one
  rule, and newlines and `;` are whitespace.
* **Missing rules.** Assignment (`x = v`, `x.f = v`, `x[0] = v`), `assert`,
  `defer`, `distinct` newtypes, lambdas (`(a, b): a + b`), `&fn` address-of,
  the paren cast (`i64(3)`, `f32(1.5)`), typed constants (`NAME:: int = 4`),
  the composite types (`array[T]`, `dict<K,V>`, `buffer[f32]`, `fn(...) -> T`),
  and the `is not` comparison.
* **Chained access.** `nodes[i].kind`, `imap.actions[idx]`, `parts[i].strip`
  and `pool[payload].floats[i]` now parse: an indexed or member base is
  allowed on a member access, a method call and an index.

## Measured

| | before | after |
|---|---|---|
| `ahoy/test/input/*.ahoy` (88 files) that parse without an error node | 16 | 49 |
| `bell/engine/*.ahoy` + `bell/editor/*.ahoy` (19 files) | 0 | 2 |

The corpus is the right regression set: every file in it is valid Ahoy that
the compiler accepts, so a file that fails to parse here is a grammar gap.

## What is still missing

The grammar is an approximation of a recursive-descent parser, and the
remaining gaps are structural rather than lexical:

* Nested `if` inside `loop` inside a function - the innermost `$` is not
  accepted (6 of the 19 bell files).
* A call expression followed by an operator (`f|x| * 2`, `f|x| is not 1`):
  the atom's precedence has to outrank the operator's, and raising it
  changes how the whole expression rule resolves. This needs the operator
  precedences and the atom precedences to be reworked together.
* `switch` as an expression (`out: string = switch x: ...`), the `:=`
  walrus form, a lambda with a block body, and the `on X to Y` case range.

## The alternative that avoids all of this

`src/ahoy_tokenizer_wrapper.go` and `src/libahoy_tokenizer.so` are a Go
c-shared build of the *compiler's own* tokenizer, and `build_with_ahoy.sh`
expects a `src/scanner.cc` that was never written. Wiring the real tokenizer
in as a tree-sitter external scanner would make the lexical half exact by
construction - no drift is possible, because it is the same code the
compiler runs. The parser half would still need work, but the block
structure (`$`) is a *parser* question, not a lexer one, so that would still
have to be solved here.

Until then, the honest summary is: the grammar highlights most of the
language correctly and the compiler is the authority - `ahoy-bin` is what
decides whether a file is valid.
