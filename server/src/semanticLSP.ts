import {
	TextDocument,
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
import type { PascalWorkspace } from './compiler/models';
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
} from './compiler/ast';
import { Symbol, SymbolKind } from './compiler/symbols';

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

	// Se for um IdentifierNode com símbolo resolvido
	if (node instanceof IdentifierNode && node.symbol !== undefined) {
		const declNode = node.symbol.declaringNode;
		if (declNode !== undefined) {
			return {
				uri: document.uri,
				range: toLSPRange(declNode.range),
			};
		}
	}

	// Se for uma DeclarationNode, retorna ela mesma
	if (node instanceof DeclarationNode) {
		return {
			uri: document.uri,
			range: toLSPRange(node.range),
		};
	}

	return null;
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
	if (symbol.type !== undefined) {
		lines.push(`Type: \`${symbol.type.kind}\``);
	}

	// Kind
	lines.push(`Kind: \`${symbol.kind}\``);

	// Informações específicas por tipo
	if (symbol.kind === SymbolKind.Subprogram) {
		const subprogram = symbol as import('./compiler/symbols').SubprogramSymbol;
		const params = subprogram.parameters.map(p => {
			let dir = 'var';
			if (p.direction === 'value') dir = 'const';
			else if (p.direction === 'out') dir = 'out';
			return `${dir} ${p.name}: ${p.type.kind}`;
		}).join(', ');
		lines.push(`Parameters: ${params}`);
		if (subprogram.returnType !== undefined) {
			lines.push(`Returns: \`${subprogram.returnType.kind}\``);
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

	// Encontrar o escopo na posição
	const scope = findScopeAtPosition(document, position);
	if (scope === undefined) {
		return [];
	}

	const items: CompletionItem[] = [];

	// Coletar símbolos visíveis no escopo
	for (const symbol of scope.getSymbols()) {
		items.push({
			label: symbol.name,
			kind: symbolKindToCompletionKind(symbol.kind),
			detail: symbol.type.kind,
		});
	}

	// Adicionar símbolos do escopo pai (hierarquia)
	let parentScope = scope.parent;
	while (parentScope !== undefined) {
		for (const symbol of parentScope.getSymbols()) {
			// Evitar duplicatas
			if (!items.some(item => item.label === symbol.name)) {
				items.push({
					label: symbol.name,
					kind: symbolKindToCompletionKind(symbol.kind),
					detail: symbol.type.kind,
				});
			}
		}
		parentScope = parentScope.parent;
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

	return symbols;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toLSPRange(range: import('./compiler/ast').SourceRange): Range {
	return Range.create(range.start.line, range.start.character, range.end.line, range.end.character);
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

function findScopeAtPosition(document: PascalDocument, position: Position): import('./compiler/scopes').Scope | undefined {
	// Simplificação: retorna o rootScope
	// Implementação completa precisaria mapear escopos a posições
	return document.rootScope;
}
