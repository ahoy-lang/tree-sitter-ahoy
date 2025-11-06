; Zed indentation - use @indent capture
[
  (block)
  (function_declaration)
  (if_statement)
  (loop_statement)
  (switch_statement)
  (case_statement)
  (enum_declaration)
  (struct_declaration)
  (struct_body)
  (when_statement)
] @indent

; Outdent on closing brackets
[
  ")"
  "]"
  "}"
] @outdent
