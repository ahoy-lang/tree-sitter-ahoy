; Ahoy Language Outline Configuration
; Based on Zed outline syntax patterns

; Functions - show @ prefix and return type
(function_declaration
  ("@" @context)
  name: (identifier) @name
  "|"
  "|"
  return_type: (return_types) @context) @item


; Structs
(struct_declaration
  ("struct" @context)
  name: (identifier) @name) @item

; Struct fields - show with type (pattern: name: type)
(struct_field_oneline
  name: (identifier) @name
  ":"
  type: (type) @context) @item

(struct_field_multiline
  name: (identifier) @name
  ":"
  type: (type) @context) @item

; Enums
(enum_declaration
	("enum" @context)
  name: (identifier) @name) @item

; Enum members - show with value when present
(enum_member
  value: (number) @context
  name: (identifier) @name) @item

(enum_member
  name: (identifier) @name) @item

; Variables with explicit type (x:int= 5)
(variable_declaration
  name: (identifier) @name
  ":"
  type: (type) @context) @item

; Variables with struct instantiation (x: Card{...})
(variable_declaration
  name: (identifier) @name
  ":"
  value: (expression
    (typed_object_literal
      type_name: (identifier) @context))) @item

; Constants
(constant_declaration
  name: (identifier) @name
  "::") @item
