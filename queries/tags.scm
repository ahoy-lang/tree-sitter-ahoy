; Functions
(function_declaration
  name: (identifier) @name) @definition.function

; Structs
(struct_declaration
  name: (identifier) @name) @definition.type

; Enums
(enum_declaration
  name: (identifier) @name) @definition.type

; Constants
(constant_declaration
  name: (identifier) @name) @definition.constant

; Variables (top-level)
(variable_declaration
  name: (identifier) @name) @definition.variable

; References
(identifier) @reference
