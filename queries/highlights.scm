; Keywords
[
  "if"
  "then"
  "else"
  "elif"
  "pass"
  "guard"
  "loop"
  "switch"
  "when"
  "import"
  "struct"
  "enum"
  "alias"
  "union"
  "distinct"
  "program"
  "return"
  "do"
  "to"
  "till"
  "in"
  "on"
  "type"
  "fn"
  "is"
  "not"
  "and"
  "or"
  "in"
  "while"
  "until"
  "defer"
  "assert"
] @keyword

; Control flow statement keywords
(halt_statement) @keyword
(next_statement) @keyword
(defer_statement) @keyword
(assert_statement) @keyword

; Function calls

(call_expression
  function: (identifier) @function)

; Method calls

(method_call
  method: (identifier) @function)

; Function definitions

(function_declaration
  name: (identifier) @function)

; A method: the receiver type reads as a type, the method as a function
(method_receiver
  receiver_type: (identifier) @type)

(function_declaration
  type_name: (identifier) @type)

; Built-in functions

(call_expression
  function: (identifier) @function.builtin
  (#match? @function.builtin "^(ahoy|ahoyf|print|printf|sprintf|sahoyf)$"))

; Types

(type) @type

[
  "int"
  "float"
  "double"
  "string"
  "char"
  "bool"
  "dict"
  "array"
  "buffer"
  "any"
  "infer"
  "void"
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

(enum_declaration
  name: (identifier) @type)

(enum_member
  name: (identifier) @constant)

(distinct_declaration
  name: (identifier) @type)

(union_declaration
  name: (identifier) @type)

(alias_declaration
  name: (identifier) @type)

; Operators

[
  "is"
  "and"
  "or"
  "not"
  "in"
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
  "="
  "->"
  "=>"
] @operator

; Function declaration marker
["@"] @keyword.function

; Punctuation

[
  ":"
  ","
  "|"
  "$"
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
(f_string) @string
(raw_string) @string
(char) @string.special
(number) @number
(boolean) @constant.builtin

; Typed object literals
(typed_object_literal
  type_name: (identifier) @type)

; Object literal properties
(object_pair
  key: (identifier) @property)

; Member access - highlight both enum name and member
(member_access
  object: (identifier) @type
  member: (identifier) @constant)

; Comments

(comment) @comment

; Imports

(import_statement
  path: (string) @string.special)
