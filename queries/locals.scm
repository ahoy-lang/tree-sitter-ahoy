; Scopes
[
  (block)
  (function_declaration)
  (if_statement)
  (loop_statement)
  (switch_statement)
  (when_statement)
] @scope

; References
(identifier) @reference

; Definitions
(program_declaration 
  name: (identifier) @definition.namespace)

(function_declaration 
  name: (identifier) @definition.function)

(struct_declaration 
  name: (identifier) @definition.type)

(enum_declaration 
  name: (identifier) @definition.type)

(variable_declaration 
  name: (identifier) @definition.var)

(constant_declaration 
  name: (identifier) @definition.constant)

(parameter 
  name: (identifier) @definition.parameter)

(struct_field 
  name: (identifier) @definition.field)
