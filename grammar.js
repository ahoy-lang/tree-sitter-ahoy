module.exports = grammar({
  name: 'ahoy',

  extras: $ => [
    /\s/,
    $.comment,
  ],

  conflicts: $ => [
    [$.call_expression, $.expression],
    [$.array_access, $.array_literal],
    [$.dict_access, $.dict_literal],
    [$.object_literal, $.dict_literal],
    [$._statement, $.if_statement],
    [$._statement, $.case_statement],
  ],

  rules: {
    source_file: $ => seq(
      repeat(choice(';', '\n')),
      optional($.program_declaration),
      optional(seq(
        $._statement,
        repeat(seq(
          repeat1(choice(';', '\n')),
          $._statement,
        )),
        repeat(choice(';', '\n')),
      )),
    ),

    // Program declaration (package name)
    program_declaration: $ => seq(
      'program',
      field('name', $.identifier),
      repeat1(choice(';', '\n')),
    ),

    _statement: $ => choice(
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

    comment: $ => token(prec(1, seq('?', /[^?].*/))),

    // Import statement
    import_statement: $ => seq(
      'import',
      field('path', $.string),
    ),

    // Function declaration with :: syntax
    function_declaration: $ => seq(
      field('name', $.identifier),
      '::',
      '|',
      optional($.parameter_list),
      '|',
      optional(field('return_type', $.return_types)),
      ':',
      field('body', $.block),
    ),

    return_types: $ => seq(
      $.type,
      repeat(seq(',', $.type)),
    ),

    parameter_list: $ => seq(
      $.parameter,
      repeat(seq(',', $.parameter)),
    ),

    parameter: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $.type),
    ),

    type: $ => choice(
      'int',
      'float',
      'string',
      'bool',
      'dict',
      'vector2',
      'color',
      $.identifier,
    ),

    // Variable declaration
    variable_declaration: $ => seq(
      field('name', $.identifier),
      ':',
      field('value', $.expression),
    ),

    // Constant declaration
    constant_declaration: $ => seq(
      field('name', $.identifier),
      '::',
      field('value', $.expression),
    ),

    // Struct declaration
    struct_declaration: $ => seq(
      'struct',
      optional(field('name', $.identifier)),
      ':',
      field('body', $.struct_body),
    ),

    struct_body: $ => prec.right(seq(
      repeat(choice(';', '\n')),
      $.struct_field,
      repeat(seq(
        repeat1(choice(';', '\n')),
        $.struct_field,
      )),
      repeat(choice(';', '\n')),
    )),

    struct_field: $ => choice(
      // Regular field: position: vector2
      seq(
        field('name', $.identifier),
        ':',
        field('type', $.type),
      ),
      // Nested type: type smoke_particle: ...
      prec.right(seq(
        'type',
        field('name', $.identifier),
        ':',
        optional($.struct_body),
      )),
    ),

    // Enum declaration
    enum_declaration: $ => seq(
      'enum',
      field('name', $.identifier),
      ':',
      field('members', $.enum_members),
    ),

    enum_members: $ => prec.right(seq(
      repeat(choice(';', '\n')),
      $.identifier,
      repeat(seq(
        repeat1(choice(';', '\n')),
        $.identifier,
      )),
      repeat(choice(';', '\n')),
    )),

    // Tuple assignment (multiple assignment)
    tuple_assignment: $ => seq(
      field('targets', $.identifier_list),
      ':',
      field('values', $.expression_list),
    ),

    identifier_list: $ => seq(
      $.identifier,
      repeat1(seq(',', $.identifier)),
    ),

    expression_list: $ => seq(
      $.expression,
      repeat1(seq(',', $.expression)),
    ),

    // If statement (supports inline and multi-line)
    if_statement: $ => prec.right(seq(
      'if',
      field('condition', $.expression),
      'then',
      field('consequence', choice($.block, $.call_expression)),
      optional(choice(
        seq(
          'anif',
          field('alternative_condition', $.expression),
          'then',
          field('alternative', choice($.block, $.call_expression)),
        ),
        seq(
          'else',
          optional('then'),
          field('alternative', choice($.block, $.call_expression)),
        ),
      )),
    )),

    // Switch statement
    switch_statement: $ => prec.right(seq(
      'switch',
      field('value', $.expression),
      choice('then', 'on', ':'),
      repeat1($.case_statement),
    )),

    case_statement: $ => seq(
      field('pattern', choice($.expression, '_')),
      ':',
      field('body', choice($.block, $.call_expression)),
    ),

    // Loop statement (multiple variants)
    loop_statement: $ => seq(
      'loop',
      choice(
        // Range loop with variable: loop i from start to end
        seq(
          field('variable', $.identifier),
          'from',
          field('start', $.expression),
          'to',
          field('end', $.expression),
        ),
        // Range loop: loop from start to end
        seq(
          'from',
          field('start', $.expression),
          'to',
          field('end', $.expression),
        ),
        // While loop with till: loop till condition
        seq(
          field('variable', $.identifier),
          'till',
          field('condition', $.expression),
        ),
        // While loop: loop condition
        field('condition', $.expression),
        // Array loop: loop element in array
        seq(
          field('element', $.identifier),
          'in',
          field('iterable', $.expression),
        ),
        // Dict loop: loop key,value in dict
        seq(
          field('key', $.identifier),
          ',',
          field('value', $.identifier),
          'in',
          field('iterable', $.expression),
        ),
      ),
      choice('do', ':'),
      field('body', $.block),
    ),

    // When statement (compile-time conditional)
    when_statement: $ => seq(
      'when',
      field('condition', $.identifier),
      'then',
      field('body', $.block),
    ),

    // Return statement
    return_statement: $ => prec.right(seq(
      'return',
      optional(field('value', $.expression)),
    )),

    // Halt statement (exit loop)
    halt_statement: $ => 'halt',

    // Next statement (continue to next iteration)
    next_statement: $ => 'next',

    // Block
    block: $ => prec.right(seq(
      repeat(choice(';', '\n')),
      $._statement,
      repeat(seq(
        repeat1(choice(';', '\n')),
        $._statement,
      )),
      repeat(choice(';', '\n')),
    )),

    // Expressions
    expression: $ => choice(
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
      $.object_literal,
      $.identifier,
      $.number,
      $.string,
      $.char,
      $.boolean,
      $.parenthesized_expression,
    ),

    // Ternary expression
    ternary_expression: $ => prec.right(0, seq(
      field('condition', $.expression),
      '??',
      field('consequence', $.expression),
      ':',
      field('alternative', $.expression),
    )),

    // Binary expressions with precedence
    binary_expression: $ => choice(
      // Logical OR
      prec.left(1, seq(
        field('left', $.expression),
        field('operator', 'or'),
        field('right', $.expression),
      )),
      // Logical AND
      prec.left(2, seq(
        field('left', $.expression),
        field('operator', 'and'),
        field('right', $.expression),
      )),
      // Comparison
      prec.left(3, seq(
        field('left', $.expression),
        field('operator', choice(
          'is',
          '>',
          '<',
          '>=',
          '<=',
          'greater_than',
          'less_than',
        )),
        field('right', $.expression),
      )),
      // Addition/Subtraction
      prec.left(4, seq(
        field('left', $.expression),
        field('operator', choice('+', '-', 'plus', 'minus')),
        field('right', $.expression),
      )),
      // Multiplication/Division/Modulo
      prec.left(5, seq(
        field('left', $.expression),
        field('operator', choice('*', '/', '%', 'times', 'div', 'mod')),
        field('right', $.expression),
      )),
    ),

    // Unary expressions
    unary_expression: $ => prec.right(6, seq(
      field('operator', choice('not', '-')),
      field('operand', $.expression),
    )),

    // Function call
    call_expression: $ => prec(7, seq(
      field('function', $.identifier),
      '|',
      optional($.argument_list),
      '|',
    )),

    argument_list: $ => seq(
      $.expression,
      repeat(seq(',', $.expression)),
    ),

    // Method call (arr.map||, arr.push|val|)
    method_call: $ => prec(10, seq(
      field('object', choice($.identifier, $.call_expression, $.member_access, $.method_call)),
      '.',
      field('method', $.identifier),
      '|',
      optional($.argument_list),
      '|',
    )),

    // Array access with []
    array_access: $ => prec(8, seq(
      field('array', choice($.identifier, $.call_expression)),
      '[',
      field('index', $.expression),
      ']',
    )),

    // Dict access with {}
    dict_access: $ => prec(8, seq(
      field('dict', choice($.identifier, $.call_expression)),
      '{',
      field('key', $.string),
      '}',
    )),

    // Member access with dot notation
    member_access: $ => prec(9, seq(
      field('object', choice($.identifier, $.call_expression, $.member_access)),
      '.',
      field('member', $.identifier),
    )),

    // Array literal with []
    array_literal: $ => seq(
      '[',
      optional(seq(
        $.expression,
        repeat(seq(',', $.expression)),
      )),
      ']',
    ),

    // Dict literal with {}
    dict_literal: $ => seq(
      '{',
      optional(seq(
        $.dict_pair,
        repeat(seq(',', $.dict_pair)),
      )),
      '}',
    ),

    // Object literal with <>
    object_literal: $ => seq(
      '<',
      optional(seq(
        $.object_pair,
        repeat(seq(',', $.object_pair)),
      )),
      '>',
    ),

    object_pair: $ => seq(
      field('key', $.identifier),
      ':',
      field('value', $.expression),
    ),

    dict_pair: $ => seq(
      field('key', $.string),
      ':',
      field('value', $.expression),
    ),

    // Parenthesized expression
    parenthesized_expression: $ => seq(
      '(',
      $.expression,
      ')',
    ),

    // Primitives
    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    number: $ => choice(
      /\d+\.\d+/,  // float
      /\d+/,       // int
    ),

    string: $ => token(seq(
      '"',
      repeat(choice(
        /[^"\\]/,
        /\\./,
      )),
      '"',
    )),

    char: $ => token(seq(
      "'",
      choice(
        /[^'\\]/,
        /\\./,
      ),
      "'",
    )),

    boolean: $ => choice(
      'true',
      'false',
    ),
  },
});
