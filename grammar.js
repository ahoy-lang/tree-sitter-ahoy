module.exports = grammar({
	name: "ahoy",

	word: ($) => $.identifier,

	extras: ($) => [
		/\s/, // All whitespace including newlines
		/;/,  // Statement separator (the compiler reads statements until `$`)
		$.comment,
	],

	conflicts: ($) => [
		[$.typed_object_literal, $.expression],
		[$.function_body],
		[$.case_statement],
		[],
		// `x is A, b ?? c : d` - the compiler reads the list first and then the
		// ternary (`(x is A, b) ?? c : d`), so the ambiguity is declared rather
		// than resolved by precedence.
		[$.ternary_expression, $.is_list],
		// `print|parts.length|` reads two ways: the argument is the member
		// access `parts.length`, or `parts.length|` starts a zero-argument
		// method call that swallows the call's closing pipe. The grammar
		// cannot tell them apart with one token of lookahead, so both are
		// explored and the parse that completes wins.
		[$.member_access, $.method_call],
		// `x: 5` - an assignment with a colon, or a declaration whose type
		// is missing? The `=` after the type tells them apart.
		[$.variable_declaration, $.assignment],
		// `(x)` - a parenthesized identifier, or a lambda's parameter
		// list? `lambda_param` ties with the identifier reading on
		// purpose (both precedence 9): only the `:` after the bracket
		// tells them apart (`(x): x + 1` vs `(x) + 1`), so the conflict
		// explores both and the parse that completes wins.
		[$.expression, $.lambda_param],
		// Dangling `else`: GLR explores inner- and outer-attachment
		// and the parse that completes wins (an `else` after a `$`-less
		// inner arm can only complete attached inward).
		[$.if_statement],
		// Same for `when` with `else` (compiles to `#else`).
		[$.when_statement],
		// A `$`-less `when` arm vs the statements around it: the arm
		// reading is the only one that can complete.
		[$.when_body_open],
		[$._statement, $.expression],
		[$.switch_statement, $.switch_expression],
	],

	rules: {
		source_file: ($) =>
			seq(
				optional($.program_declaration),
				optional(
					seq(
						$._statement,
						repeat($._statement),
					),
				),
			),

		// Program declaration (package name)
		program_declaration: ($) =>
			seq("program", field("name", $.identifier)),

		_statement: ($) =>
			choice(
				$.import_statement,
				$.function_declaration,
				$.constant_declaration,
				$.enum_declaration,
				$.struct_declaration,
				$.alias_declaration,
				$.union_declaration,
				$.distinct_declaration,
				$.tuple_assignment,
				$.variable_declaration,
				$.assignment,
				$.if_statement,
				$.switch_statement,
				$.loop_statement,
				$.when_statement,
				$.return_statement,
				$.halt_statement,
				$.next_statement,
				$.assert_statement,
				$.defer_statement,
				$.method_call,
				$.call_expression,
			),

		// A comment runs to the end of the line. Ahoy writes them with a
		// leading `?`; `#` is the other spelling (and what the ahoy
		// compiler's own files use).
		comment: ($) =>
			token(
				prec(
					1,
					choice(
						seq("?", /[^?].*/),
						seq("#", /[^#].*/),
					),
				),
			),

		// Import statement
		import_statement: ($) => seq("import", field("path", $.string)),

		// Function declaration with @ prefix and optional :: syntax (always multi-line, always needs end).
		// Go-style receivers (@ (recv Type) name) and associated functions
		// (@ Type.name) share the shape.
		function_declaration: ($) =>
			seq(
				"@",
				optional(field("receiver", $.method_receiver)),
				field("name", choice(
					$.identifier,
					seq(field("type_name", $.identifier), ".", field("method_name", $.identifier)),
				)),
				optional("::"),
				"|",
				optional($.parameter_list),
				"|",
				optional(field("return_type", $.return_types)),
				":",
				field("body", $.function_body),
			),

		// Go-style method receiver: (recv Type), where Type is a plain name
		// or a one-level array[Element] shape (array[Box] receivers).
		method_receiver: ($) =>
			seq(
				"(",
				field("receiver_name", $.identifier),
				field("receiver_type", $.identifier),
				optional(seq("[", field("receiver_element", $.identifier), "]")),
				")",
			),

		function_body: ($) =>
			prec.right(
				seq(
					optional(
						seq(
							$._statement,
							repeat($._statement),
						),
					),
					"$",
				),
			),

		return_types: ($) => seq($.type, repeat(seq(",", $.type))),

		parameter_list: ($) => seq($.parameter, repeat(seq(",", $.parameter))),

		parameter: ($) =>
			seq(
				field("name", $.identifier),
				optional(seq(":", field("type", $.type)))
			),

		// The precedence keeps a list of types (the typed tuple assignment)
		// over a lambda's parameter list - the two look the same until the
		// `=` after the bracket.
		type: ($) =>
			prec(
				12,
				choice(
					"int",
				"float",
				"double",
				"string",
				"char",
				"bool",
				"dict",
				"array",
				"void",
				"any",
				"infer",
				$.identifier,
				$.array_type,
				$.dict_type,
				$.buffer_type,
					$.function_type,
				),
			),

		// array[int], array[array[int]]
		array_type: ($) =>
			prec(
				8,
				seq("array", "[", optional($.type), "]"),
			),

		// dict<string,int>
		dict_type: ($) =>
			prec(
				8,
				seq("dict", "<", optional($.type), ",", optional($.type), ">"),
			),

		// buffer[f32] - a flat POD buffer
		buffer_type: ($) =>
			prec(
				8,
				seq("buffer", "[", optional($.type), "]"),
			),

		// fn(int, string) -> int
		function_type: ($) =>
			seq(
				"fn",
				"(",
				optional(seq($.type, repeat(seq(",", $.type)))),
				")",
				choice("->", "=>"),
				$.type,
			),

		// Variable declaration. A bare `x: v` is ALWAYS a declaration
		// (the compiler says so: `:` declares, `=` reassigns), so the
		// inferred form outranks the `:`-spelling of `assignment` via
		// dynamic precedence. Without it, an unrelated syntax error
		// later in the file can flip an early declaration into an
		// assignment (seen live: `any_light: false` in light2d_build).
		variable_declaration: ($) =>
			choice(
				// Typed variable: x:int= 5
				seq(
					field("name", $.identifier),
					":",
					field("type", $.type),
					"=",
					field("value", $.expression)
				),
				// Inferred type: x: 5
				prec.dynamic(
					1,
					seq(field("name", $.identifier), ":", field("value", $.expression))
				)
			),

		// Constant declaration
		constant_declaration: ($) =>
			choice(
				seq(field("name", $.identifier), "::", field("value", $.expression)),
				seq(
					field("name", $.identifier),
					"::",
					field("type", $.type),
					"=",
					field("value", $.expression),
				),
			),

		// Assignment to an existing variable: x = v, x.f = v, x[0] = v
		assignment: ($) =>
			seq(
				field(
					"target",
					choice(
						$.identifier,
						$.member_access,
						$.array_access,
						$.dict_access,
					),
				),
				// The compiler takes both `=` and `:` as the assignment
				// sign, so `vals[i]: vals[i] + 1` is an assignment too.
				choice("=", ":"),
				field("value", $.expression),
			),

		// Struct declaration (single-line, multi-line, or empty: the
		// compiler accepts `struct S: $` with no fields).
		struct_declaration: ($) =>
			seq(
				"struct",
				optional(field("name", $.identifier)),
				":",
				choice(
					field("body", $.struct_body),
					"$",
				),
			),

		struct_body: ($) =>
			prec.right(
				seq(
					$.struct_field,
					repeat($.struct_field),
					// The multi-line form closes the struct with `$`; the
					// single-line form (`struct Foo: x:int`) just ends.
					// (An empty `struct S: $` is a separate alternative
					// on the declaration: this rule must match something.)
					optional("$"),
				),
			),

		struct_field: ($) =>
			prec.right(
				choice(
					// Regular field: x:int
					seq(
						optional("#"),
						field("name", $.identifier),
						":",
						field("type", $.type),
						// A component holds another by reference: vis: Point*
						optional("*"),
						// A field may carry a default: x: int = 0
						optional(seq("=", field("default", $.default_value))),
					),
					// Nested type - inline fields, no separate end
					seq(
						"type",
						field("name", $.identifier),
						":",
						repeat($.struct_field),
					),
				),
			),

		// The default value of a struct field: a number, a string, a bool,
		// a function reference (&name), or a plain value.
		default_value: ($) =>
			choice(
				seq("-", $.number),
				$.number,
				$.string,
				$.boolean,
				seq("&", $.identifier),
				$.identifier,
				$.member_access,
				$.array_literal,
				$.dict_literal,
				$.object_literal,
			),

		// Enum declaration (single-line, multi-line, or empty: the
		// compiler accepts `enum E: $` with no members).
		enum_declaration: ($) =>
			seq(
				"enum",
				// The base type is optional: `enum:int NodeKind:` says the
				// members are ints, `enum NodeKind:` lets the compiler
				// work it out.
				optional(seq(":", field("enum_type", $.type))),
				field("name", $.identifier),
				":",
				choice(
					field("members", $.enum_members),
					"$",
				),
			),

		enum_members: ($) =>
			prec.right(
				seq(
					$.enum_member,
					repeat($.enum_member),
					// The multi-line form closes the enum with `$`; the
					// single-line form (`enum Color: red; blue`) just ends.
					// (An empty `enum E: $` is a separate alternative on
					// the declaration: this rule must match something.)
					optional("$"),
				),
			),

		enum_member: ($) =>
			choice(
				// With value: 10 ten
				seq(field("value", $.number), field("name", $.identifier)),
				// Without value: ten
				field("name", $.identifier),
			),

		// Alias declaration
		alias_declaration: ($) =>
			seq(
				"alias",
				field("name", $.identifier),
				":",
				field("target_type", $.type),
			),

		// Distinct newtype: distinct NodeId: int
		distinct_declaration: ($) =>
			seq(
				"distinct",
				field("name", $.identifier),
				":",
				field("target_type", $.type),
			),

		// Union declaration
		union_declaration: ($) =>
			seq(
				"union",
				field("name", $.identifier),
				":",
				field("types", $.type_list),
			),

		// Tuple assignment (multiple assignment). The plain form takes
		// `:` or the walrus `:=` (the compiler's "smart
		// declare-or-reassign": `sx, sy, rs := f|x|`); the typed form
		// takes either before the type list too.
		tuple_assignment: ($) =>
			choice(
				// Typed: `a, b :(float, float) = values`. The types in
				// brackets look like a lambda's parameter list, so this
				// form wins on precedence: the `=` after the bracket is
				// what tells the two apart.
				prec(
					3,
					seq(
						field("targets", $.identifier_list),
						choice(":", ":="),
						"(",
						field("types", $.type_list),
						")",
						"=",
						field("values", $.tuple_values),
					),
				),
				// Plain: `a, b : values` or `a, b := values`
				seq(
					field("targets", $.identifier_list),
					choice(":", ":="),
					field("values", $.tuple_values),
				),
			),

		// Identifier or underscore (for discarding values in tuple assignments)
		identifier_or_discard: ($) => choice($.identifier, $.discard),

		identifier_list: ($) => seq($.identifier_or_discard, repeat1(seq(",", $.identifier_or_discard))),

		// The types of a typed tuple assignment: `(float, float)`. The
		// precedence keeps the list of types over a lambda's parameter
		// list - the two look the same until the `=`.
		type_list: ($) =>
			prec(
				12,
				seq(
					prec(12, $.type),
					repeat1(seq(",", prec(12, $.type))),
				),
			),

		expression_list: ($) => seq($.expression, repeat1(seq(",", $.expression))),

		// The values of a tuple assignment: one or more of them
		// (`a, b : g` unpacks a single value, `a, b : 1, 2` two).
		tuple_values: ($) => seq($.expression, repeat(seq(",", $.expression))),

		// If statement. The compiler requires `$` to close every block, so
		// the inline and the multi-line form are the same rule. `if COND
		// pass else BODY` is the deprecated pass-through check: an empty
		// then-arm, exactly `if not COND then BODY`. `guard COND else
		// BODY` is the canonical form; the `else` must diverge (`return`,
		// `halt`, `next`), there is no `then` and no `elif`.
		if_statement: ($) =>
			choice(
				seq(
					"guard",
						field("condition", $.expression),
						"else",
						field("alternative", $.if_body),
						"$",
					),
				seq(
					"if",
					field("condition", $.expression),
					"pass",
						"else",
						field("alternative", $.if_body),
						"$",
					),
				seq(
					"if",
					field("condition", $.expression),
					"then",
					// Arms may be empty (`if a then $` is legal), so
					// the consequence and the arm bodies are optional.
					optional(field("consequence", $.if_body)),
					repeat(
						seq(
							// Each arm may close with its own `$` (the
							// compiler consumes one per arm), so an
							// `elif` following a `$` still belongs to
							// this `if`; the final `$` closes it.
							optional("$"),
							"elif",
							field("alternative_condition", $.expression),
							"then",
							optional(field("alternative", $.if_body)),
						),
					),
					optional(
						seq(
							optional("$"),
							"else",
							optional(field("alternative", $.if_body)),
						),
					),
					"$",
				),
				),

		// The body of an if/elif/else block.
		//
		// The separator that ends the block belongs *after* a statement, never
		// before the next one: a repeat whose iteration is "separator then
		// statement" leaves the separator consumed when the statement is
		// missing, and the parser then sits in a state where the block's
		// closing `$` is not acceptable. With the separator after the
		// statement, a failed iteration rolls back cleanly.
		if_body: ($) =>
			prec.right(
				seq(
					$._statement,
					repeat($._statement),
				),
			),

		// Switch statement (always multi-line, always needs end)
		switch_statement: ($) =>
			seq(
				"switch",
				field("value", $.expression),
				":",
				field("cases", $.switch_body),
			),

		// A switch used as a value:
		//
		//   word: string = switch anchor:
		//       on 0: "TL"
		//       _: "TL"
		//   $
		//
		// The compiler parses `switch` as a primary expression. The grammar
		// needs a separate rule here: reusing switch_statement directly in
		// `expression` makes the parser prefer the identifier reading of
		// `switch`, so `on` never becomes a keyword.
		switch_expression: ($) =>
			seq(
				"switch",
				field("value", $.expression),
				":",
				field("cases", $.switch_body),
			),

		switch_body: ($) =>
			// A switch with no cases (`switch v: $`) is legal.
			prec.right(
				seq(
					repeat($.case_statement),
					"$",
				),
			),

		case_statement: ($) =>
			prec.right(
				seq(
					choice(
						seq(
							"on",
							field(
								"pattern",
								choice(
									$.expression,
									// Multiple cases: 'A','B'
									seq($.expression, repeat1(seq(",", $.expression))),
								),
							),
						),
						seq(
							field(
								"pattern",
								alias($.discard, $.identifier_or_discard),
							),
						),
					),
					":",
					optional(
						field(
							"body",
							choice(
								prec.left(
									seq(
										$._statement,
										repeat($._statement),
									),
								),
								$.expression,
							),
						),
					),
				),
			),

		// Loop statement (single-line or multi-line)
		loop_statement: ($) =>
			seq(
				"loop",
				choice(
					// Range loop with variable: loop i:start to end
					seq(
						field("variable", $.identifier),
						":",
						field("start", $.expression),
						"to",
						field("end", $.expression),
					),
					// Range loop without init: loop i to end
					seq(
						field("variable", $.identifier),
						"to",
						field("end", $.expression),
					),
					// Loop with init and a condition: loop i:start until cond
					seq(
						field("variable", $.identifier),
						":",
						field("start", $.expression),
						choice("until", "while", "till"),
						field("condition", $.expression),
					),
					// Loop with a condition: loop i until cond
					seq(
						field("variable", $.identifier),
						choice("until", "while", "till"),
						field("condition", $.expression),
					),
					// Loop with only a condition: loop until cond
					seq(choice("until", "while", "till"), field("condition", $.expression)),
					// Forever loop with counter: loop i:start
					seq(
						field("variable", $.identifier),
						":",
						field("start", $.expression),
					),
					// Forever loop without args: loop
					seq(),
					// Array loop: loop element in array
					seq(
						field("element", $.identifier),
						"in",
						field("iterable", $.expression),
					),
					// Dict loop: loop key,value in dict
					seq(
						field("key", $.identifier),
						",",
						field("value", $.identifier),
						"in",
						field("iterable", $.expression),
					),
				),
				choice("do", ":"),
				field("body", $.loop_body),
			),

		loop_body: ($) =>
			// An empty loop (`loop ... do $`) is legal.
			prec.right(
				seq(
					repeat($._statement),
					"$",
				),
			),

		// When statement (compile-time conditional, always multi-line).
		// With `else` it compiles to `#else`. The `$` belongs to the
		// bodies: `when C then B $ else B2 $`, or with no `$` before a
		// bare `else`, `when C then B else B2 $`. Both are explored and
		// the parse that completes wins.
		when_statement: ($) =>
			seq(
				"when",
				field("condition", $.identifier),
				"then",
				choice(
					seq(
						field("body", $.when_body),
						optional(
							seq(
								"else",
								field("alternative", $.when_body),
							),
						),
					),
					seq(
						field("body", $.when_body_open),
						"else",
						field("alternative", $.when_body),
					),
				),
			),

		// A `when` arm whose `$` was left off before a bare `else`.
		when_body_open: ($) =>
			prec.right(
				seq(
					$._statement,
					repeat($._statement),
				),
			),

		when_body: ($) =>
			// An empty `when` (`when C then $`) is legal. A body that
			// ends at a bare `else` without `$` uses `when_body_open`
			// instead (the second `when_statement` branch above).
			prec.right(
				seq(
					repeat($._statement),
					"$",
				),
			),

		// Return statement
		return_statement: ($) =>
			prec.right(
				seq("return", optional(field("value", $.expression_list_or_single))),
			),

		expression_list_or_single: ($) => choice($.expression_list, $.expression),

		// Halt statement (exit loop)
		halt_statement: ($) => "halt",

		// Next statement (continue to next iteration)
		next_statement: ($) => "next",

		// Assert statement: assert x > 0
		assert_statement: ($) =>
			seq("assert", field("condition", $.expression)),

		// Defer statement: defer cleanup||
		defer_statement: ($) =>
			seq(
				"defer",
				field(
					"statement",
					choice(
						$.call_expression,
						$.method_call,
						$.variable_declaration,
					),
				),
			),

		// Expressions
		expression: ($) =>
			choice(
				$.switch_expression,
				$.ternary_expression,
				$.binary_expression,
				$.is_list,
				$.unary_expression,
				$.address_of,
				$.cast_expression,
				$.lambda,
				$.call_expression,
				$.method_call,
				$.array_access,
				$.dict_access,
				$.member_access,
				$.array_literal,
				$.dict_literal,
				$.typed_object_literal,
				$.object_literal,
				// An identifier used as a call argument (print|x|) must reduce to an
				// expression; without the precedence it shifted the closing pipe as
				// the start of a nested call (x|...|) and failed at the end of the
				// statement. Nested calls are not valid Ahoy anyway.
				prec(9, $.identifier),
				$.number,
				$.string,
				$.f_string,
				$.raw_string,
				$.char,
				$.boolean,
				$.parenthesized_expression,
			),

		// Ternary expression
		ternary_expression: ($) =>
			prec.right(
				0,
				seq(
					field("condition", $.expression),
					"??",
					field("consequence", $.expression),
					":",
					field("alternative", $.expression),
				),
			),

		// Comma sugar for repeated comparisons against the same subject:
		//   x is A, B, C      (any-of)
		//   x is not A, B, C  (none-of)
		// Requires at least one comma so plain `x is y` keeps parsing as a
		// binary expression. Inside array/object/dict literals the compiler
		// treats commas as separators, so the list rule does not apply there
		// (tree-sitter still matches it; highlighting only).
		is_list: ($) =>
			prec.left(
				6,
				seq(
					field("subject", $.expression),
					choice(seq("is", "not"), "is"),
					field("value", $.expression),
					repeat1(seq(",", field("value", $.expression))),
				),
			),

		// Binary expressions with precedence.
		// The word bitwise operators follow C: band binds tighter than bxor,
		// which binds tighter than bor, and the shifts sit between the
		// additive operators and the comparisons.
		binary_expression: ($) =>
			choice(
				// Logical OR
				prec.left(
					1,
					seq(
						field("left", $.expression),
						field("operator", "or"),
						field("right", $.expression),
					),
				),
				// Logical AND
				prec.left(
					2,
					seq(
						field("left", $.expression),
						field("operator", "and"),
						field("right", $.expression),
					),
				),
				// Bitwise OR
				prec.left(
					3,
					seq(
						field("left", $.expression),
						field("operator", "bor"),
						field("right", $.expression),
					),
				),
				// Bitwise XOR
				prec.left(
					4,
					seq(
						field("left", $.expression),
						field("operator", "bxor"),
						field("right", $.expression),
					),
				),
				// Bitwise AND
				prec.left(
					5,
					seq(
						field("left", $.expression),
						field("operator", "band"),
						field("right", $.expression),
					),
				),
				// Comparison
				prec.left(
					6,
					seq(
						field("left", $.expression),
						field(
							"operator",
							choice("is", seq("is", "not"), ">", "<", ">=", "<="),
						),
						field("right", $.expression),
					),
				),
				// Shifts
				prec.left(
					7,
					seq(
						field("left", $.expression),
						field("operator", choice("shl", "shr")),
						field("right", $.expression),
					),
				),
				// Addition/Subtraction
				prec.left(
					8,
					seq(
						field("left", $.expression),
						field("operator", choice("+", "-")),
						field("right", $.expression),
					),
				),
				// Multiplication/Division/Modulo
				prec.left(
					9,
					seq(
						field("left", $.expression),
						field("operator", choice("*", "/", "%")),
						field("right", $.expression),
					),
				),
				// Power/Exponentiation (right-associative)
				prec.right(
					10,
					seq(
						field("left", $.expression),
						field("operator", "**"),
						field("right", $.expression),
					),
				),
			),

		// Unary expressions
		unary_expression: ($) =>
			prec.right(
				7,
				seq(
					field("operator", choice("not", "-", "bnot")),
					field("operand", $.expression),
				),
			),

		// Address of a function or variable: &name
		address_of: ($) =>
			prec(
				11,
				seq(
					"&",
					field("value", choice($.identifier, $.member_access)),
				),
			),

		// A cast in the paren form: i64(3), f32(1.5), int("42")
		cast_expression: ($) =>
			prec(
				11,
				seq(
					field(
						"type",
						choice(
							"int",
							"float",
							"double",
							"char",
							"string",
							$.identifier,
						),
					),
					"(",
					field("value", $.expression),
					")",
				),
			),

		// A lambda value: (a, b): a + b, (x:int): x * 2
		lambda: ($) =>
			prec(
				11,
				seq(
					"(",
					optional(
						seq($.lambda_param, repeat(seq(",", $.lambda_param))),
					),
					")",
					":",
					field("body", $.expression),
				),
			),

		lambda_param: ($) =>
			// Precedence 9 ties with the identifier reading of an
			// expression on purpose: see the conflict above.
			prec(
				9,
				seq(
					field("name", $.identifier),
					optional(seq(":", field("type", $.type))),
				),
			),

		// Function call. A call with no arguments is written with a doubled
		// pipe (`f||`), which is a single token here - the same trick the
		// method call uses, so the two stay apart. The primitive types can
		// also be called with pipes (`int|x|`, `float|1.5|`): the compiler
		// reads those as conversion calls, and the keyword can never be a
		// plain identifier, so there is no new ambiguity.
		call_expression: ($) =>
			prec(
				7,
				choice(
					seq(
						field("function", $.identifier),
						"|",
						optional($.argument_list),
						"|",
					),
					seq(
						field("function", $.identifier),
						"||",
					),
					seq(
						field("function", choice("int", "float", "double", "char", "string")),
						"|",
						optional($.argument_list),
						"|",
					),
					seq(
						field("function", choice("int", "float", "double", "char", "string")),
						"||",
					),
				),
			),

		argument_list: ($) => seq($.expression, repeat(seq(",", $.expression))),

		// Method call (arr.map|x|, arr.pop||)
		method_call: ($) =>
			prec(
				9,
				choice(
					seq(
						field(
							"object",
							choice(
								$.identifier,
								$.call_expression,
								$.member_access,
								$.method_call,
								$.array_access,
								$.dict_access,
							),
						),
						".",
						field("method", $.identifier),
						"|",
						$.argument_list,
						"|",
					),
					// A zero-argument call is written with a doubled pipe
					// (arr.pop||), which is a single token here. That keeps it
					// apart from the pipe that closes an enclosing call's
					// argument list.
					seq(
						field(
							"object",
							choice(
								$.identifier,
								$.call_expression,
								$.member_access,
								$.method_call,
								$.array_access,
								$.dict_access,
							),
						),
						".",
						field("method", $.identifier),
						"||",
					),
				),
			),

		// Array access with []
		array_access: ($) =>
			prec(
				8,
				seq(
					field(
						"array",
						choice(
							$.identifier,
							$.call_expression,
							$.member_access,
							$.array_access,
							$.dict_access,
							$.method_call,
						),
					),
					"[",
					field("index", $.expression),
					"]",
				),
			),

		// Dict access with <>.
		// NOTE: this rule is effectively unmatched today (see below).
		// The closing `>` must not be read as a comparison operator, so the
		// rule outranks the comparison: at `<"k">` the parser closes the
		// access instead of shifting `>` into the value expression.
		//
		// KNOWN LIMITATION: `d<"k">`/`d<key>` still parse as a `<`
		// comparison plus a stray `>`. Tree-sitter's lexer yields one
		// token per position, so the `<` can only ever feed one rule:
		// the comparison wins the tie and the access never advances.
		// Any precedence that flips the tie breaks real comparisons
		// (`a<b` reads as dict-`a` missing its `>`), which is worse:
		// comparisons are everywhere, dict access has no engine, demo
		// or game sites (only two in the already-broken tools/gd_shim).
		// The compiler accepts both spellings (its gate looks ahead to
		// the `>`); a future fix needs the gate's two-token lookahead,
		// which tree-sitter cannot express. Verified by experiment in
		// detail; do not "fix" this with precedence tweaks alone.
		dict_access: ($) =>
			seq(
				field(
					"dict",
					choice(
						$.identifier,
						$.call_expression,
						$.member_access,
						$.array_access,
						$.dict_access,
						$.method_call,
					),
				),
				token(prec(-1, "<")),
				field("key", $.string),
				token(prec(1, ">")),
			),

		// Member access with dot notation.
		// Same precedence as method_call on purpose: `print|parts.length|` reads
		// two ways (the argument is the member access, or `parts.length|` starts
		// a method call that eats the closing pipe) and only GLR can settle it.
		member_access: ($) =>
			prec(
				9,
				seq(
					field(
						"object",
						choice(
							$.identifier,
							$.call_expression,
							$.member_access,
							$.array_access,
							$.dict_access,
						),
					),
					".",
					field("member", $.identifier),
				),
			),

		// Array literal with []
		array_literal: ($) =>
			seq(
				"[",
				optional(
					seq(
						$.expression,
						repeat(seq(",", $.expression)),
						optional(","),
					),
				),
				"]",
			),

		// Dict literal with <>
		dict_literal: ($) =>
			seq(
				token(prec(-1, "<")),
				optional(seq($.dict_pair, repeat(seq(",", $.dict_pair)))),
				token(prec(1, ">")),
			),

		// Object literal with <>
		// Object literal with {} - object{key: value, key2: value2}
		object_literal: ($) =>
			seq(
				"{",
				optional(seq($.object_pair, repeat(seq(optional(","), $.object_pair)))),
				optional(","),
				"}",
			),

		// Typed object literal: rectangle{x: 1, y: 2}
		typed_object_literal: ($) =>
			seq(
				field("type_name", $.identifier),
				"{",
				optional(seq($.object_pair, repeat(seq(optional(","), $.object_pair)))),
				optional(","),
				"}",
			),

		object_pair: ($) =>
			seq(
				field("key", choice($.identifier, $.string)),
				":",
				field("value", $.expression),
			),

		dict_pair: ($) =>
			seq(field("key", $.string), ":", field("value", $.expression)),


		// Parenthesized expression
		parenthesized_expression: ($) => seq("(", $.expression, ")"),

		// Primitives
		// A bare `_` is a discard/default-case marker, not an identifier.
		// The token precedence makes the lexer pick `discard` over the
		// otherwise-matching `identifier` for the same one-character text.
		identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,
		discard: ($) => token(prec(10, "_")),

		number: ($) =>
			choice(
				/\d[\d_]*\.\d[\d_]*/, // float with underscores (e.g., 1_000.50)
				/\d[\d_]*/, // int with underscores (e.g., 1_000_000)
			),

		string: ($) => token(seq('"', repeat(choice(/[^"\\]/, /\\./)), '"')),

		// Raw string (backtick) - preserves newlines, no escape sequences
		raw_string: ($) => token(seq('`', /[^`]*/, '`')),

		// f"text {expr}" - interpolation is kept inside the token. The compiler
		// parses it; for highlighting the whole literal is a string.
		f_string: ($) => token(prec(10, seq('f"', /([^"\\]|\\.)*/, '"'))),

		char: ($) => token(seq("'", choice(/[^'\\]/, /\\./), "'")),

		boolean: ($) => choice("true", "false"),
	},
});
