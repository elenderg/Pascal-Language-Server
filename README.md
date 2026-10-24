# Pascal Language Server

A Language Server implementation for Pascal, for use with a Visual Studio Code client, semantic language features, and Free Pascal Compiler (FPC) diagnostics integration.

## Features

- **Document Symbols** — Navigate declarations within a Pascal source file.
- **Diagnostics** — Report compiler diagnostics through Free Pascal Compiler (FPC) integration.
- **Hover Information** — Inspect symbol information by hovering over identifiers.
- **Go to Definition** — Navigate to symbol declarations.
- **Go to Type Definition** — Navigate to the definition of a symbol's type.
- **Go to Implementation** — Navigate to implementations of declared routines or other supported symbols.
- **Find References** — Locate references to symbols across source files.

### Symbol Resolution

The language server parses Pascal declarations and builds a symbol table to support navigation and reference resolution.

Unit dependencies declared through `uses` clauses are resolved recursively. The server searches for dependencies in the following locations:

- Currently open documents.
- The directory containing the source file.
- Workspace folders.
- Free Pascal Compiler unit search paths configured through `-Fu`.

An end-to-end test verifies definition lookup across a chain of dependent Pascal units.

## Syntax Highlighting

Syntax highlighting is provided by a custom TextMate grammar:

[`syntaxes/pascal.tmLanguage.json`](./syntaxes/pascal.tmLanguage.json)

The grammar covers Free Pascal syntax, including:

- Type and variable declarations.
- Procedures, functions, and formal parameters.
- Expressions, operators, and function calls.
- Keywords, literals, and identifiers.
- Comments and compiler directives.

The grammar is maintained separately from the language server's parsing and semantic analysis.

## Project Structure

```text
.
├── client/
│   └── src/
│       ├── test/              # End-to-end tests
│       └── extension.ts       # VS Code language client entry point
├── server/
│   └── src/
│       └── server.ts          # Language server entry point
├── syntaxes/
│   └── pascal.tmLanguage.json # TextMate syntax highlighting grammar
└── package.json               # Extension manifest and project scripts
```

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- [Visual Studio Code](https://code.visualstudio.com/)
- [Free Pascal Compiler (FPC)](https://www.freepascal.org/), for compiler diagnostics and projects that require it.

### Running the Extension

1. Open the project folder in Visual Studio Code.
2. Run `npm install` in the project root.
3. Press `Ctrl+Shift+B` to compile the client and server in watch mode.
4. Open the **Run and Debug** view with `Ctrl+Shift+D`.
5. Select **Launch Client** from the debug configuration list.
6. Press `F5` to launch the Extension Development Host.
7. Open a Pascal source file in the development window to test the language features.

## Testing

The project includes an end-to-end test for symbol resolution across multiple Pascal units, validating navigation through recursively resolved `uses` dependencies.

