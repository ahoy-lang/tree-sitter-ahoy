; Ahoy Language Outline Configuration
;
; Every item pattern below matches its node exactly once: variants that
; differ only in optional parts (return types, declared types, receiver
; blocks) use `(...)?` inside ONE pattern instead of two overlapping
; patterns, which would list the same symbol twice. All declaration
; forms appear - inferred `x: v` as well as typed `x: T = v` - so
; function bodies list every local, not just the typed ones.

; Functions: `@ name|...|`, with or without a return type, with or
; without a receiver block `@ (recv Type) name|...|`
(function_declaration
  "@" @context
  receiver: (method_receiver
    receiver_type: (identifier) @context)?
  name: (identifier) @name
  return_type: (return_types)? @context) @item

; Methods: `@ Type.name|...|`
(function_declaration
  "@" @context
  type_name: (identifier) @context
  method_name: (identifier) @name
  return_type: (return_types)? @context) @item

; Parameters, typed or not
(parameter
  name: (identifier) @name
  type: (type)? @context) @item

; Variables, typed (`x: T = v`) or inferred (`x: v`)
(variable_declaration
  name: (identifier) @name
  type: (type)? @context) @item

; Tuple assignments: `bx, by, bw, bh :... = ...`
(tuple_assignment
  targets: (identifier_list) @name) @item

; Constants, with or without a type
(constant_declaration
  name: (identifier) @name
  "::" @context
  type: (type)? @context) @item

; Structs
(struct_declaration
  ("struct" @context)
  name: (identifier) @name) @item

; Struct fields - show with type when present
(struct_field
  name: (identifier) @name
  type: (type)? @context) @item

; Enums
(enum_declaration
  ("enum" @context)
  name: (identifier) @name) @item

; Enum members - show with value when present
(enum_member
  value: (number)? @context
  name: (identifier) @name) @item

; Alias declarations
(alias_declaration
  ("alias" @context)
  name: (identifier) @name
  target_type: (type) @context) @item

; Union declarations
(union_declaration
  ("union" @context)
  name: (identifier) @name
  types: (type_list) @context) @item

; Distinct declarations
(distinct_declaration
  ("distinct" @context)
  name: (identifier) @name
  target_type: (type) @context) @item
