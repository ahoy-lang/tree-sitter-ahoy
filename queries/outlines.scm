; Functions - show with @ prefix
(function_declaration
  name: (identifier) @name) @item

; Structs
(struct_declaration
  name: (identifier) @name) @item

; Struct fields (both oneline and multiline)
(struct_field_oneline
  name: (identifier) @name
  type: (type) @context.extra) @item

(struct_field_multiline
  name: (identifier) @name
  type: (type) @context.extra) @item

; Enums
(enum_declaration
  name: (identifier) @name) @item

; Enum members
(enum_member
  name: (identifier) @name) @item

; Variables
(variable_declaration
  name: (identifier) @name) @item

; Constants
(constant_declaration
  name: (identifier) @name) @item
