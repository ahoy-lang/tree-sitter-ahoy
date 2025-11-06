package main

/*
#include <stdlib.h>
#include <string.h>

typedef struct {
    int token_type;
    char* value;
    int line;
} Token;

typedef struct {
    Token* tokens;
    int count;
} TokenList;
*/
import "C"
import (
"unsafe"
"ahoy"
)

//export tokenize_ahoy
func tokenize_ahoy(source *C.char) *C.TokenList {
goSource := C.GoString(source)

// Use Ahoy's tokenizer
tokens := ahoy.Tokenize(goSource)

// Convert to C tokens
cTokens := (*C.Token)(C.malloc(C.size_t(len(tokens)) * C.size_t(unsafe.Sizeof(C.Token{}))))
tokensSlice := (*[1 << 30]C.Token)(unsafe.Pointer(cTokens))[:len(tokens):len(tokens)]

for i, token := range tokens {
tokensSlice[i].token_type = C.int(token.Type)
tokensSlice[i].value = C.CString(token.Value)
tokensSlice[i].line = C.int(token.Line)
}

result := (*C.TokenList)(C.malloc(C.size_t(unsafe.Sizeof(C.TokenList{}))))
result.tokens = cTokens
result.count = C.int(len(tokens))

return result
}

//export free_token_list
func free_token_list(list *C.TokenList) {
if list == nil {
return
}

tokens := (*[1 << 30]C.Token)(unsafe.Pointer(list.tokens))[:list.count:list.count]
for i := range tokens {
C.free(unsafe.Pointer(tokens[i].value))
}
C.free(unsafe.Pointer(list.tokens))
C.free(unsafe.Pointer(list))
}

func main() {}
