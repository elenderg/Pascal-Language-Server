import type { ProgramNode, UnitNode } from './ast';
import { GlobalScope, UnitScope } from './scopes';
import type { Scope } from './scopes';
import type { UnitSymbol } from './symbols';
import { SemanticVisitor } from './semantic';

// ---------------------------------------------------------------------------
// Modelos de documento e workspace
// ---------------------------------------------------------------------------

export enum DocumentKind {
	Unknown = 'unknown',
	Program = 'program',
	Unit = 'unit',
	Include = 'include',
}

export enum AnalysisPhase {
	None = 'none',
	Parsed = 'parsed',
	Scoped = 'scoped',
	Typed = 'typed',
	Complete = 'complete',
}

export interface DiagnosticMessage {
	message: string;
	range: import('vscode-languageserver/node').Range;
	severity: 'error' | 'warning' | 'info';
	code?: string;
}

/**
 * Representa um documento Pascal aberto no editor.
 * Mantém AST, escopos e estado semântico em memória — nunca re-analisa via regex.
 */
export class PascalDocument {
	readonly uri: string;
	text: string;
	version: number;

	kind: DocumentKind = DocumentKind.Unknown;
	analysisPhase: AnalysisPhase = AnalysisPhase.None;

	/** Raiz da AST — ProgramNode ou UnitNode após o parse. */
	ast: ProgramNode | UnitNode | undefined;
	/** Escopo raiz construído pelo analisador semântico. */
	rootScope: Scope | undefined;
	/** Símbolo da unit/programa correspondente a este documento. */
	unitSymbol: UnitSymbol | undefined;

	parseDiagnostics: DiagnosticMessage[] = [];
	semanticDiagnostics: DiagnosticMessage[] = [];

	constructor(uri: string, text: string, version: number) {
		this.uri = uri;
		this.text = text;
		this.version = version;
	}

	update(text: string, version: number): void {
		this.text = text;
		this.version = version;
		this.invalidateAnalysis();
	}

	invalidateAnalysis(): void {
		this.analysisPhase = AnalysisPhase.None;
		this.ast = undefined;
		this.rootScope = undefined;
		this.unitSymbol = undefined;
		this.parseDiagnostics = [];
		this.semanticDiagnostics = [];
	}

	setParsed(
		ast: ProgramNode | UnitNode,
		kind: DocumentKind,
		diagnostics: DiagnosticMessage[] = [],
	): void {
		this.ast = ast;
		this.kind = kind;
		this.parseDiagnostics = diagnostics;
		this.analysisPhase = AnalysisPhase.Parsed;
	}

	setScoped(rootScope: Scope, unitSymbol: UnitSymbol): void {
		this.rootScope = rootScope;
		this.unitSymbol = unitSymbol;
		this.analysisPhase = AnalysisPhase.Scoped;
	}

	setTyped(diagnostics: DiagnosticMessage[] = []): void {
		this.semanticDiagnostics = diagnostics;
		this.analysisPhase = AnalysisPhase.Typed;
	}

	markComplete(): void {
		this.analysisPhase = AnalysisPhase.Complete;
	}

	/**
	 * Executa análise semântica no documento.
	 * Cria árvore de escopos e tabela de símbolos a partir da AST.
	 */
	analyzeSemantic(): void {
		if (this.ast === undefined || this.analysisPhase === AnalysisPhase.Scoped) {
			return;
		}

		const visitor = new SemanticVisitor(this);
		visitor.analyze();

		this.rootScope = visitor.getRootScope();
		this.unitSymbol = visitor.getUnitSymbol();

		if (this.rootScope !== undefined && this.unitSymbol !== undefined) {
			this.setScoped(this.rootScope, this.unitSymbol);
		}
	}

	get isAnalyzed(): boolean {
		return this.analysisPhase !== AnalysisPhase.None;
	}

	get unitName(): string | undefined {
		return this.unitSymbol?.unitName ?? this.ast?.name.name;
	}
}

/**
 * Coordena múltiplos documentos e resolve dependências uses entre units.
 * É o ponto central para análise cross-file.
 */
export class PascalWorkspace {
	private readonly documents = new Map<string, PascalDocument>();
	readonly globalScope = new GlobalScope();

	getDocument(uri: string): PascalDocument | undefined {
		return this.documents.get(uri);
	}

	getAllDocuments(): readonly PascalDocument[] {
		return [...this.documents.values()];
	}

	hasDocument(uri: string): boolean {
		return this.documents.has(uri);
	}

	openDocument(uri: string, text: string, version: number): PascalDocument {
		const existing = this.documents.get(uri);
		if (existing !== undefined) {
			existing.update(text, version);
			return existing;
		}
		const doc = new PascalDocument(uri, text, version);
		this.documents.set(uri, doc);
		return doc;
	}

	updateDocument(uri: string, text: string, version: number): PascalDocument | undefined {
		const doc = this.documents.get(uri);
		if (doc === undefined) {
			return undefined;
		}
		doc.update(text, version);
		this.onDocumentInvalidated(doc);
		return doc;
	}

	closeDocument(uri: string): void {
		const doc = this.documents.get(uri);
		if (doc === undefined) {
			return;
		}
		if (doc.unitSymbol !== undefined) {
			this.globalScope.unregisterUnit(doc.unitSymbol.unitName);
		}
		this.documents.delete(uri);
	}

	/**
	 * Registra uma unit analisada no escopo global e nas cláusulas uses de dependentes.
	 * A ligação concreta de uses será feita pelo SemanticAnalyzer.
	 */
	registerUnit(doc: PascalDocument): void {
		if (doc.kind !== DocumentKind.Unit || doc.rootScope === undefined || doc.unitSymbol === undefined) {
			return;
		}
		if (doc.rootScope instanceof UnitScope) {
			this.globalScope.registerUnit(doc.unitSymbol.unitName, doc.rootScope);
		}
	}

	/**
	 * Resolve o símbolo de uma unit pelo nome (case-insensitive).
	 * Usado para resolver cláusulas uses — sem busca textual.
	 */
	resolveUnit(unitName: string): UnitSymbol | undefined {
		for (const doc of this.documents.values()) {
			if (doc.unitSymbol !== undefined && doc.unitSymbol.unitName.toLowerCase() === unitName.toLowerCase()) {
				return doc.unitSymbol;
			}
		}
		return undefined;
	}

	/**
	 * Retorna o escopo de interface exportado por uma unit, se disponível.
	 */
	resolveUnitInterfaceScope(unitName: string): UnitScope | undefined {
		const symbol = this.resolveUnit(unitName);
		return symbol?.unitScope as UnitScope | undefined;
	}

	private onDocumentInvalidated(doc: PascalDocument): void {
		if (doc.unitSymbol !== undefined) {
			this.globalScope.unregisterUnit(doc.unitSymbol.unitName);
		}
	}
}
