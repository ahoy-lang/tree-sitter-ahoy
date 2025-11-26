; Ahoy Language Outline Configuration
; ====================================
; This file defines how code structure appears in the outline panel.
;
; Current features:
; - Functions show with @ prefix
; - Struct fields show with type annotation (e.g., "x: int")
; - Enum members show values when present (e.g., "RED: 255")
;
; Limitations (would require LSP integration):
; - Variable types are inferred and not in the syntax tree
; - Enum types (int vs string) are not explicitly declared
; - Function return types shown when explicitly declared
;
; To add type information for variables and constants, the LSP would need
; to be enhanced to provide type information to the outline view.

; Functions - prefix with @
(function_declaration
  name: (identifier) @name
  return_type: (return_types) @context.extra) @item
(#set! item.context_prefix "@")

(function_declaration
  name: (identifier) @name) @item
(#set! item.context_prefix "@")

; Structs - show struct keyword
(struct_declaration
  name: (identifier) @name) @item

; Struct fields - show with type suffix using : separator
(struct_field_oneline
  name: (identifier) @name
  type: (type) @context.extra) @item
(#set! item.context_separator ": ")

(struct_field_multiline
  name: (identifier) @name
  type: (type) @context.extra) @item
(#set! item.context_separator ": ")

; Enums - try to infer type from first member
(enum_declaration
  name: (identifier) @name) @item

; Enum members - show value if present
(enum_member
  value: (number) @context.extra
  name: (identifier) @name) @item
(#set! item.context_separator ": ")

(enum_member
  name: (identifier) @name) @item

; Variables - show inferred type would require LSP integration
(variable_declaration
  name: (identifier) @name) @item

; Constants - show inferred type would require LSP integration
(constant_declaration
  name: (identifier) @name) @item
