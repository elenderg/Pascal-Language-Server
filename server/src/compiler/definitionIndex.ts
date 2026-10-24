import { Position, Range } from 'vscode-languageserver/node';
import { fileURLToPath, pathToFileURL } from 'url';
import * as fs from 'fs';
import * as path from 'path';
import {
	ASTNode,
	IdentifierNode,
	SubprogramKind,
	UsesClauseNode,
} from './ast';
import {
	ConstantSymbol,
	EnumMemberSymbol,
	FieldSymbol,
	SubprogramSymbol,
	Symbol,
	TypeSymbol,
	VariableSymbol,
} from './symbols';
import { UnresolvedType } from './types';

interface Token {
	readonly value: string;
	readonly line: number;
	readonly character: number;
}

type DeclarationKind = 'variable' | 'constant' | 'type' | 'subprogram' | 'field' | 'enumMember';
type DeclarationSection = 'interface' | 'implementation' | 'program';

class DefinitionDeclarationNode extends ASTNode {
	constructor(
		range: Range,
		readonly identifier: IdentifierNode,
		readonly kind: DeclarationKind,
		readonly section: DeclarationSection,
		readonly subprogramKind?: SubprogramKind,
		readonly typeName?: string,
		readonly ownerTypeName?: string,
		readonly ownerSubprogramName?: string,
	) {
		super(range);
	}
}

interface WithScope {
	readonly variableNames: readonly string[];
	readonly ownerSubprogramName: string | undefined;
	readonly start: Token;
	readonly end: Token;
}

class DefinitionAst extends ASTNode {
	constructor(
		range: Range,
		readonly unitName: string | undefined,
		readonly usesClauses: readonly UsesClauseNode[],
		readonly declarations: readonly DefinitionDeclarationNode[],
		readonly withScopes: readonly WithScope[],
	) {
		super(range);
	}
}

class DefinitionSymbolTable {
	private readonly symbols = new Map<string, Symbol>();
	private readonly allSymbols: Symbol[] = [];

	define(symbol: Symbol): void {
		this.allSymbols.push(symbol);
		if (symbol.kind === 'field') {
			return;
		}
		const key = symbol.name.toLowerCase();
		if (!this.symbols.has(key)) {
			this.symbols.set(key, symbol);
		}
	}

	resolve(name: string): Symbol | undefined {
		return this.symbols.get(name.toLowerCase());
	}

	getAll(): readonly Symbol[] {
		return this.allSymbols;
	}
}

interface IndexedDocument {
	readonly uri: string;
	readonly text: string;
	readonly tokens: readonly Token[];
	readonly ast: DefinitionAst;
	readonly symbols: DefinitionSymbolTable;
}

const identifierStart = (character: string): boolean =>
	/[a-zA-Z_]/.test(character);
const identifierPart = (character: string): boolean =>
	/[a-zA-Z0-9_]/.test(character);

function tokenize(text: string): Token[] {
	const tokens: Token[] = [];
	let offset = 0;
	let line = 0;
	let character = 0;

	const advance = (): string => {
		const value = text[offset++];
		if (value === '\n') {
			line++;
			character = 0;
		} else {
			character++;
		}
		return value;
	};

	while (offset < text.length) {
		const current = text[offset];
		const next = text[offset + 1];
		if (/\s/.test(current)) {
			advance();
			continue;
		}
		if (current === '/' && next === '/') {
			while (offset < text.length) {
				if (advance() === '\n') {
					break;
				}
			}
			continue;
		}
		if (current === '{' || (current === '(' && next === '*')) {
			const curly = current === '{';
			advance();
			if (!curly) {
				advance();
			}
			while (offset < text.length) {
				if (curly && text[offset] === '}') {
					advance();
					break;
				}
				if (!curly && text[offset] === '*' && text[offset + 1] === ')') {
					advance();
					advance();
					break;
				}
				advance();
			}
			continue;
		}
		if (current === '\'') {
			advance();
			while (offset < text.length) {
				if (advance() === '\'') {
					if (text[offset] === '\'') {
						advance();
					} else {
						break;
					}
				}
			}
			continue;
		}

		const start = offset;
		const tokenLine = line;
		const tokenCharacter = character;
		if (identifierStart(current)) {
			advance();
			while (offset < text.length && identifierPart(text[offset])) {
				advance();
			}
		} else {
			advance();
		}
		tokens.push({
			value: text.slice(start, offset),
			line: tokenLine,
			character: tokenCharacter,
		});
	}
	return tokens;
}

function tokenRange(token: Token): Range {
	return Range.create(
		token.line,
		token.character,
		token.line,
		token.character + token.value.length,
	);
}

function isIdentifier(token: Token | undefined): token is Token {
	return token !== undefined && identifierStart(token.value[0]);
}

function readQualifiedIdentifier(
	tokens: readonly Token[],
	startIndex: number,
): { readonly name: string; readonly lastIndex: number; readonly range: Range } | undefined {
	const first = tokens[startIndex];
	if (!isIdentifier(first)) {
		return undefined;
	}
	const parts = [first.value];
	let lastIndex = startIndex;
	while (
		tokens[lastIndex + 1]?.value === '.' &&
		isIdentifier(tokens[lastIndex + 2])
	) {
		parts.push(tokens[lastIndex + 2].value);
		lastIndex += 2;
	}
	const last = tokens[lastIndex];
	return {
		name: parts.join('.'),
		lastIndex,
		range: Range.create(
			first.line,
			first.character,
			last.line,
			last.character + last.value.length,
		),
	};
}

function parseDocument(uri: string, text: string): IndexedDocument {
	const tokens = tokenize(text);
	const declarations: DefinitionDeclarationNode[] = [];
	const usesClauses: UsesClauseNode[] = [];
	const withScopes: WithScope[] = [];
	let declarationSection: DeclarationSection = 'program';
	let declarationMode: 'none' | 'const' | 'var' | 'type' = 'none';
	let unitName: string | undefined;

	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index];
		const value = token.value.toLowerCase();
		const next = tokens[index + 1];

		if (value === 'unit' || value === 'program' || value === 'library') {
			unitName = readQualifiedIdentifier(tokens, index + 1)?.name ?? unitName;
		}
		if (value === 'interface') {
			declarationSection = 'interface';
			declarationMode = 'none';
			continue;
		}
		if (value === 'implementation') {
			declarationSection = 'implementation';
			declarationMode = 'none';
			continue;
		}
		if (value === 'const' || value === 'var' || value === 'threadvar' || value === 'type') {
			declarationMode = value === 'const' ? 'const' : value === 'type' ? 'type' : 'var';
			continue;
		}
		if (value === 'begin' || value === 'initialization' || value === 'finalization') {
			declarationMode = 'none';
			continue;
		}
		if (value === 'uses') {
			const identifiers: IdentifierNode[] = [];
			let cursor = index + 1;
			let expectingUnit = true;
			while (cursor < tokens.length && tokens[cursor].value !== ';') {
				const qualified = expectingUnit ? readQualifiedIdentifier(tokens, cursor) : undefined;
				if (qualified) {
					identifiers.push(new IdentifierNode(qualified.range, qualified.name));
					cursor = qualified.lastIndex;
					expectingUnit = false;
				} else if (tokens[cursor].value === ',') {
					expectingUnit = true;
				}
				cursor++;
			}
			if (identifiers.length > 0) {
				const first = tokens[index];
				const last = tokens[Math.min(cursor, tokens.length - 1)];
				usesClauses.push(new UsesClauseNode(
					Range.create(first.line, first.character, last.line, last.character + last.value.length),
					identifiers,
				));
			}
			index = cursor;
			continue;
		}

		if (
			value === 'procedure' || value === 'function' ||
			value === 'constructor' || value === 'destructor'
		) {
			const nameIndex = next?.value.toLowerCase() === 'class' ? index + 2 : index + 1;
			if (isIdentifier(tokens[nameIndex])) {
				let nameToken = tokens[nameIndex];
				let ownerTypeName: string | undefined;
				if (tokens[nameIndex + 1]?.value === '.' && isIdentifier(tokens[nameIndex + 2])) {
					ownerTypeName = nameToken.value;
					nameToken = tokens[nameIndex + 2];
				}
				let typeName: string | undefined;
				let cursor = nameIndex + 1;
				let parentheses = 0;
				while (cursor < tokens.length && tokens[cursor].value !== ';') {
					if (tokens[cursor].value === '(') {
						parentheses++;
					} else if (tokens[cursor].value === ')') {
						parentheses--;
					} else if (tokens[cursor].value === ':' && parentheses <= 0) {
						typeName = readQualifiedIdentifier(tokens, cursor + 1)?.name;
						break;
					}
					cursor++;
				}
				const identifier = new IdentifierNode(tokenRange(nameToken), nameToken.value);
				declarations.push(new DefinitionDeclarationNode(
					tokenRange(nameToken),
					identifier,
					'subprogram',
					declarationSection,
					value as SubprogramKind,
					typeName,
					ownerTypeName,
				));

				if (tokens[nameIndex + 1]?.value === '(') {
					let cursor = nameIndex + 2;
					while (cursor < tokens.length && tokens[cursor].value !== ')') {
						const groupStart = cursor;
						while (cursor < tokens.length && tokens[cursor].value !== ':' && tokens[cursor].value !== ';' && tokens[cursor].value !== ')') {
							cursor++;
						}
						if (tokens[cursor]?.value === ':') {
							const parameterType = readQualifiedIdentifier(tokens, cursor + 1)?.name;
							for (let parameterIndex = groupStart; parameterIndex < cursor; parameterIndex++) {
								if (!isIdentifier(tokens[parameterIndex]) ||
									['var', 'const', 'out', 'constref'].includes(tokens[parameterIndex].value.toLowerCase())) {
									continue;
								}
								const parameter = tokens[parameterIndex];
								const parameterIdentifier = new IdentifierNode(tokenRange(parameter), parameter.value);
								declarations.push(new DefinitionDeclarationNode(
									tokenRange(parameter),
									parameterIdentifier,
									'variable',
									declarationSection,
									undefined,
									parameterType,
									undefined,
									nameToken.value,
								));
							}
							while (cursor < tokens.length && tokens[cursor].value !== ';' && tokens[cursor].value !== ')') {
								cursor++;
							}
						}
						if (tokens[cursor]?.value === ';') {
							cursor++;
						} else if (tokens[cursor]?.value !== ')') {
							break;
						}
					}
				}
			}
			declarationMode = 'none';
			continue;
		}

		if (declarationMode === 'none' || !isIdentifier(token)) {
			continue;
		}

		if (declarationMode === 'var') {
			let colonIndex = index + 1;
			while (colonIndex < tokens.length && tokens[colonIndex].value !== ':' && tokens[colonIndex].value !== ';') {
				colonIndex++;
			}
			if (tokens[colonIndex]?.value === ':') {
				const typeName = readQualifiedIdentifier(tokens, colonIndex + 1)?.name;
				for (let nameIndex = index; nameIndex < colonIndex; nameIndex++) {
					if (isIdentifier(tokens[nameIndex])) {
						const nameToken = tokens[nameIndex];
						const identifier = new IdentifierNode(tokenRange(nameToken), nameToken.value);
						declarations.push(new DefinitionDeclarationNode(
							tokenRange(nameToken),
							identifier,
							'variable',
							declarationSection,
							undefined,
							typeName,
						));
					}
				}
				index = colonIndex;
			}
			continue;
		}

		if (declarationMode === 'const' && (next?.value === ':' || next?.value === '=')) {
			const typeName = next.value === ':' ? readQualifiedIdentifier(tokens, index + 2)?.name : undefined;
			const identifier = new IdentifierNode(tokenRange(token), token.value);
			declarations.push(new DefinitionDeclarationNode(
				tokenRange(token),
				identifier,
				'constant',
				declarationSection,
				undefined,
				typeName,
			));
			while (index < tokens.length && tokens[index].value !== ';') {
				index++;
			}
			continue;
		}

		if (declarationMode === 'type' && next?.value === '=') {
			const typeToken = tokens[index + 2];
			const typeKind = typeToken?.value.toLowerCase();
			const isStructuredType = ['class', 'record', 'interface', 'object'].includes(typeKind);
			const underlying = readQualifiedIdentifier(tokens, index + 2);
			const identifier = new IdentifierNode(tokenRange(token), token.value);
			declarations.push(new DefinitionDeclarationNode(
				tokenRange(token),
				identifier,
				'type',
				declarationSection,
				undefined,
				underlying && !isStructuredType &&
					!['array', 'file', 'set', 'packed', 'procedure', 'function'].includes(typeKind ?? '')
					? underlying.name
					: undefined,
			));

			if (typeToken?.value === '(') {
				for (let enumIndex = index + 3; enumIndex < tokens.length && tokens[enumIndex].value !== ')'; enumIndex++) {
					if (!isIdentifier(tokens[enumIndex])) {
						continue;
					}
					const enumMember = tokens[enumIndex];
					const enumIdentifier = new IdentifierNode(tokenRange(enumMember), enumMember.value);
					declarations.push(new DefinitionDeclarationNode(
						tokenRange(enumMember),
						enumIdentifier,
						'enumMember',
						declarationSection,
						undefined,
						token.value,
						token.value,
					));
				}
			}

			let cursor = index + 2;
			if (isStructuredType) {
				while (cursor < tokens.length && tokens[cursor].value.toLowerCase() !== 'end') {
					const memberKind = tokens[cursor].value.toLowerCase();
					if (
						memberKind === 'procedure' || memberKind === 'function' ||
						memberKind === 'constructor' || memberKind === 'destructor'
					) {
						const nameIndex = tokens[cursor + 1]?.value.toLowerCase() === 'class'
							? cursor + 2
							: cursor + 1;
						if (isIdentifier(tokens[nameIndex])) {
							const memberToken = tokens[nameIndex];
							let returnType: string | undefined;
							let signatureIndex = nameIndex + 1;
							let parentheses = 0;
							while (signatureIndex < tokens.length && tokens[signatureIndex].value !== ';') {
								if (tokens[signatureIndex].value === '(') {
									parentheses++;
								} else if (tokens[signatureIndex].value === ')') {
									parentheses--;
								} else if (tokens[signatureIndex].value === ':' && parentheses <= 0) {
									returnType = readQualifiedIdentifier(tokens, signatureIndex + 1)?.name;
									break;
								}
								signatureIndex++;
							}
							const memberIdentifier = new IdentifierNode(tokenRange(memberToken), memberToken.value);
							declarations.push(new DefinitionDeclarationNode(
								tokenRange(memberToken),
								memberIdentifier,
								'subprogram',
								declarationSection,
								memberKind as SubprogramKind,
								returnType,
								token.value,
							));
						}
					} else if (typeKind === 'record' && isIdentifier(tokens[cursor])) {
						let colonIndex = cursor + 1;
						while (
							colonIndex < tokens.length &&
							tokens[colonIndex].value !== ':' &&
							tokens[colonIndex].value !== ';' &&
							tokens[colonIndex].value.toLowerCase() !== 'end'
						) {
							colonIndex++;
						}
						if (tokens[colonIndex]?.value === ':') {
							const fieldTypeName = readQualifiedIdentifier(tokens, colonIndex + 1)?.name;
							for (let fieldIndex = cursor; fieldIndex < colonIndex; fieldIndex++) {
								if (!isIdentifier(tokens[fieldIndex]) ||
									['packed', 'const', 'var'].includes(tokens[fieldIndex].value.toLowerCase())) {
									continue;
								}
								const field = tokens[fieldIndex];
								const fieldIdentifier = new IdentifierNode(tokenRange(field), field.value);
								declarations.push(new DefinitionDeclarationNode(
									tokenRange(field),
									fieldIdentifier,
									'field',
									declarationSection,
									undefined,
									fieldTypeName,
									token.value,
								));
							}
							cursor = colonIndex;
						}
					}
					cursor++;
				}
				if (tokens[cursor]?.value.toLowerCase() === 'end') {
					cursor++;
				}
			}
			while (cursor < tokens.length && tokens[cursor].value !== ';') {
				cursor++;
			}
			index = cursor;
		}
	}

	for (let index = 0; index < tokens.length; index++) {
		if (tokens[index].value.toLowerCase() !== 'with') {
			continue;
		}
		let doIndex = index + 1;
		while (
			doIndex < tokens.length &&
			tokens[doIndex].value.toLowerCase() !== 'do' &&
			tokens[doIndex].value !== ';' &&
			tokens[doIndex].value.toLowerCase() !== 'begin'
		) {
			doIndex++;
		}
		if (tokens[doIndex]?.value.toLowerCase() !== 'do') {
			continue;
		}

		const variableNames: string[] = [];
		for (let variableIndex = index + 1; variableIndex < doIndex; variableIndex++) {
			if (isIdentifier(tokens[variableIndex])) {
				variableNames.push(tokens[variableIndex].value);
			}
		}
		const bodyStart = doIndex + 1;
		let bodyEnd = bodyStart;
		if (tokens[bodyStart]?.value.toLowerCase() === 'begin') {
			let depth = 1;
			bodyEnd++;
			while (bodyEnd < tokens.length && depth > 0) {
				const value = tokens[bodyEnd].value.toLowerCase();
				if (value === 'begin' || value === 'case' || value === 'try') {
					depth++;
				} else if (value === 'end') {
					depth--;
				}
				bodyEnd++;
			}
			bodyEnd--;
		} else {
			while (bodyEnd < tokens.length && tokens[bodyEnd].value !== ';') {
				bodyEnd++;
			}
		}

		let ownerSubprogramName: string | undefined;
		for (let previous = index - 1; previous >= 0; previous--) {
			const kind = tokens[previous].value.toLowerCase();
			if (['procedure', 'function', 'constructor', 'destructor'].includes(kind)) {
				const owner = readQualifiedIdentifier(tokens, previous + 1);
				ownerSubprogramName = owner?.name.split('.').at(-1);
				break;
			}
		}
		if (variableNames.length > 0 && tokens[bodyStart] && tokens[bodyEnd]) {
			withScopes.push({
				variableNames,
				ownerSubprogramName,
				start: tokens[bodyStart],
				end: tokens[bodyEnd],
			});
		}
		index = bodyStart;
	}

	const start = tokens[0];
	const end = tokens[tokens.length - 1];
	const ast = new DefinitionAst(
		start && end
			? Range.create(start.line, start.character, end.line, end.character + end.value.length)
			: Range.create(0, 0, 0, 0),
		unitName,
		usesClauses,
		declarations,
		withScopes,
	);
	const symbols = new DefinitionSymbolTable();
	for (const declaration of ast.declarations) {
		const name = declaration.identifier.name;
		const range = declaration.identifier.range;
		const type = new UnresolvedType(name);
		let symbol: Symbol;
		switch (declaration.kind) {
			case 'variable':
				symbol = new VariableSymbol(name, range, uri, type, declaration);
				break;
			case 'field':
				symbol = new FieldSymbol(name, range, uri, type, undefined, declaration);
				break;
			case 'enumMember': {
				const ordinal = declarations
					.filter(candidate =>
						candidate.kind === 'enumMember' &&
						candidate.ownerTypeName === declaration.ownerTypeName,
					)
					.indexOf(declaration);
				symbol = new EnumMemberSymbol(
					name,
					range,
					uri,
					new UnresolvedType(declaration.typeName ?? name),
					ordinal,
					declaration,
				);
				break;
			}
			case 'constant':
				symbol = new ConstantSymbol(name, range, uri, type, declaration);
				break;
			case 'type':
				symbol = new TypeSymbol(name, range, uri, type, declaration);
				break;
			case 'subprogram':
				symbol = new SubprogramSymbol(
					name,
					range,
					uri,
					declaration.subprogramKind ?? SubprogramKind.Procedure,
					[],
					undefined,
					[],
					undefined,
					false,
					type,
					declaration,
				);
				break;
		}
		symbols.define(symbol);
	}
	return { uri, text, tokens, ast, symbols };
}

export class PascalDefinitionIndex {
	private readonly openDocuments = new Map<string, IndexedDocument>();

	indexDocument(uri: string, text: string): void {
		this.openDocuments.set(uri, parseDocument(uri, text));
	}

	removeDocument(uri: string): void {
		this.openDocuments.delete(uri);
	}

	async findDefinition(
		uri: string,
		word: string,
		searchPaths: readonly string[] = [],
		position?: Position,
	): Promise<Symbol | undefined> {
		if (!word || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(word)) {
			return undefined;
		}
		const root = this.openDocuments.get(uri);
		if (!root) {
			return undefined;
		}
		const contextual = await this.resolveSymbolAtPosition(root, word, position, searchPaths);
		if (contextual) {
			return contextual;
		}
		const visited = new Set<string>();
		return this.findInDocument(root, word, searchPaths, visited, true);
	}

	async findTypeDefinition(
		uri: string,
		word: string,
		searchPaths: readonly string[] = [],
		position?: Position,
	): Promise<Symbol | undefined> {
		const root = this.openDocuments.get(uri);
		if (!root || !word) {
			return undefined;
		}
		const symbol = await this.resolveSymbolAtPosition(root, word, position, searchPaths);
		if (!symbol) {
			return undefined;
		}
		const declaration = symbol.declaringNode;
		if (!(declaration instanceof DefinitionDeclarationNode)) {
			return undefined;
		}
		if (declaration.kind === 'type' && !declaration.typeName) {
			return symbol;
		}
		if (!declaration.typeName) {
			return undefined;
		}
		return this.findInDocument(root, declaration.typeName.split('.').at(-1) ?? declaration.typeName, searchPaths, new Set(), true);
	}

	async findImplementation(
		uri: string,
		word: string,
		searchPaths: readonly string[] = [],
		position?: Position,
	): Promise<Symbol[]> {
		const root = this.openDocuments.get(uri);
		if (!root || !word) {
			return [];
		}
		const symbol = await this.resolveSymbolAtPosition(root, word, position, searchPaths);
		const declaration = symbol?.declaringNode;
		if (!symbol || !(declaration instanceof DefinitionDeclarationNode) || declaration.kind !== 'subprogram') {
			return [];
		}

		const symbolUri = symbol.uri;
		const symbolName = symbol.name;
		const documents = await this.getReachableDocuments(root, searchPaths);
		const implementations: Symbol[] = [];
		for (const document of documents) {
			if (document.uri !== symbolUri) {
				continue;
			}
			for (const candidate of document.symbols.getAll()) {
				const candidateDeclaration = candidate.declaringNode;
				if (
					candidateDeclaration instanceof DefinitionDeclarationNode &&
					candidateDeclaration.kind === 'subprogram' &&
					candidateDeclaration.section === 'implementation' &&
					candidate.name.toLowerCase() === symbolName.toLowerCase() &&
					(candidateDeclaration.ownerTypeName?.toLowerCase() ?? '') ===
						(declaration.ownerTypeName?.toLowerCase() ?? '')
				) {
					implementations.push(candidate);
				}
			}
		}
		return implementations;
	}

	async findReferences(
		uri: string,
		word: string,
		includeDeclaration: boolean,
		searchPaths: readonly string[] = [],
		position?: Position,
	): Promise<Symbol[]> {
		const root = this.openDocuments.get(uri);
		if (!root || !word) {
			return [];
		}
		const target = await this.resolveSymbolAtPosition(root, word, position, searchPaths);
		if (!target) {
			return [];
		}

		const documents = await this.getReachableDocuments(root, searchPaths);
		for (const candidate of this.openDocuments.values()) {
			if (candidate.uri === target.uri || documents.some(item => item.uri === candidate.uri)) {
				continue;
			}
			const dependencies = await this.getReachableDocuments(candidate, searchPaths);
			if (dependencies.some(item => item.uri === target.uri)) {
				documents.push(candidate);
			}
		}

		const results: Symbol[] = [];
		for (const document of documents) {
			const declarationPositions = new Set(
				document.ast.declarations
					.filter(declaration => declaration.identifier.name.toLowerCase() === target.name.toLowerCase())
					.map(declaration => `${declaration.identifier.range.start.line}:${declaration.identifier.range.start.character}`),
			);
			results.push(...this.findTokenReferences(document, target.name).filter(reference =>
				includeDeclaration ||
				!declarationPositions.has(`${reference.range.start.line}:${reference.range.start.character}`),
			));
		}
		return results;
	}

	private findTokenReferences(document: IndexedDocument, name: string): Symbol[] {
		return document.tokens
			.filter(token => token.value.toLowerCase() === name.toLowerCase())
			.map(token => new VariableSymbol(
				name,
				tokenRange(token),
				document.uri,
				new UnresolvedType(name),
			));
	}

	private async resolveSymbolAtPosition(
		document: IndexedDocument,
		word: string,
		position: Position | undefined,
		searchPaths: readonly string[],
	): Promise<Symbol | undefined> {
		const memberAccess = await this.resolveExplicitMemberAccess(document, word, position, searchPaths);
		if (memberAccess) {
			return memberAccess;
		}
		const field = await this.resolveWithField(document, word, position, searchPaths);
		return field ?? this.findInDocument(document, word, searchPaths, new Set(), true);
	}

	private async resolveExplicitMemberAccess(
		document: IndexedDocument,
		word: string,
		position: Position | undefined,
		searchPaths: readonly string[],
	): Promise<Symbol | undefined> {
		if (!position) {
			return undefined;
		}
		const memberIndex = document.tokens.findIndex(token =>
			token.value.toLowerCase() === word.toLowerCase() &&
			token.line === position.line &&
			position.character >= token.character &&
			position.character <= token.character + token.value.length,
		);
		if (memberIndex < 2 || document.tokens[memberIndex - 1].value !== '.') {
			return undefined;
		}

		let firstIndex = memberIndex - 2;
		while (
			firstIndex >= 2 &&
			document.tokens[firstIndex - 1].value === '.' &&
			isIdentifier(document.tokens[firstIndex - 2])
		) {
			firstIndex -= 2;
		}
		if (!isIdentifier(document.tokens[firstIndex])) {
			return undefined;
		}

		let symbol = await this.findInDocument(
			document,
			document.tokens[firstIndex].value,
			searchPaths,
			new Set(),
			true,
		);
		if (!symbol) {
			return undefined;
		}

		let cursor = firstIndex + 1;
		while (cursor <= memberIndex) {
			if (document.tokens[cursor]?.value !== '.' || !isIdentifier(document.tokens[cursor + 1])) {
				return undefined;
			}
			const fieldName = document.tokens[cursor + 1].value;
			symbol = await this.findFieldForSymbol(document, symbol, fieldName, searchPaths);
			if (!symbol) {
				return undefined;
			}
			cursor += 2;
		}
		return symbol.name.toLowerCase() === word.toLowerCase() ? symbol : undefined;
	}

	private async findFieldForSymbol(
		document: IndexedDocument,
		owner: Symbol,
		fieldName: string,
		searchPaths: readonly string[],
	): Promise<Symbol | undefined> {
		const ownerDeclaration = owner.declaringNode;
		if (!(ownerDeclaration instanceof DefinitionDeclarationNode) || !ownerDeclaration.typeName) {
			return undefined;
		}

		let typeSymbol = await this.findInDocument(
			document,
			ownerDeclaration.typeName.split('.').at(-1) ?? ownerDeclaration.typeName,
			searchPaths,
			new Set(),
			true,
		);
		const visitedTypes = new Set<string>();
		while (typeSymbol) {
			const typeKey = `${typeSymbol.uri}:${typeSymbol.name.toLowerCase()}`;
			if (visitedTypes.has(typeKey)) {
				return undefined;
			}
			visitedTypes.add(typeKey);

			const typeDeclaration = typeSymbol.declaringNode;
			if (!(typeDeclaration instanceof DefinitionDeclarationNode)) {
				return undefined;
			}
			if (!typeDeclaration.typeName) {
				const reachable = await this.getReachableDocuments(document, searchPaths);
				return reachable
					.filter(candidateDocument => candidateDocument.uri === typeSymbol?.uri)
					.flatMap(candidateDocument => candidateDocument.symbols.getAll())
					.find(candidate => {
						const declaration = candidate.declaringNode;
						return candidate.name.toLowerCase() === fieldName.toLowerCase() &&
							declaration instanceof DefinitionDeclarationNode &&
							declaration.kind === 'field' &&
							declaration.ownerTypeName?.toLowerCase() === typeSymbol?.name.toLowerCase();
					});
			}

			typeSymbol = await this.findInDocument(
				document,
				typeDeclaration.typeName.split('.').at(-1) ?? typeDeclaration.typeName,
				searchPaths,
				new Set(),
				true,
			);
		}
		return undefined;
	}

	private async resolveWithField(
		document: IndexedDocument,
		word: string,
		position: Position | undefined,
		searchPaths: readonly string[],
	): Promise<Symbol | undefined> {
		if (!position) {
			return undefined;
		}
		const scope = document.ast.withScopes.find(candidate =>
			this.isPositionWithin(position, candidate.start, candidate.end),
		);
		if (!scope) {
			return undefined;
		}

		for (const variableName of scope.variableNames) {
			const variableCandidates = document.symbols.getAll().filter(symbol => {
				const declaration = symbol.declaringNode;
				return symbol.name.toLowerCase() === variableName.toLowerCase() &&
					declaration instanceof DefinitionDeclarationNode &&
					declaration.kind === 'variable' &&
					(
						!scope.ownerSubprogramName ||
						declaration.ownerSubprogramName?.toLowerCase() === scope.ownerSubprogramName.toLowerCase()
					);
			});
			const variable = variableCandidates[0] ?? await this.findInDocument(
				document,
				variableName,
				searchPaths,
				new Set(),
				true,
			);
			const variableDeclaration = variable?.declaringNode;
			if (!(variableDeclaration instanceof DefinitionDeclarationNode) || !variableDeclaration.typeName) {
				continue;
			}

			let typeSymbol = await this.findInDocument(
				document,
				variableDeclaration.typeName.split('.').at(-1) ?? variableDeclaration.typeName,
				searchPaths,
				new Set(),
				true,
			);
			const visitedTypes = new Set<string>();
			while (typeSymbol) {
				const key = `${typeSymbol.uri}:${typeSymbol.name.toLowerCase()}`;
				if (visitedTypes.has(key)) {
					break;
				}
				visitedTypes.add(key);

				const typeDeclaration = typeSymbol.declaringNode;
				if (!(typeDeclaration instanceof DefinitionDeclarationNode) || !typeDeclaration.typeName) {
					const typeDocuments = await this.getReachableDocuments(document, searchPaths);
					for (const candidateDocument of typeDocuments) {
						const field = candidateDocument.symbols.getAll().find(candidate => {
							const declaration = candidate.declaringNode;
							return candidate.name.toLowerCase() === word.toLowerCase() &&
								declaration instanceof DefinitionDeclarationNode &&
								declaration.kind === 'field' &&
								declaration.ownerTypeName?.toLowerCase() === typeSymbol?.name.toLowerCase();
						});
						if (field) {
							return field;
						}
					}
					break;
				}
				typeSymbol = await this.findInDocument(
					document,
					typeDeclaration.typeName.split('.').at(-1) ?? typeDeclaration.typeName,
					searchPaths,
					new Set(),
					true,
				);
			}
		}
		return undefined;
	}

	private isPositionWithin(position: Position, start: Token, end: Token): boolean {
		const afterStart = position.line > start.line ||
			(position.line === start.line && position.character >= start.character);
		const beforeEnd = position.line < end.line ||
			(position.line === end.line && position.character <= end.character + end.value.length);
		return afterStart && beforeEnd;
	}

	private async getReachableDocuments(
		root: IndexedDocument,
		searchPaths: readonly string[],
		visited = new Set<string>(),
	): Promise<IndexedDocument[]> {
		if (visited.has(root.uri)) {
			return [];
		}
		visited.add(root.uri);
		const documents = [root];
		for (const usesClause of root.ast.usesClauses) {
			for (const unit of usesClause.units) {
				const dependency = await this.resolveUnit(root, unit.name, searchPaths);
				if (dependency) {
					documents.push(...await this.getReachableDocuments(dependency, searchPaths, visited));
				}
			}
		}
		return documents;
	}

	private async findInDocument(
		document: IndexedDocument,
		word: string,
		searchPaths: readonly string[],
		visited: Set<string>,
		includeImplementation: boolean,
	): Promise<Symbol | undefined> {
		if (visited.has(document.uri)) {
			return undefined;
		}
		visited.add(document.uri);

		const local = document.symbols.resolve(word);
		const localDeclaration = local?.declaringNode;
		if (
			local &&
			!(localDeclaration instanceof DefinitionDeclarationNode && localDeclaration.kind === 'field') &&
			(includeImplementation || this.isExported(document, local))
		) {
			return local;
		}

		for (const usesClause of document.ast.usesClauses) {
			for (const unit of usesClause.units) {
				const dependency = await this.resolveUnit(document, unit.name, searchPaths);
				if (!dependency) {
					continue;
				}
				const found = await this.findInDocument(dependency, word, searchPaths, visited, false);
				if (found) {
					return found;
				}
			}
		}
		return undefined;
	}

	private isExported(document: IndexedDocument, symbol: Symbol): boolean {
		const declaration = symbol.declaringNode;
		return declaration instanceof DefinitionDeclarationNode &&
			(declaration.section === 'interface' || declaration.section === 'program');
	}

	private async resolveUnit(
		owner: IndexedDocument,
		unitName: string,
		searchPaths: readonly string[],
	): Promise<IndexedDocument | undefined> {
		let ownerDirectory: string;
		try {
			ownerDirectory = path.dirname(fileURLToPath(owner.uri));
		} catch {
			ownerDirectory = '';
		}
		const opened = [...this.openDocuments.values()].filter(document =>
			document.ast.unitName?.toLowerCase() === unitName.toLowerCase(),
		);
		const preferredOpen = opened.find(document => {
			try {
				return path.dirname(fileURLToPath(document.uri)).toLowerCase() === ownerDirectory.toLowerCase();
			} catch {
				return false;
			}
		}) ?? opened[0];
		if (preferredOpen) {
			return preferredOpen;
		}
		const directories = [...new Set([
			...(ownerDirectory ? [ownerDirectory] : []),
			...searchPaths,
		])];
		for (const directory of directories) {
			for (const extension of ['.pas', '.pp', '.p']) {
				const candidate = path.resolve(directory, `${unitName}${extension}`);
				try {
					const text = await fs.promises.readFile(candidate, 'utf8');
					const parsed = parseDocument(pathToFileURL(candidate).toString(), text);
					if (parsed.ast.unitName?.toLowerCase() === unitName.toLowerCase()) {
						return parsed;
					}
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
						throw error;
					}
				}
			}
		}
		return undefined;
	}
}

export function findLocalDefinition(uri: string, text: string, word: string): Symbol | undefined {
	if (!word || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(word)) {
		return undefined;
	}
	return parseDocument(uri, text).symbols.resolve(word);
}
