; Bracket pairs for Zed (vim `%` motion, rainbow brackets, match highlight)
;
; Every Ahoy block closes with `$`, so `%` jumps between the block
; opener and its closing `$`. Only `if`/`guard` hold their `$` as a
; direct child of `if_statement` - every other block nests its `$`
; inside a body node (`loop_body`, `switch_body`, ...). A bare global
; pair like `("loop" @open "$" @close)` therefore matches nothing
; (verified with `tree-sitter query`: only `if` matched). Each rule
; below is scoped to its statement node with the `$` reached through
; its body node, which is what makes `%` work for all of them.

; Standard brackets
("(" @open ")" @close)
("[" @open "]" @close)
("{" @open "}" @close)

; Conditionals: `if C then ... $`, plus `guard C else ... $`
(if_statement "if" @open "$" @close)
(if_statement "guard" @open "$" @close)

; Loops: `loop ... do/: ... $`
(loop_statement "loop" @open (loop_body "$" @close))

; Switch as a statement: `switch V: ... $`
(switch_statement "switch" @open (switch_body "$" @close))
; Switch as a value: `x: switch V: ... $`
(switch_expression "switch" @open (switch_body "$" @close))

; Compile-time conditional: `when C then ... $`
(when_statement "when" @open (when_body "$" @close))

; Functions: `@ name||: ... $`
(function_declaration "@" @open (function_body "$" @close))

; Types: `struct Name: ... $` / `enum Name: ... $`
; (single-line forms have no `$`, so these simply don't match there)
(struct_declaration "struct" @open (struct_body "$" @close))
(enum_declaration "enum" @open (enum_members "$" @close))

; Angle brackets for generics (if needed)
; ("<" @open ">" @close)

; Pipe brackets for function parameters and lambdas
("|" @open "|" @close)
