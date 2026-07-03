# Pascal Compiler-Like Infrastructure Implementation Plan

We will replace the regex-based parser with a compiler frontend architecture. In this phase, we will focus exclusively on building the compiler infrastructure, leaving all LSP features disabled or stubbed.

## User Review Required

> [!IMPORTANT]
> This plan implements a rigorous compiler-style frontend in TypeScript. It does not contain any regular expression heuristics or text-searching fallback systems. All language features will be derived directly from the AST, Scope Tree, and Symbol Table.
>
> We will create a modular set of files under `server/src/compiler/` to separate concerns:
> - `ast.ts`: Defines the AST Node hierarchy and the Visitor pattern.
> - `types.ts`: Defines the Type representation classes.
> - `symbols.ts`: Defines the Symbol classes.
> - `scopes.ts`: Defines the Scope classes and the hierarchical lookup chains.
> - `models.ts`: Defines the Workspace and Document model structures.

## Open Questions

No open questions. The plan outlines the core object models required for semantic analysis.

## Architectural Decisions & Design

Below is the detailed design of each component we will implement.

### 1. Abstract Syntax Tree (AST) (`ast.ts`)
The AST represents the syntactic structure of Pascal documents. Each node will record its `range` (LSP Range) to map semantic symbols back to their source positions.

- `ASTNode`: Abstract base class with a `range`.
- `ProgramNode` / `UnitNode`: Roots of the compiler unit.
- `InterfaceSectionNode` / `ImplementationSectionNode`: Representing the sections of a Unit.
- `UsesClauseNode`: Contains list of unit name identifiers.
- `DeclNode`: Abstract base class for declarations.
  - `VarDeclNode`: Comma-separated list of variable identifiers, a type node, and optional initialization.
  - `ConstDeclNode`: Identifier, optional type node, and value expression.
  - `TypeDeclNode`: Identifier and TypeDefinition node (e.g. Class, Record, Interface).
  - `SubprogramDeclNode`: Signature (kind: procedure/function/constructor/destructor, name identifier, parameters, return type, modifiers like `override`, `virtual`, `overload`) and block body.
- `TypeNode`: Representing types in code (e.g. identifier like `Integer`, or complex definitions like `class` or `record`).
- `StmtNode`: Abstract base class for statements (e.g. blocks, assignments, calls, loops).
- `ExprNode`: Abstract base class for expressions (e.g. identifier references, binary ops, member accesses `obj.member`, call expressions).

```typescript
export interface ASTVisitor<R> {
	visitProgram(node: ProgramNode): R;
	visitUnit(node: UnitNode): R;
	visitVarDecl(node: VarDeclNode): R;
	visitConstDecl(node: ConstDeclNode): R;
	visitTypeDecl(node: TypeDeclNode): R;
	visitSubprogramDecl(node: SubprogramDeclNode): R;
	// ... visitor methods for statements/expressions ...
}
```

### 2. Type System (`types.ts`)
Types represent semantic types in Pascal, allowing compile-time type checking and member resolution.
- `Type`: Abstract base class.
- `PrimitiveType`: Predefined primitive types (`Integer`, `Real`, `Char`, `Boolean`, `String`, `Pointer`, `Nil`, `Void`).
- `ClassType`: Represents classes. Contains references to:
  - Parent class type (for inheritance resolution).
  - List of generic parameter types.
  - A `ClassScope` containing class members.
- `RecordType`: Represents records, holding a scope of fields.
- `InterfaceType`: Represents interfaces, holding a scope of methods.
- `GenericType`: Represents generic class definitions with type parameters.
- `AliasType`: Type alias pointing to an underlying type.
- `UnresolvedType`: Temporary type wrapper when a type references a symbol in another unit that has not yet been resolved.

### 3. Symbol Table (`symbols.ts`)
A Symbol represents any named entity.
- `Symbol`: Abstract base class with `name: string`, `range: Range`, `uri: string`, and `type: Type`.
- `VariableSymbol`: Represents variables, parameters, fields.
- `ConstantSymbol`: Represents constants.
- `TypeSymbol`: Represents custom type declarations.
- `SubprogramSymbol`: Represents procedures, functions, constructors, destructors. Tracks overloads, virtual/override attributes, and parameters.
- `UnitSymbol`: Represents compile units (programs/units/libraries).

### 4. Scopes Hierarchy (`scopes.ts`)
Scopes manage symbol visibility rules and support nested blocks.
- `Scope`: Interface.
  - `parent`: The outer enclosing scope.
  - `define(symbol: Symbol)`: Inserts a symbol into the local scope.
  - `resolve(name: string)`: Searches the scope chain recursively to find a symbol.
  - `resolveLocal(name: string)`: Searches only the current scope level.
- `BaseScope`: Implements basic parent link and symbol maps.
- `UnitScope`: Represents unit-level scope (interface section symbols are public, implementation section symbols are private).
- `ClassScope`: Implements object-oriented lookup. If a symbol is not found locally, it resolves against its parent class scope before falling back to the outer unit scope.
- `UsesScope`: Aggregates symbols exposed by the interface sections of all units listed in the uses clause.
- `LocalScope`: Represents local scopes in procedures, functions, or block statements (`begin..end`).

### 5. Document & Workspace Models (`models.ts`)
Tracks files and coordinates semantic lookups across the codebase.
- `PascalDocument`:
  - Contains file `uri`, `text`, and `version`.
  - Stores the parsed `ASTNode` tree.
  - Stores the root `UnitScope` / `Scope` tree.
- `PascalWorkspace`:
  - Maintains a map of `uri -> PascalDocument`.
  - Resolves cross-file `uses` dependencies by linking UnitScopes together.

---

## Proposed Changes

We will create a new subfolder `server/src/compiler` and add the infrastructure files there. We will modify `server.ts` to reference these structures once we build them, but initially, we will just implement the raw infrastructure models.

### [Component] Compiler Infrastructure

#### [NEW] [ast.ts](file:///C:/Pascal-Language-Server/server/src/compiler/ast.ts)
- Base ASTNode class.
- AST node classes for declarations, types, statements, expressions.
- ASTVisitor and ASTVisitorVoid interfaces.

#### [NEW] [types.ts](file:///C:/Pascal-Language-Server/server/src/compiler/types.ts)
- PrimitiveType, ClassType, RecordType, InterfaceType, GenericType, AliasType, and UnresolvedType classes.

#### [NEW] [symbols.ts](file:///C:/Pascal-Language-Server/server/src/compiler/symbols.ts)
- VariableSymbol, ConstantSymbol, TypeSymbol, SubprogramSymbol, and UnitSymbol classes.

#### [NEW] [scopes.ts](file:///C:/Pascal-Language-Server/server/src/compiler/scopes.ts)
- BaseScope, UnitScope, ClassScope, UsesScope, and LocalScope classes.

#### [NEW] [models.ts](file:///C:/Pascal-Language-Server/server/src/compiler/models.ts)
- PascalDocument and PascalWorkspace classes.

---

## Verification Plan

### Automated Tests
- Build and compile using `npm run compile` to verify that all type structures compile successfully.
- Write a basic unit test in the scratch folder to verify that we can construct a mock AST, populate a Scope Tree, and resolve symbols hierarchically (including class inheritance lookup).
