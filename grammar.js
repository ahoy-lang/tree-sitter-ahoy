module.exports = grammar({
	name: "ahoy",

	word: ($) => $.identifier,

	extras: ($) => [
		/\s/, // All whitespace including newlines
		$.comment,
	],

	conflicts: ($) => [
		[$.typed_object_literal, $.expression],
		[$.function_body],
		[$.case_statement],
		[$.struct_field_multiline],
	],

	rules: {
		source_file: ($) =>
			seq(
				repeat(choice(";", "\n")),
				optional($.program_declaration),
				optional(
					seq(
						$._statement,
						repeat(seq(repeat1(choice(";", "\n")), $._statement)),
						repeat(choice(";", "\n")),
					),
				),
			),

		// Program declaration (package name)
		program_declaration: ($) =>
			seq("program", field("name", $.identifier), repeat1(choice(";", "\n"))),

		_statement: ($) =>
			choice(
				$.import_statement,
				$.function_declaration,
				$.constant_declaration,
				$.enum_declaration,
				$.struct_declaration,
				$.tuple_assignment,
				$.variable_declaration,
				$.if_statement,
				$.switch_statement,
				$.loop_statement,
				$.when_statement,
				$.return_statement,
				$.halt_statement,
				$.next_statement,
				$.method_call,
				$.call_expression,
			),

		comment: ($) => token(prec(1, seq("?", /[^?].*/))),

		// Import statement
		import_statement: ($) => seq("import", field("path", $.string)),

		// Function declaration with :: syntax (always multi-line, always needs end)
		function_declaration: ($) =>
			seq(
				field("name", $.identifier),
				"::",
				"|",
				optional($.parameter_list),
				"|",
				optional(field("return_type", $.return_types)),
				":",
				field("body", $.function_body),
			),

		function_body: ($) =>
			prec.right(
				seq(
					repeat(choice(";", "\n")),
					repeat($._statement),
					repeat(choice(";", "\n")),
					"$",
				),
			),

		return_types: ($) => seq($.type, repeat(seq(",", $.type))),

		parameter_list: ($) => seq($.parameter, repeat(seq(",", $.parameter))),

		parameter: ($) =>
			seq(field("name", $.identifier), ":", field("type", $.type)),

		type: ($) =>
			choice(
				"int",
				"float",
				"string",
				"bool",
				"dict",
				"vector2",
				"color",
				$.identifier,
			),

		// Variable declaration
		variable_declaration: ($) =>
			seq(field("name", $.identifier), ":", field("value", $.expression)),

		// Constant declaration
		constant_declaration: ($) =>
			seq(field("name", $.identifier), "::", field("value", $.expression)),

		// Struct declaration (single-line or multi-line)
		struct_declaration: ($) =>
			choice(
				// Single-line: struct Foo: x:int; y:int; type Bar: z:int
				seq(
					"struct",
					optional(field("name", $.identifier)),
					":",
					field("body", $.struct_body_oneline),
				),
				// Multi-line: struct Foo: ... end
				seq(
					"struct",
					optional(field("name", $.identifier)),
					":",
					field("body", $.struct_body_multiline),
				),
			),

		struct_body_oneline: ($) =>
			prec.right(
				seq(
					$.struct_field_oneline,
					repeat(seq(";", $.struct_field_oneline)),
					optional(";"),
				),
			),

		struct_body_multiline: ($) =>
			seq(
				repeat1(choice(";", "\n")),
				$.struct_field_multiline,
				repeat(seq(repeat1(choice(";", "\n")), $.struct_field_multiline)),
				repeat(choice(";", "\n")),
				"$",
			),

		struct_field_oneline: ($) =>
			choice(
				// Regular field: x:int
				seq(field("name", $.identifier), ":", field("type", $.type)),
				// Nested type (oneline): type Foo: x:int; y:int
				seq("type", field("name", $.identifier), ":", $.struct_body_oneline),
			),

		struct_field_multiline: ($) =>
			choice(
				// Regular field with optional default: x:int or 10 x:int
				seq(
					optional(seq(field("default", $.expression))),
					field("name", $.identifier),
					":",
					field("type", $.type),
				),
				// Nested type - inline fields, no separate end
				seq(
					"type",
					field("name", $.identifier),
					":",
					repeat1(choice(";", "\n")),
					$.struct_field_multiline,
					repeat(seq(repeat1(choice(";", "\n")), $.struct_field_multiline)),
				),
			),

		// Enum declaration (single-line or multi-line)
		enum_declaration: ($) =>
			choice(
				// Single-line: enum Color: red; blue; green or enum Num: 10 ten; 20 twenty
				seq(
					"enum",
					field("name", $.identifier),
					":",
					field("members", $.enum_members_oneline),
				),
				// Multi-line: enum Color: ... end
				seq(
					"enum",
					field("name", $.identifier),
					":",
					field("members", $.enum_members_multiline),
				),
			),

		enum_members_oneline: ($) =>
			prec.right(
				seq($.enum_member, repeat(seq(";", $.enum_member)), optional(";")),
			),

		enum_members_multiline: ($) =>
			seq(
				repeat1(choice(";", "\n")),
				$.enum_member,
				repeat(seq(repeat1(choice(";", "\n")), $.enum_member)),
				repeat(choice(";", "\n")),
				"$",
			),

		enum_member: ($) =>
			choice(
				// With value: 10 ten
				seq(field("value", $.number), field("name", $.identifier)),
				// Without value: ten
				field("name", $.identifier),
			),

		// Tuple assignment (multiple assignment)
		tuple_assignment: ($) =>
			seq(
				field("targets", $.identifier_list),
				":",
				field("values", $.expression_list),
			),

		identifier_list: ($) => seq($.identifier, repeat1(seq(",", $.identifier))),

		expression_list: ($) => seq($.expression, repeat1(seq(",", $.expression))),

		// If statement (single-line or multi-line)
		if_statement: ($) =>
			choice(
				// Single-line: if x then a|| anif y then b|| else c||
				$.if_statement_oneline,
				// Multi-line: if x: ... end
				$.if_statement_multiline,
			),

		if_statement_oneline: ($) =>
			prec.right(
				seq(
					"if",
					field("condition", $.expression),
					"then",
					field("consequence", choice($.call_expression, $.method_call)),
					repeat(
						seq(
							"anif",
							field("alternative_condition", $.expression),
							"then",
							field("alternative", choice($.call_expression, $.method_call)),
						),
					),
					optional(
						seq(
							"else",
							field("alternative", choice($.call_expression, $.method_call)),
						),
					),
				),
			),

		if_statement_multiline: ($) =>
			prec.right(
				seq(
					"if",
					field("condition", $.expression),
					choice("then", ":"),
					field("consequence", $.if_body),
					repeat(
						seq(
							repeat(choice(";", "\n")),
							"anif",
							field("alternative_condition", $.expression),
							choice("then", ":"),
							field("alternative", $.if_body),
						),
					),
					optional(
						seq(
							repeat(choice(";", "\n")),
							"else",
							optional(choice("then", ":")),
							field("alternative", $.if_body),
						),
					),
					repeat(choice(";", "\n")),
					"$",
				),
			),

		if_body: ($) =>
			prec.right(seq(repeat1(choice(";", "\n")), repeat1($._statement))),

		// Switch statement (always multi-line, always needs end)
		switch_statement: ($) =>
			seq(
				"switch",
				field("value", $.expression),
				choice("then", "on", ":"),
				field("cases", $.switch_body),
			),

		switch_body: ($) =>
			prec.right(
				seq(
					repeat(choice(";", "\n")),
					repeat1($.case_statement),
					repeat(choice(";", "\n")),
					"$",
				),
			),

		case_statement: ($) =>
			seq(
				field(
					"pattern",
					choice(
						$.expression,
						"_",
						// Multiple cases: 'A','B'
						seq($.expression, repeat1(seq(",", $.expression))),
					),
				),
				":",
				field(
					"body",
					choice(
						$.call_expression,
						$.method_call,
						seq(repeat1(choice(";", "\n")), repeat1($._statement)),
					),
				),
			),

		// Loop statement (single-line or multi-line)
		loop_statement: ($) =>
			choice(
				// Single-line: loop i:0 to 10 do print|i|
				$.loop_statement_oneline,
				// Multi-line: loop i:0 to 10 do ... end
				$.loop_statement_multiline,
			),

		loop_statement_oneline: ($) =>
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
					// While loop with init and till: loop i:start till condition
					seq(
						field("variable", $.identifier),
						":",
						field("start", $.expression),
						"till",
						field("condition", $.expression),
					),
					// While loop with till: loop i till condition
					seq(
						field("variable", $.identifier),
						"till",
						field("condition", $.expression),
					),
					// While loop without variable: loop till condition
					seq("till", field("condition", $.expression)),
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
				"do",
				field("body", choice($.call_expression, $.method_call)),
			),

		loop_statement_multiline: ($) =>
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
					// While loop with init and till: loop i:start till condition
					seq(
						field("variable", $.identifier),
						":",
						field("start", $.expression),
						"till",
						field("condition", $.expression),
					),
					// While loop with till: loop i till condition
					seq(
						field("variable", $.identifier),
						"till",
						field("condition", $.expression),
					),
					// While loop without variable: loop till condition
					seq("till", field("condition", $.expression)),
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
			prec.right(
				seq(
					repeat1(choice(";", "\n")),
					repeat1($._statement),
					repeat(choice(";", "\n")),
					"$",
				),
			),

		// When statement (compile-time conditional, always multi-line)
		when_statement: ($) =>
			seq(
				"when",
				field("condition", $.identifier),
				"then",
				field("body", $.when_body),
			),

		when_body: ($) =>
			prec.right(
				seq(
					repeat1(choice(";", "\n")),
					repeat1($._statement),
					repeat(choice(";", "\n")),
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

		// Expressions
		expression: ($) =>
			choice(
				$.ternary_expression,
				$.binary_expression,
				$.unary_expression,
				$.call_expression,
				$.method_call,
				$.array_access,
				$.dict_access,
				$.member_access,
				$.array_literal,
				$.dict_literal,
				$.typed_object_literal,
				$.object_literal,
				$.identifier,
				$.number,
				$.string,
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

		// Binary expressions with precedence
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
				// Comparison
				prec.left(
					3,
					seq(
						field("left", $.expression),
						field(
							"operator",
							choice("is", ">", "<", ">=", "<=", "greater_than", "less_than"),
						),
						field("right", $.expression),
					),
				),
				// Addition/Subtraction
				prec.left(
					4,
					seq(
						field("left", $.expression),
						field("operator", choice("+", "-", "plus", "minus")),
						field("right", $.expression),
					),
				),
				// Multiplication/Division/Modulo
				prec.left(
					5,
					seq(
						field("left", $.expression),
						field("operator", choice("*", "/", "%", "times", "div", "mod")),
						field("right", $.expression),
					),
				),
			),

		// Unary expressions
		unary_expression: ($) =>
			prec.right(
				6,
				seq(
					field("operator", choice("not", "-")),
					field("operand", $.expression),
				),
			),

		// Function call
		call_expression: ($) =>
			prec(
				7,
				seq(
					field("function", $.identifier),
					"|",
					optional($.argument_list),
					"|",
				),
			),

		argument_list: ($) => seq($.expression, repeat(seq(",", $.expression))),

		// Method call (arr.map||, arr.push|val|)
		method_call: ($) =>
			prec(
				10,
				seq(
					field(
						"object",
						choice(
							$.identifier,
							$.call_expression,
							$.member_access,
							$.method_call,
						),
					),
					".",
					field("method", $.identifier),
					"|",
					optional($.argument_list),
					"|",
				),
			),

		// Array access with []
		array_access: ($) =>
			prec(
				8,
				seq(
					field("array", choice($.identifier, $.call_expression)),
					"[",
					field("index", $.expression),
					"]",
				),
			),

		// Dict access with {}
		dict_access: ($) =>
			prec(
				8,
				seq(
					field("dict", choice($.identifier, $.call_expression)),
					"{",
					field("key", $.string),
					"}",
				),
			),

		// Member access with dot notation
		member_access: ($) =>
			prec(
				9,
				seq(
					field(
						"object",
						choice($.identifier, $.call_expression, $.member_access),
					),
					".",
					field("member", $.identifier),
				),
			),

		// Array literal with []
		array_literal: ($) =>
			seq(
				"[",
				optional(seq($.expression, repeat(seq(",", $.expression)))),
				"]",
			),

		// Dict literal with {}
		dict_literal: ($) =>
			seq("{", optional(seq($.dict_pair, repeat(seq(",", $.dict_pair)))), "}"),

		// Object literal with <>
		object_literal: ($) =>
			seq(
				"<",
				optional(seq($.object_pair, repeat(seq(",", $.object_pair)))),
				">",
			),

		// Typed object literal: rectangle<x: 1, y: 2>
		typed_object_literal: ($) =>
			seq(
				field("type_name", $.identifier),
				"<",
				optional(seq($.object_pair, repeat(seq(",", $.object_pair)))),
				">",
			),

		object_pair: ($) =>
			seq(field("key", $.identifier), ":", field("value", $.expression)),

		dict_pair: ($) =>
			seq(field("key", $.string), ":", field("value", $.expression)),

		// Parenthesized expression
		parenthesized_expression: ($) => seq("(", $.expression, ")"),

		// Primitives
		identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,

		number: ($) =>
			choice(
				/\d+\.\d+/, // float
				/\d+/, // int
			),

		string: ($) => token(seq('"', repeat(choice(/[^"\\]/, /\\./)), '"')),

		char: ($) => token(seq("'", choice(/[^'\\]/, /\\./), "'")),

		boolean: ($) => choice("true", "false"),
	},
});
