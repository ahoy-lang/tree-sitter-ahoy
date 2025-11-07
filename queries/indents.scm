; Indent after these nodes
[
  (function_declaration)
  (if_statement)
  (loop_statement)
  (switch_statement)
  (case_statement)
  (enum_declaration)
  (struct_declaration)
  (when_statement)
] @indent

; Dedent on 'end' keyword
"end" @outdent

; Dedent on closing brackets
[
  ")"
  "]"
  "}"
] @outdent
