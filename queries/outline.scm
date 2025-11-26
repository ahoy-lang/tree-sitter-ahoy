; Functions - prefix with @
(function_declaration
  name: (identifier) @name) @item
(#set! item.context_prefix "@")

; Structs
(struct_declaration
  name: (identifier) @name) @item

; Struct fields - show with type suffix
(struct_field_oneline
  name: (identifier) @name
  type: (type) @context.extra) @item

(struct_field_multiline
  name: (identifier) @name
  type: (type) @context.extra) @item

; Enums
(enum_declaration
  name: (identifier) @name) @item

; Enum members - show value if present
(enum_member
  value: (number) @context.extra
  name: (identifier) @name) @item

(enum_member
  name: (identifier) @name) @item

; Variables
(variable_declaration
  name: (identifier) @name) @item

; Constants
(constant_declaration
  name: (identifier) @name) @item
