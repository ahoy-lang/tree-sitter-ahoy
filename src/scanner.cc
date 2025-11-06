#include <tree_sitter/parser.h>
#include <wctype.h>
#include <string>
#include <vector>
#include <map>
#include <cstring>

// External C function from Go
extern "C" {
    typedef struct {
        int token_type;
        char* value;
        int line;
    } Token;
    
    typedef struct {
        Token* tokens;
        int count;
    } TokenList;
    
    TokenList* tokenize_ahoy(const char* source);
    void free_token_list(TokenList* list);
}

namespace {

enum TokenType {
  INDENT,
  DEDENT,
  NEWLINE,
};

// Token type constants from Ahoy tokenizer
const int TOKEN_INDENT = 71;
const int TOKEN_DEDENT = 72;
const int TOKEN_NEWLINE = 3;

struct Scanner {
  std::string document_source;
  std::vector<Token> all_tokens;
  size_t current_token_index;
  bool tokens_loaded;
  std::vector<uint16_t> indent_stack;

  Scanner() : current_token_index(0), tokens_loaded(false) {
    indent_stack.push_back(0);
  }

  unsigned serialize(char *buffer) {
    size_t i = 0;
    
    // Serialize token index
    if (i + sizeof(size_t) <= TREE_SITTER_SERIALIZATION_BUFFER_SIZE) {
      memcpy(&buffer[i], &current_token_index, sizeof(size_t));
      i += sizeof(size_t);
    }
    
    // Serialize tokens_loaded flag
    if (i + sizeof(bool) <= TREE_SITTER_SERIALIZATION_BUFFER_SIZE) {
      memcpy(&buffer[i], &tokens_loaded, sizeof(bool));
      i += sizeof(bool);
    }
    
    return i;
  }

  void deserialize(const char *buffer, unsigned length) {
    size_t i = 0;
    
    if (i + sizeof(size_t) <= length) {
      memcpy(&current_token_index, &buffer[i], sizeof(size_t));
      i += sizeof(size_t);
    }
    
    if (i + sizeof(bool) <= length) {
      memcpy(&tokens_loaded, &buffer[i], sizeof(bool));
      i += sizeof(bool);
    }
  }

  void load_tokens(TSLexer *lexer) {
    if (tokens_loaded) return;
    
    // Read entire document
    document_source.clear();
    while (lexer->lookahead != 0) {
      document_source += (char)lexer->lookahead;
      lexer->advance(lexer, false);
    }
    
    // Tokenize using Ahoy tokenizer
    TokenList* token_list = tokenize_ahoy(document_source.c_str());
    
    if (token_list && token_list->tokens) {
      all_tokens.clear();
      for (int i = 0; i < token_list->count; i++) {
        all_tokens.push_back(token_list->tokens[i]);
      }
      free_token_list(token_list);
    }
    
    tokens_loaded = true;
    current_token_index = 0;
  }

  bool scan(TSLexer *lexer, const bool *valid_symbols) {
    // Load all tokens on first scan
    if (!tokens_loaded) {
      load_tokens(lexer);
    }
    
    // Find the token at current position
    uint32_t current_line = lexer->get_column(lexer) == 0 ? 
                            (current_token_index > 0 ? all_tokens[current_token_index - 1].line : 1) : 
                            (current_token_index < all_tokens.size() ? all_tokens[current_token_index].line : 1);
    
    // Look for INDENT, DEDENT, or NEWLINE tokens
    if (current_token_index < all_tokens.size()) {
      Token& token = all_tokens[current_token_index];
      
      if (token.token_type == TOKEN_INDENT && valid_symbols[INDENT]) {
        current_token_index++;
        lexer->result_symbol = INDENT;
        lexer->mark_end(lexer);
        return true;
      }
      
      if (token.token_type == TOKEN_DEDENT && valid_symbols[DEDENT]) {
        current_token_index++;
        lexer->result_symbol = DEDENT;
        lexer->mark_end(lexer);
        return true;
      }
      
      if (token.token_type == TOKEN_NEWLINE && valid_symbols[NEWLINE]) {
        current_token_index++;
        lexer->result_symbol = NEWLINE;
        lexer->mark_end(lexer);
        return true;
      }
    }
    
    return false;
  }
};

}

extern "C" {

void *tree_sitter_ahoy_external_scanner_create() {
  return new Scanner();
}

void tree_sitter_ahoy_external_scanner_destroy(void *payload) {
  Scanner *scanner = static_cast<Scanner *>(payload);
  delete scanner;
}

unsigned tree_sitter_ahoy_external_scanner_serialize(void *payload, char *buffer) {
  Scanner *scanner = static_cast<Scanner *>(payload);
  return scanner->serialize(buffer);
}

void tree_sitter_ahoy_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *scanner = static_cast<Scanner *>(payload);
  scanner->deserialize(buffer, length);
}

bool tree_sitter_ahoy_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = static_cast<Scanner *>(payload);
  return scanner->scan(lexer, valid_symbols);
}

}
