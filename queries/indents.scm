; Indent after control structures and declarations
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
] @indent.begin

; Closing brackets
[
  ")"
  "]"
  "}"
] @indent.branch @indent.end

[
  (comment)
  (string)
  (ERROR)
] @indent.auto
