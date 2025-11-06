#!/bin/bash

# Build tree-sitter-ahoy with Ahoy tokenizer integration

set -e

echo "→ Building Ahoy tokenizer Go library..."
cd src
go build -buildmode=c-shared -o libahoy_tokenizer.so ahoy_tokenizer_wrapper.go
echo "  ✓ Go library built"

echo "→ Building tree-sitter parser with external scanner..."
cd ..

# Compile parser.c
gcc -c -fPIC src/parser.c -I src -o parser.o

# Compile scanner.cc with Go library
g++ -c -fPIC src/scanner.cc -I src -std=c++11 -o scanner.o

# Link everything together including the Go library
g++ -shared -o ahoy.so parser.o scanner.o -L src -lahoy_tokenizer -Wl,-rpath,'$ORIGIN/src'

# Clean up
rm parser.o scanner.o

echo "  ✓ Parser built successfully"
echo
echo "Files created:"
ls -lh ahoy.so src/libahoy_tokenizer.so

echo
echo "✓ Build complete!"
