import {
	//TextDocument,
	CompletionItem,
	CompletionItemKind,
	DocumentSymbol,
	SymbolKind as LSPSymbolKind,
	Location,
	Range,
	Position,
	Hover,
	WorkspaceEdit,
	TextEdit,
} from 'vscode-languageserver/node';
import type { PascalDocument } from './compiler/models';
//import type { PascalWorkspace } from './compiler/models';
import {
	IdentifierNode,
	DeclarationNode,
	RecursiveASTVisitor,
	ASTVisitorVoid,
	ProgramNode,
	UnitNode,
	ProcedureDeclarationNode,
	FunctionDeclarationNode,
	MethodDeclarationNode,
	ClassDeclarationNode,
	RecordDeclarationNode,
	InterfaceDeclarationNode,
	VariableDeclarationNode,
	ConstantDeclarationNode,
	TypeAliasDeclarationNode,
	EnumTypeDeclarationNode,
	PropertyDeclarationNode,
	ASTNode,
} from './compiler/ast/index';
import type { Scope } from './compiler/scopes';
import { Symbol, SymbolKind } from './compiler/symbols';
import { AliasType, ArrayType, ClassType, EnumType, InterfaceType, PointerType, PrimitiveType, RecordType, SubprogramType, UnresolvedType, VoidType } from './compiler/types';

// ---------------------------------------------------------------------------
// Semantic LSP Features - todas baseadas em análise semântica (AST + símbolos)
// ---------------------------------------------------------------------------

/**
 * Encontra o nó AST na posição especificada.
 */
function findNodeAtPosition(document: PascalDocument, position: Position): import('./compiler/ast').ASTNode | undefined {
	if (document.ast === undefined) {
		return undefined;
	}

	const targetLine = position.line;
	const targetChar = position.character;

	class NodeFinder extends RecursiveASTVisitor implements ASTVisitorVoid {
		result: import('./compiler/ast').ASTNode | undefined = undefined;

		private isPositionInRange(range: import('./compiler/ast').SourceRange): boolean {
			return targetLine >= range.start.line && targetLine <= range.end.line &&
				(targetLine !== range.start.line || targetChar >= range.start.character) &&
				(targetLine !== range.end.line || targetChar <= range.end.character);
		}

		defaultResult(): void {
			// No-op
		}

		visitNode(node: import('./compiler/ast').ASTNode): void {
			if (this.result !== undefined) {
				return; // Já encontrado
			}

			if (this.isPositionInRange(node.range)) {
				this.result = node;
				// Continuar buscando filhos para encontrar o nó mais específico
				this.visitNodeChildren(node);
			}
		}
	}

	const finder = new NodeFinder();
	document.ast.accept(finder);
	return finder.result;
}

/**
 * Go To Definition - retorna a declaração do símbolo na posição.
 */
export function goToDefinition(document: PascalDocument, position: Position): Location | null {
	const node = findNodeAtPosition(document, position);
	if (node === undefined) {
		return null;
	}

	if (node instanceof IdentifierNode && node.symbol !== undefined) {
		const target = node.symbol.declaringNode;
		if (target !== undefined) {
			return {
				uri: document.uri,
				range: toLSPRange(target.range),
			};
		}
	}

	if (node instanceof DeclarationNode && node.symbol !== undefined) {
		return {
			uri: document.uri,
			range: node.symbol.range,
		};
	}

	return null;
}

export function goToTypeDefinition(document: PascalDocument, position: Position): Location | null {
	const node = findNodeAtPosition(document, position);
	if (node === undefined) {
		return null;
	}

	let typeNode: import('./compiler/types').PascalType | undefined;
	if (node instanceof IdentifierNode && node.symbol !== undefined) {
		typeNode = node.symbol.type;
	} else if (node instanceof DeclarationNode && node.symbol !== undefined) {
		typeNode = node.symbol.type;
	}

	if (typeNode === undefined || typeNode.declaringSymbol === undefined) {
		return null;
	}

	return {
		uri: typeNode.declaringSymbol.uri,
		range: typeNode.declaringSymbol.range,
	};
}

export function goToImplementation(document: PascalDocument, position: Position): Location[] | null {
	const node = findNodeAtPosition(document, position);
	if (node === undefined) {
		return null;
	}

	let symbol: Symbol | undefined;
	if (node instanceof IdentifierNode && node.symbol !== undefined) {
		symbol = node.symbol;
	} else if (node instanceof DeclarationNode && node.symbol !== undefined) {
		symbol = node.symbol;
	}

	if (symbol === undefined || symbol.kind !== SymbolKind.Subprogram) {
		return null;
	}

	const implementations: Location[] = [];
	if (symbol.declaringNode !== undefined) {
		implementations.push({ uri: document.uri, range: toLSPRange(symbol.declaringNode.range) });
	}
	return implementations;
}

/**
 * Find References - retorna todos os usos do símbolo na posição.
 */
export function findReferences(document: PascalDocument, position: Position, includeDeclaration: boolean): Location[] {
	const node = findNodeAtPosition(document, position);
	if (node === undefined) {
		return [];
	}

	let targetSymbol: Symbol | undefined;

	// Obter o símbolo alvo
	if (node instanceof IdentifierNode && node.symbol !== undefined) {
		targetSymbol = node.symbol;
	} else if (node instanceof DeclarationNode && node.symbol !== undefined) {
		targetSymbol = node.symbol;
	}

	if (targetSymbol === undefined) {
		return [];
	}

	const references: Location[] = [];

	// Buscar todos os IdentifierNode que referenciam o mesmo símbolo
	class ReferenceFinder extends RecursiveASTVisitor implements ASTVisitorVoid {
		defaultResult(): void {
			// No-op
		}

		visitIdentifier(node: IdentifierNode): void {
			if (node.symbol === targetSymbol) {
				references.push({
					uri: document.uri,
					range: toLSPRange(node.range),
				});
			}
			this.visitNodeChildren(node);
		}

		visitNodeChildren(node: import('./compiler/ast').ASTNode): void {
			for (const child of node.children) {
				child.accept(this);
			}
		}
	}

	if (document.ast !== undefined) {
		const finder = new ReferenceFinder();
		document.ast.accept(finder);
	}

	// Incluir declaração se solicitado
	if (includeDeclaration && targetSymbol.declaringNode !== undefined) {
		references.push({
			uri: document.uri,
			range: toLSPRange(targetSymbol.declaringNode.range),
		});
	}

	return references;
}

/**
 * Hover - retorna informações do símbolo na posição.
 */
export function hover(document: PascalDocument, position: Position): Hover | null {
	const node = findNodeAtPosition(document, position);
	if (node === undefined) {
		return null;
	}

	let symbol: Symbol | undefined;

	if (node instanceof IdentifierNode && node.symbol !== undefined) {
		symbol = node.symbol;
	} else if (node instanceof DeclarationNode && node.symbol !== undefined) {
		symbol = node.symbol;
	}

	if (symbol === undefined) {
		return null;
	}

	// Construir informações do símbolo
	const lines: string[] = [];

	// Nome e tipo
	lines.push(`**${symbol.name}**`);
	lines.push(`Type: \`${describeType(symbol.type)}\``);

	// Kind
	lines.push(`Kind: \`${symbol.kind}\``);

	// Informações específicas por tipo
	if (symbol.kind === SymbolKind.Subprogram) {
		const subprogram = symbol as import('./compiler/symbols').SubprogramSymbol;
		const params = subprogram.parameters.map(p => {
			let dir = 'var';
			if (p.direction === 'value') {dir = 'const';}
			else if (p.direction === 'out') {dir = 'out';}
			return `${dir} ${p.name}: ${describeType(p.type)}`;
		}).join(', ');
		lines.push(`Parameters: ${params}`);
		if (subprogram.returnType !== undefined) {
			lines.push(`Returns: \`${describeType(subprogram.returnType)}\``);
		}
	}

	return {
		contents: {
			kind: 'markdown',
			value: lines.join('\n\n'),
		},
		range: toLSPRange(node.range),
	};
}

/**
 * Completion - lista símbolos visíveis no escopo atual.
 */
export function getCompletion(document: PascalDocument, position: Position): CompletionItem[] {
	if (document.rootScope === undefined) {
		return [];
	}

	const scope = findScopeAtPosition(document, position);
	if (scope === undefined) {
		return [];
	}

	const items: CompletionItem[] = [];
	const seen = new Set<string>();
	const addSymbol = (symbol: Symbol): void => {
		if (seen.has(symbol.name)) {
			return;
		}
		seen.add(symbol.name);
		items.push({
			label: symbol.name,
			kind: symbolKindToCompletionKind(symbol.kind),
			detail: describeType(symbol.type),
		});
	};

	let currentScope: Scope | undefined = scope;
	while (currentScope !== undefined) {
		for (const symbol of currentScope.getSymbols()) {
			addSymbol(symbol);
		}
		currentScope = currentScope.parent;
	}

	return items;
}

/**
 * Rename - renomeia a declaração e todos os usos do símbolo.
 */
export function rename(document: PascalDocument, position: Position, newName: string): WorkspaceEdit | null {
	const node = findNodeAtPosition(document, position);
	if (node === undefined) {
		return null;
	}

	let targetSymbol: Symbol | undefined;

	if (node instanceof IdentifierNode && node.symbol !== undefined) {
		targetSymbol = node.symbol;
	} else if (node instanceof DeclarationNode && node.symbol !== undefined) {
		targetSymbol = node.symbol;
	}

	if (targetSymbol === undefined) {
		return null;
	}

	const edits: TextEdit[] = [];

	// Renomear declaração
	if (targetSymbol.declaringNode !== undefined) {
		edits.push({
			range: toLSPRange(targetSymbol.declaringNode.range),
			newText: newName,
		});
	}

	// Renomear todos os usos
	class RenameVisitor extends RecursiveASTVisitor implements ASTVisitorVoid {
		defaultResult(): void {
			// No-op
		}

		visitIdentifier(node: IdentifierNode): void {
			if (node.symbol === targetSymbol) {
				edits.push({
					range: toLSPRange(node.range),
					newText: newName,
				});
			}
			this.visitNodeChildren(node);
		}

		visitNodeChildren(node: import('./compiler/ast').ASTNode): void {
			for (const child of node.children) {
				child.accept(this);
			}
		}
	}

	if (document.ast !== undefined) {
		const visitor = new RenameVisitor();
		document.ast.accept(visitor);
	}

	return {
		changes: {
			[document.uri]: edits,
		},
	};
}

/**
 * Document Symbols - gera a partir da AST.
 */
export function getDocumentSymbols(document: PascalDocument): DocumentSymbol[] {
	if (document.ast === undefined) {
		console.log("AST is undefined for document: " + document.uri);
		return [];
	}

	const symbols: DocumentSymbol[] = [];

	class SymbolBuilder extends RecursiveASTVisitor implements ASTVisitorVoid {
		defaultResult(): void {
			// No-op
		}

		visitProgram(node: ProgramNode): void {
			const range = toLSPRange(node.range);
			symbols.push({
				name: node.name.name,
				kind: LSPSymbolKind.Module,
				range,
				selectionRange: range,
				detail: 'program',
			});
			this.visitNodeChildren(node);
		}

		visitUnit(node: UnitNode): void {
			const range = toLSPRange(node.range);
			symbols.push({
				name: node.name.name,
				kind: LSPSymbolKind.Module,
				range,
				selectionRange: range,
				detail: 'unit',
			});
			this.visitNodeChildren(node);
		}

		visitProcedureDeclaration(node: ProcedureDeclarationNode): void {
			const range = toLSPRange(node.range);
			if (node.name !== undefined) {
				symbols.push({
					name: node.name.name,
					kind: LSPSymbolKind.Function,
					range,
					selectionRange: range,
					detail: 'procedure',
				});
			}
			this.visitNodeChildren(node);
		}

		visitFunctionDeclaration(node: FunctionDeclarationNode): void {
			const range = toLSPRange(node.range);
			if (node.name !== undefined) {
				symbols.push({
					name: node.name.name,
					kind: LSPSymbolKind.Function,
					range,
					selectionRange: range,
					detail: 'function',
				});
			}
			this.visitNodeChildren(node);
		}

		visitMethodDeclaration(node: MethodDeclarationNode): void {
			const range = toLSPRange(node.range);
			if (node.name !== undefined) {
				symbols.push({
					name: node.name.name,
					kind: LSPSymbolKind.Method,
					range,
					selectionRange: range,
					detail: node.methodKind,
				});
			}
			this.visitNodeChildren(node);
		}

		visitClassDeclaration(node: ClassDeclarationNode): void {
			const range = toLSPRange(node.range);
			symbols.push({
				name: node.name.name,
				kind: LSPSymbolKind.Class,
				range,
				selectionRange: range,
				detail: 'class',
			});
			this.visitNodeChildren(node);
		}

		visitRecordDeclaration(node: RecordDeclarationNode): void {
			const range = toLSPRange(node.range);
			symbols.push({
				name: node.name?.name ?? 'anonymous',
				kind: LSPSymbolKind.Struct,
				range,
				selectionRange: range,
				detail: 'record',
			});
			this.visitNodeChildren(node);
		}

		visitInterfaceDeclaration(node: InterfaceDeclarationNode): void {
			const range = toLSPRange(node.range);
			symbols.push({
				name: node.name.name,
				kind: LSPSymbolKind.Interface,
				range,
				selectionRange: range,
				detail: 'interface',
			});
			this.visitNodeChildren(node);
		}

		visitVariableDeclaration(node: VariableDeclarationNode): void {
			for (const name of node.names) {
				const range = toLSPRange(name.range);
				symbols.push({
					name: name.name,
					kind: LSPSymbolKind.Variable,
					range,
					selectionRange: range,
					detail: 'variable',
				});
			}
			this.visitNodeChildren(node);
		}

		visitConstantDeclaration(node: ConstantDeclarationNode): void {
			const range = toLSPRange(node.name.range);
			symbols.push({
				name: node.name.name,
				kind: LSPSymbolKind.Constant,
				range,
				selectionRange: range,
				detail: 'constant',
			});
			this.visitNodeChildren(node);
		}

		visitTypeAliasDeclaration(node: TypeAliasDeclarationNode): void {
			const range = toLSPRange(node.name.range);
			symbols.push({
				name: node.name.name,
				kind: LSPSymbolKind.Class,
				range,
				selectionRange: range,
				detail: 'type',
			});
			this.visitNodeChildren(node);
		}

		visitEnumTypeDeclaration(node: EnumTypeDeclarationNode): void {
			const range = toLSPRange(node.name.range);
			symbols.push({
				name: node.name.name,
				kind: LSPSymbolKind.Enum,
				range,
				selectionRange: range,
				detail: 'enum',
			});
			this.visitNodeChildren(node);
		}

		visitPropertyDeclaration(node: PropertyDeclarationNode): void {
			const range = toLSPRange(node.name.range);
			symbols.push({
				name: node.name.name,
				kind: LSPSymbolKind.Property,
				range,
				selectionRange: range,
				detail: 'property',
			});
			this.visitNodeChildren(node);
		}

		visitNodeChildren(node: import('./compiler/ast').ASTNode): void {
			for (const child of node.children) {
				child.accept(this);
			}
		}
	}

	const builder = new SymbolBuilder();
	document.ast.accept(builder);

	if (symbols.length === 0) {
		console.log("No symbols found in document: " + document.uri);
	}

	return symbols;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toLSPRange(range: import('./compiler/ast').SourceRange): Range {
	return Range.create(range.start.line, range.start.character, range.end.line, range.end.character);
}

function describeType(type: import('./compiler/types').PascalType | undefined): string {
	if (type === undefined) {
		return 'unknown';
	}
	if (type instanceof PrimitiveType) {
		return type.name;
	}
	if (type instanceof ClassType) {
		return type.declaringSymbol?.name ?? 'class';
	}
	if (type instanceof RecordType) {
		return type.declaringSymbol?.name ?? 'record';
	}
	if (type instanceof InterfaceType) {
		return type.declaringSymbol?.name ?? 'interface';
	}
	if (type instanceof AliasType) {
		return describeType(type.resolveAlias());
	}
	if (type instanceof EnumType) {
		return type.declaringSymbol?.name ?? 'enum';
	}
	if (type instanceof ArrayType) {
		return 'array';
	}
	if (type instanceof PointerType) {
		return '^' + describeType(type.pointedType);
	}
	if (type instanceof SubprogramType) {
		return 'subprogram';
	}
	if (type instanceof UnresolvedType) {
		return type.name;
	}
	if (type instanceof VoidType) {
		return 'void';
	}
	return type.kind;
}

function symbolKindToCompletionKind(kind: SymbolKind): CompletionItemKind {
	switch (kind) {
		case SymbolKind.Variable:
			return CompletionItemKind.Variable;
		case SymbolKind.Constant:
			return CompletionItemKind.Constant;
		case SymbolKind.Type:
			return CompletionItemKind.Class;
		case SymbolKind.Subprogram:
			return CompletionItemKind.Function;
		case SymbolKind.Parameter:
			return CompletionItemKind.Variable;
		case SymbolKind.Field:
			return CompletionItemKind.Field;
		case SymbolKind.Property:
			return CompletionItemKind.Property;
		case SymbolKind.Unit:
			return CompletionItemKind.Module;
		case SymbolKind.Label:
			return CompletionItemKind.Reference;
		case SymbolKind.GenericParameter:
			return CompletionItemKind.TypeParameter;
		case SymbolKind.EnumMember:
			return CompletionItemKind.EnumMember;
		default:
			return CompletionItemKind.Text;
	}
}

function findScopeAtPosition(document: PascalDocument, position: Position): Scope | undefined {
	if (document.rootScope === undefined) {
		return undefined;
	}
	const node = findNodeAtPosition(document, position);
	if (node === undefined) {
		return document.rootScope;
	}
	let current: ASTNode | undefined = node;
	while (current !== undefined) {
		if ('scope' in current && current.scope !== undefined) {
			return current.scope as Scope;
		}
		current = current.parent;
	}
	return document.rootScope;
}
