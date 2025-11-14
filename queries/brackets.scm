; Bracket pairs for Zed

; Standard brackets
("(" @open ")" @close)
("[" @open "]" @close)
("{" @open "}" @close)

; Block terminators - keywords that start blocks paired with $
("if" @open "$" @close)
("loop" @open "$" @close)
("switch" @open "$" @close)
("when" @open "$" @close)
("::|" @open "$" @close)

; Angle brackets for generics (if needed)
; ("<" @open ">" @close)

; Pipe brackets for function parameters and lambdas
("|" @open "|" @close)
