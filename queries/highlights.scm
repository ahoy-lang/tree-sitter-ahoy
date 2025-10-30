; Keywords

[
  "if"
  "then"
  "else"
  "anif"
  "loop"
  "do"
  "to"
  "from"
  "in"
  "till"
  "switch"
  "on"
  "return"
  "import"
  "when"
  "struct"
  "type"
  "enum"
  "program"
  "break"
  "skip"
] @keyword

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

(struct_field
  name: (identifier) @property)

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

; Comments

(comment) @comment

; Imports

(import_statement
  path: (string) @string.special)
