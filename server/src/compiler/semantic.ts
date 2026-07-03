import { Range } from 'vscode-languageserver/node';
import { RecursiveASTVisitor, ASTVisitorVoid } from './ast';
import type {
	ProgramNode,
	UnitNode,
	UnitSectionNode,
	UsesClauseNode,
	TypeSectionNode,
	ConstSectionNode,
	VarSectionNode,
	BlockNode,
} from './ast';
import type {
	ProcedureDeclarationNode,
	FunctionDeclarationNode,
	MethodDeclarationNode,
	ClassDeclarationNode,
	RecordDeclarationNode,
	InterfaceDeclarationNode,
	VariableDeclarationNode,
	ParameterDeclarationNode,
	ConstantDeclarationNode,
	TypeAliasDeclarationNode,
	EnumTypeDeclarationNode,
	PropertyDeclarationNode,
	LabelDeclarationNode,
} from './ast';
import type { IdentifierNode } from './ast';
import type { PascalDocument } from './models';
import {
	Scope,
	UnitScope,
	GlobalScope,
	LocalScope,
	BlockScope,
	ClassScope,
	RecordScope,
	InterfaceScope,
	ProcedureScope,
	FunctionScope,
	MethodScope,
	InterfaceSectionScope,
	ImplementationSectionScope,
} from './scopes';
import {
	Symbol,
	VariableSymbol,
	ConstantSymbol,
	TypeSymbol,
	SubprogramSymbol,
	ParameterSymbol,
	FieldSymbol,
	PropertySymbol,
	LabelSymbol,
	EnumMemberSymbol,
	UnitSymbol,
	GenericParameterSymbol,
} from './symbols';
import { ClassType, RecordType, InterfaceType, EnumType, AliasType, VoidType, PascalType } from './types';
import { TypeResolver } from './type-resolver';
import { Visibility, SubprogramKind, ParameterDirection } from './ast';

// ---------------------------------------------------------------------------
// SemanticVisitor - constrói árvore de escopos e tabela de símbolos
// ---------------------------------------------------------------------------

/**
 * Analisador semântico que percorre a AST e constrói:
 * - Árvore de escopos hierárquica
 * - Tabela de símbolos conectada às declarações
 *
 * Esta fase apenas registra declarações. Resolução de referências
 * (usos de identificadores) será feita em uma fase posterior.
 */
export class SemanticVisitor extends RecursiveASTVisitor implements ASTVisitorVoid {
	private readonly document: PascalDocument;
	private readonly uri: string;
	private readonly typeResolver: TypeResolver;

	/** Pilha de escopos ativos durante a travessia. */
	private scopeStack: Scope[] = [];
	/** Escopo raiz (UnitScope ou GlobalScope). */
	private rootScope: Scope | undefined;
	/** Símbolo da unit/programa. */
	private unitSymbol: UnitSymbol | undefined;
	/** Escopo da classe atual (para methods). */
	private currentClassScope: ClassScope | undefined;

	constructor(document: PascalDocument) {
		super();
		this.document = document;
		this.uri = document.uri;
		this.typeResolver = new TypeResolver(document.uri);
	}

	/**
	 * Ponto de entrada para análise semântica de um documento.
	 */
	analyze(): void {
		if (this.document.ast === undefined) {
			return;
		}

		this.document.ast.accept(this);
	}

	getRootScope(): Scope | undefined {
		return this.rootScope;
	}

	getUnitSymbol(): UnitSymbol | undefined {
		return this.unitSymbol;
	}

	protected defaultResult(): void {
		// No-op
	}

	// ---------------------------------------------------------------------------
	// Gerenciamento de escopos
	// ---------------------------------------------------------------------------

	private enterScope(scope: Scope): void {
		this.scopeStack.push(scope);
	}

	private exitScope(): void {
		this.scopeStack.pop();
	}

	private get currentScope(): Scope {
		return this.scopeStack[this.scopeStack.length - 1];
	}

	private toLSPRange(range: import('./ast').SourceRange): Range {
		return Range.create(range.start.line, range.start.character, range.end.line, range.end.character);
	}

	// ---------------------------------------------------------------------------
	// Nós estruturais - criação de escopos
	// ---------------------------------------------------------------------------

	visitProgram(node: ProgramNode): void {
		const unitScope = new UnitScope(node.name.name, new GlobalScope());
		this.rootScope = unitScope;

		const unitSymbol = new UnitSymbol(
			node.name.name,
			this.toLSPRange(node.name.range),
			this.uri,
			node,
		);
		this.unitSymbol = unitSymbol;
		unitSymbol.unitScope = unitScope;

		this.enterScope(unitScope);
		this.enterScope(unitScope.getImplementationDeclarationScope());

		unitScope.define(unitSymbol);

		this.visitNodeChildren(node);

		this.exitScope();
		this.exitScope();
	}

	visitUnit(node: UnitNode): void {
		const unitScope = new UnitScope(node.name.name, new GlobalScope());
		this.rootScope = unitScope;

		const unitSymbol = new UnitSymbol(
			node.name.name,
			this.toLSPRange(node.name.range),
			this.uri,
			node,
		);
		this.unitSymbol = unitSymbol;
		unitSymbol.unitScope = unitScope;

		this.enterScope(unitScope);

		unitScope.define(unitSymbol);

		this.visitNodeChildren(node);

		this.exitScope();
	}

	visitUnitSection(node: UnitSectionNode): void {
		const parentScope = this.currentScope as UnitScope;

		if (parentScope instanceof UnitScope) {
			// Determinar se é interface ou implementation baseado na posição na AST
			// Simplificação: assumimos que o visitante é chamado na ordem correta
			// O UnitNode já tem interfaceSection e implementationSection separados
		}

		this.visitNodeChildren(node);
	}

	visitBlock(node: BlockNode): void {
		const blockScope = new BlockScope('block', this.currentScope);
		this.enterScope(blockScope);

		// Processar labels
		for (const labelDecl of node.labels) {
			for (const label of labelDecl.labels) {
				this.createLabelSymbol(label);
			}
		}

		this.visitNodeChildren(node);

		this.exitScope();
	}

	// ---------------------------------------------------------------------------
	// Declarações de tipos - criação de escopos e símbolos
	// ---------------------------------------------------------------------------

	visitClassDeclaration(node: ClassDeclarationNode): void {
		const classScope = new ClassScope(node.name.name, this.currentScope);
		this.enterScope(classScope);
		this.currentClassScope = classScope;

		const classType = new ClassType(undefined, [], undefined);
		const classSymbol = new TypeSymbol(
			node.name.name,
			this.toLSPRange(node.name.range),
			this.uri,
			classType,
			node,
		);
		classType.declaringSymbol = classSymbol;
		classType.classScope = classScope;

		node.symbol = classSymbol;
		this.currentScope.define(classSymbol);

		this.visitNodeChildren(node);

		this.currentClassScope = undefined;
		this.exitScope();
	}

	visitRecordDeclaration(node: RecordDeclarationNode): void {
		const recordScope = new RecordScope(node.name?.name ?? 'anonymous', this.currentScope);
		this.enterScope(recordScope);

		const recordType = new RecordType(undefined);
		const recordSymbol = new TypeSymbol(
			node.name?.name ?? 'anonymous',
			node.name ? this.toLSPRange(node.name.range) : this.toLSPRange(node.range),
			this.uri,
			recordType,
			node,
		);
		recordType.declaringSymbol = recordSymbol;
		recordType.recordScope = recordScope;

		node.symbol = recordSymbol;
		this.currentScope.define(recordSymbol);

		this.visitNodeChildren(node);

		this.exitScope();
	}

	visitInterfaceDeclaration(node: InterfaceDeclarationNode): void {
		const interfaceScope = new InterfaceScope(node.name.name, this.currentScope);
		this.enterScope(interfaceScope);

		const interfaceType = new InterfaceType(undefined, [], undefined);
		const interfaceSymbol = new TypeSymbol(
			node.name.name,
			this.toLSPRange(node.name.range),
			this.uri,
			interfaceType,
			node,
		);
		interfaceType.declaringSymbol = interfaceSymbol;
		interfaceType.interfaceScope = interfaceScope;

		node.symbol = interfaceSymbol;
		this.currentScope.define(interfaceSymbol);

		this.visitNodeChildren(node);

		this.exitScope();
	}

	visitTypeAliasDeclaration(node: TypeAliasDeclarationNode): void {
		const aliasedType = this.typeResolver.resolveType(node.aliasedType);
		const aliasType = new AliasType(aliasedType, undefined);

		const typeSymbol = new TypeSymbol(
			node.name.name,
			this.toLSPRange(node.name.range),
			this.uri,
			aliasType,
			node,
		);
		aliasType.declaringSymbol = typeSymbol;

		node.symbol = typeSymbol;
		this.currentScope.define(typeSymbol);

		this.visitNodeChildren(node);
	}

	visitEnumTypeDeclaration(node: EnumTypeDeclarationNode): void {
		const elements = node.elements.map(e => e.name);
		const enumType = new EnumType(elements, undefined);

		const typeSymbol = new TypeSymbol(
			node.name.name,
			this.toLSPRange(node.name.range),
			this.uri,
			enumType,
			node,
		);
		enumType.declaringSymbol = typeSymbol;

		node.symbol = typeSymbol;
		this.currentScope.define(typeSymbol);

		// Criar símbolos para cada elemento do enum
		for (let i = 0; i < node.elements.length; i++) {
			const elem = node.elements[i];
			const elemSymbol = new EnumMemberSymbol(
				elem.name,
				this.toLSPRange(elem.range),
				this.uri,
				enumType,
				i,
				elem,
			);
			this.currentScope.define(elemSymbol);
		}

		this.visitNodeChildren(node);
	}

	// ---------------------------------------------------------------------------
	// Declarações de variáveis/constantes
	// ---------------------------------------------------------------------------

	visitVariableDeclaration(node: VariableDeclarationNode): void {
		const varType = this.typeResolver.resolveType(node.varType);

		for (const name of node.names) {
			const symbol = new VariableSymbol(
				name.name,
				this.toLSPRange(name.range),
				this.uri,
				varType,
				node,
			);

			this.currentScope.define(symbol);
		}

		this.visitNodeChildren(node);
	}

	visitConstantDeclaration(node: ConstantDeclarationNode): void {
		const constType = node.constType
			? this.typeResolver.resolveType(node.constType)
			: new VoidType();

		const symbol = new ConstantSymbol(
			node.name.name,
			this.toLSPRange(node.name.range),
			this.uri,
			constType,
			node,
		);

		node.symbol = symbol;
		this.currentScope.define(symbol);

		this.visitNodeChildren(node);
	}

	visitParameterDeclaration(node: ParameterDeclarationNode): void {
		const paramType = node.paramType ? this.typeResolver.resolveType(node.paramType) : new VoidType();

		if (node.name !== undefined) {
			const symbol = new ParameterSymbol(
				node.name.name,
				this.toLSPRange(node.name.range),
				this.uri,
				paramType,
				node.direction,
				0, // índice será definido pelo subprograma pai
				node,
			);

			node.symbol = symbol;
			this.currentScope.define(symbol);
		}

		this.visitNodeChildren(node);
	}

	visitPropertyDeclaration(node: PropertyDeclarationNode): void {
		const propType = node.propType ? this.typeResolver.resolveType(node.propType) : new VoidType();

		const symbol = new PropertySymbol(
			node.name.name,
			this.toLSPRange(node.name.range),
			this.uri,
			propType,
			undefined, // readSymbol - será resolvido posteriormente
			undefined, // writeSymbol - será resolvido posteriormente
			node.visibility,
			node,
		);

		node.symbol = symbol;
		this.currentScope.define(symbol);

		this.visitNodeChildren(node);
	}

	visitLabelDeclaration(node: LabelDeclarationNode): void {
		for (const label of node.labels) {
			this.createLabelSymbol(label);
		}
		this.visitNodeChildren(node);
	}

	private createLabelSymbol(label: IdentifierNode): void {
		const symbol = new LabelSymbol(label.name, this.toLSPRange(label.range), this.uri, label);
		this.currentScope.define(symbol);
	}

	// ---------------------------------------------------------------------------
	// Declarações de subprogramas
	// ---------------------------------------------------------------------------

	visitProcedureDeclaration(node: ProcedureDeclarationNode): void {
		this.createSubprogramSymbol(node, SubprogramKind.Procedure, undefined);
	}

	visitFunctionDeclaration(node: FunctionDeclarationNode): void {
		this.createSubprogramSymbol(node, SubprogramKind.Function, node.returnType);
	}

	visitMethodDeclaration(node: MethodDeclarationNode): void {
		this.createSubprogramSymbol(node, node.methodKind, node.returnType);
	}

	private createSubprogramSymbol(
		node: ProcedureDeclarationNode | FunctionDeclarationNode | MethodDeclarationNode,
		kind: SubprogramKind,
		returnTypeNode: import('./ast').TypeNode | undefined,
	): void {
		const returnType = returnTypeNode ? this.typeResolver.resolveType(returnTypeNode) : undefined;
		const functionType = returnType ?? new VoidType();

		// Criar escopo do corpo
		let bodyScope: LocalScope;
		if (kind === SubprogramKind.Procedure) {
			bodyScope = new ProcedureScope(node.name?.name ?? 'anonymous', this.currentScope);
		} else if (kind === SubprogramKind.Function) {
			bodyScope = new FunctionScope(node.name?.name ?? 'anonymous', this.currentScope);
		} else {
			bodyScope = new MethodScope(node.name?.name ?? 'anonymous', this.currentScope, this.currentClassScope);
		}

		this.enterScope(bodyScope);

		// Criar símbolos para parâmetros
		const paramSymbols: ParameterSymbol[] = [];
		for (let i = 0; i < node.parameters.length; i++) {
			const param = node.parameters[i];
			const paramType = param.paramType ? this.typeResolver.resolveType(param.paramType) : new VoidType();

			if (param.name !== undefined) {
				const symbol = new ParameterSymbol(
					param.name.name,
					this.toLSPRange(param.name.range),
					this.uri,
					paramType,
					param.direction,
					i,
					param,
				);

				param.symbol = symbol;
				this.currentScope.define(symbol);
				paramSymbols.push(symbol);
			}
		}

		// Criar símbolo do subprograma
		const subprogramSymbol = new SubprogramSymbol(
			node.name?.name ?? 'anonymous',
			node.name ? this.toLSPRange(node.name.range) : this.toLSPRange(node.range),
			this.uri,
			kind,
			paramSymbols,
			returnType,
			node.modifiers,
			node.visibility,
			node.isForward,
			functionType,
			node,
		);
		subprogramSymbol.bodyScope = bodyScope;

		node.symbol = subprogramSymbol;

		// Definir no escopo pai (não no escopo do corpo)
		this.exitScope();
		this.currentScope.define(subprogramSymbol);

		// Reentrar no escopo do corpo para processar o bloco
		this.enterScope(bodyScope);
		this.visitNodeChildren(node);
		this.exitScope();
	}

	// ---------------------------------------------------------------------------
	// Seções (uses, type, const, var) - apenas travessia
	// ---------------------------------------------------------------------------

	visitUsesClause(node: UsesClauseNode): void {
		this.visitNodeChildren(node);
	}

	visitTypeSection(node: TypeSectionNode): void {
		this.visitNodeChildren(node);
	}

	visitConstSection(node: ConstSectionNode): void {
		this.visitNodeChildren(node);
	}

	visitVarSection(node: VarSectionNode): void {
		this.visitNodeChildren(node);
	}
}
