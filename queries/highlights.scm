; Keywords - ONLY highlight statement-level keywords, not anonymous tokens
; Anonymous tokens like "do", "in", "to" are part of the syntax structure
; but should NOT be highlighted separately (they would match in identifiers)

[
  "if"
  "then"
  "else"
  "anif"
  "loop"
  "switch"
  "when"
  "import"
  "struct"
  "enum"
  "program"
  "return"
] @keyword

; Control flow keywords
; Note: "halt" and "next" are anonymous tokens in the grammar, cannot be highlighted

; Function calls

(call_expression
  function: (identifier) @function)

; Function definitions

(function_declaration
  name: (identifier) @function)

; Built-in functions

(call_expression
  function: (identifier) @function.builtin
  (#match? @function.builtin "^(ahoy|ahoyf|print|printf|sprintf|sahoyf)$"))

; Types

(type) @type

[
  "int"
  "float"
  "string"
  "bool"
  "dict"
  "vector2"
  "color"
] @type.builtin

; Variables

(identifier) @variable

(parameter
  name: (identifier) @variable.parameter)

(variable_declaration
  name: (identifier) @variable)

(constant_declaration
  name: (identifier) @constant)

(struct_declaration
  name: (identifier) @type)

(struct_field_oneline
  name: (identifier) @property)

(struct_field_multiline
  name: (identifier) @property)

(enum_declaration
  name: (identifier) @type)

(type) @type

; Operators

[
  "plus"
  "minus"
  "times"
  "div"
  "mod"
  "greater_than"
  "less_than"
  "is"
  "and"
  "or"
  "not"
  "+"
  "-"
  "*"
  "/"
  "%"
  ">"
  "<"
  ">="
  "<="
  "??"
] @operator

; Punctuation

[
  ":"
  ";"
  ","
  "|"
] @punctuation.delimiter

[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
  "<"
  ">"
] @punctuation.bracket

; Literals

(string) @string
(char) @string.special
(number) @number
(boolean) @constant.builtin

; Typed object literals
(typed_object_literal
  type_name: (identifier) @type)

; Comments

(comment) @comment

; Imports

(import_statement
  path: (string) @string.special)
