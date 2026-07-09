import { TextDocument } from 'vscode-languageserver-textdocument';
import { SourcePosition, SourceRange } from './ast/source-range';
import type { ExpressionNode, TypeNode } from './ast/node-base';
import { ASTNode } from './ast/node-base';
import {
	IdentifierNode,
	NamedTypeNode,
	ArrayTypeNode,
	PointerTypeNode,
	StringTypeNode,
	SetTypeNode,
	EnumTypeNode,
} from './ast/type-nodes';
import {
	ParameterDeclarationNode,
	VariableDeclarationNode,
	ConstantDeclarationNode,
	PropertyDeclarationNode,
	LabelDeclarationNode,
	ProcedureDeclarationNode,
	FunctionDeclarationNode,
	MethodDeclarationNode,
	ClassDeclarationNode,
	RecordDeclarationNode,
	InterfaceDeclarationNode,
	TypeAliasDeclarationNode,
	EnumTypeDeclarationNode,
} from './ast/declarations';
import {
	UsesClauseNode,
	TypeSectionNode,
	ConstSectionNode,
	VarSectionNode,
	UnitSectionNode,
	BlockNode,
	ProgramNode,
	UnitNode,
} from './ast/sections';
import {
	AssignStatementNode,
	CallStatementNode,
	IfStatementNode,
	WhileStatementNode,
	RepeatStatementNode,
	ForStatementNode,
	CaseStatementNode,
	CaseBranchNode,
	WithStatementNode,
	TryStatementNode,
	GotoStatementNode,
	ReturnStatementNode,
	RaiseStatementNode,
	EmptyStatementNode,
} from './ast/statements';
import {
	IdentifierExpressionNode,
	LiteralExpressionNode,
	BinaryExpressionNode,
	UnaryExpressionNode,
	MemberExpressionNode,
	IndexExpressionNode,
	CallExpressionNode,
	InheritedExpressionNode,
	SelfExpressionNode,
	CastExpressionNode,
	DerefExpressionNode,
	ParenExpressionNode,
} from './ast/expressions';
import { ParameterDirection, SubprogramKind, SubprogramModifier, Visibility } from './ast/kinds';
import { Range } from 'vscode-languageserver/node';

interface Token {
	type: 'identifier' | 'keyword' | 'symbol' | 'number' | 'string' | 'eof';
	text: string;
	start: SourcePosition;
	end: SourcePosition;
}

const KEYWORDS = new Set([
	'and','array','asm','begin','case','class','const','constructor','destructor','div','do','downto','else','end','except','exit','finalization','finally','for','forward','function','goto','if','implementation','in','inherited','initialization','interface','is','label','library','mod','nil','not','object','of','or','out','packed','procedure','program','property','raise','record','repeat','set','self','shl','shr','string','then','to','try','type','unit','until','uses','var','virtual','while','with','xor','true','false','var','const','type','public','private','protected','published','override','overload','abstract','static','dynamic','inline','message'
]);

export function parsePascalDocument(document: TextDocument): ProgramNode | UnitNode {
	const parser = new PascalParser(document.uri, document.getText());
	return parser.parse();
}

export function parsePascalText(text: string, uri: string): ProgramNode | UnitNode {
	const parser = new PascalParser(uri, text);
	return parser.parse();
}

class PascalParser {
	private readonly text: string;
	private readonly uri: string;
	private readonly tokens: Token[];
	private index = 0;

	constructor(uri: string, text: string) {
		this.uri = uri;
		this.text = text;
		this.tokens = this.tokenize(text);
	}

	parse(): ProgramNode | UnitNode {
		this.skipTrivia();
		if (this.isAtEnd()) {
			return this.createEmptyProgram();
		}
		if (this.matchKeyword('program')) {
			return this.parseProgram();
		}
		if (this.matchKeyword('unit')) {
			return this.parseUnit();
		}
		return this.createEmptyProgram();
	}

	private createEmptyProgram(): ProgramNode {
		const name = this.createIdentifier('Program', this.currentPosition());
		const block = new BlockNode(this.rangeFromPositions(this.currentPosition(), this.currentPosition()), [], [], []);
		return new ProgramNode(this.rangeFromPositions(this.currentPosition(), this.currentPosition()), name, block);
	}

	private parseProgram(): ProgramNode {
		const start = this.previousToken().start;
		const name = this.expectIdentifier('program name');
		this.expectSymbol(';');
		const block = this.parseBlockBody();
		// Use the end of the document instead of just the block
		const end = this.tokens[this.tokens.length - 1]?.end ?? block.range.end;
		return new ProgramNode(this.rangeFromPositions(start, end), name, block);
	}

	private parseUnit(): UnitNode {
		const start = this.previousToken().start;
		const name = this.expectIdentifier('unit name');
		this.expectSymbol(';');
		const interfaceSection = this.parseUnitSection('interface');
		const implementationSection = this.parseUnitSection('implementation');
		// Use the end of the document instead of just the implementation section
		const end = this.tokens[this.tokens.length - 1]?.end ?? implementationSection.range.end;
		return new UnitNode(this.rangeFromPositions(start, end), name, interfaceSection, implementationSection, undefined, undefined);
	}

	private parseUnitSection(kind: 'interface' | 'implementation'): UnitSectionNode {
		const sectionStart = this.currentToken().start;
		const usesClause = this.parseUsesClause();
		const declarations: Array<ProcedureDeclarationNode | FunctionDeclarationNode | VariableDeclarationNode | ConstantDeclarationNode | TypeAliasDeclarationNode | ClassDeclarationNode | RecordDeclarationNode | InterfaceDeclarationNode | EnumTypeDeclarationNode | PropertyDeclarationNode> = [];
		while (!this.isAtEnd()) {
			this.skipTrivia();
			if (this.checkKeyword('implementation') || this.checkKeyword('interface')) {
				if (kind === 'implementation' && this.checkKeyword('implementation')) {
					break;
				}
				if (kind === 'interface' && this.checkKeyword('interface')) {
					break;
				}
			}
			if (this.checkSymbol(';')) {
				this.advance();
				continue;
			}
			if (this.checkKeyword('begin') || this.checkKeyword('initialization') || this.checkKeyword('finalization')) {
				break;
			}
			const decl = this.parseDeclaration();
			if (decl === undefined) {
				this.advance();
				continue;
			}
			declarations.push(decl as never);
		}
		return new UnitSectionNode(this.rangeFromPositions(sectionStart, this.previousToken().end), usesClause, undefined, undefined, undefined, declarations);
	}

	private parseUsesClause(): UsesClauseNode | undefined {
		if (!this.checkKeyword('uses')) {
			return undefined;
		}
		const start = this.advance().start;
		const units: IdentifierNode[] = [];
		while (!this.isAtEnd()) {
			if (this.checkSymbol(';')) {
				this.advance();
				break;
			}
			const name = this.expectIdentifier('unit name');
			units.push(name);
			if (this.checkSymbol(',')) {
				this.advance();
				continue;
			}
			if (this.checkSymbol(';')) {
				this.advance();
				break;
			}
		}
		return new UsesClauseNode(this.rangeFromPositions(start, this.previousToken().end), units);
	}

	private parseDeclaration(): ProcedureDeclarationNode | FunctionDeclarationNode | MethodDeclarationNode | VariableDeclarationNode | ConstantDeclarationNode | TypeAliasDeclarationNode | ClassDeclarationNode | RecordDeclarationNode | InterfaceDeclarationNode | EnumTypeDeclarationNode | PropertyDeclarationNode | LabelDeclarationNode | undefined {
		this.skipTrivia();
		if (this.checkKeyword('var')) {
			return this.parseVarSectionDeclaration();
		}
		if (this.checkKeyword('const')) {
			return this.parseConstDeclaration();
		}
		if (this.checkKeyword('type')) {
			return this.parseTypeDeclaration();
		}
		if (this.checkKeyword('uses')) {
			// Skip uses clause in main program
			this.advance();
			while (!this.isAtEnd()) {
				if (this.checkSymbol(';')) {
					this.advance();
					break;
				}
				this.advance();
			}
			return undefined; // Don't add to declarations
		}
		if (this.checkKeyword('procedure')) {
			return this.parseProcedureDeclaration();
		}
		if (this.checkKeyword('function')) {
			return this.parseFunctionDeclaration();
		}
		if (this.checkKeyword('constructor') || this.checkKeyword('destructor')) {
			// Handle standalone constructor/destructor (method implementations outside class)
			return this.parseMethodDeclaration();
		}
		if (this.checkKeyword('label')) {
			this.advance();
			const labels: IdentifierNode[] = [];
			while (!this.isAtEnd()) {
				if (this.checkSymbol(';')) {
					this.advance();
					break;
				}
				labels.push(this.expectIdentifier('label'));
				if (!this.checkSymbol(',')) {
					break;
				}
				this.advance();
			}
			return new LabelDeclarationNode(this.rangeFromPositions(this.previousToken().start, this.previousToken().end), labels);
		}
		return undefined;
	}

	private parseVarSectionDeclaration(): VariableDeclarationNode {
		const start = this.advance().start;
		const names: IdentifierNode[] = [];
		while (!this.isAtEnd()) {
			if (this.checkSymbol(';')) {
				this.advance();
				break;
			}
			const name = this.expectIdentifier('variable name');
			names.push(name);
			if (!this.checkSymbol(',')) {
				break;
			}
			this.advance();
		}
		this.expectSymbol(':');
		const typeNode = this.parseTypeNode();
		let initialValue: ExpressionNode | undefined;
		if (this.checkSymbol('=')) {
			this.advance();
			initialValue = this.parseExpression();
		}
		this.expectSymbol(';');
		return new VariableDeclarationNode(this.rangeFromPositions(start, this.previousToken().end), names, typeNode, undefined, initialValue);
	}

	private parseConstDeclaration(): ConstantDeclarationNode {
		const start = this.advance().start;
		const name = this.expectIdentifier('constant name');
		let constType: TypeNode | undefined;
		if (this.checkSymbol(':')) {
			this.advance();
			constType = this.parseTypeNode();
		}
		this.expectSymbol('=');
		const value = this.parseExpression();
		this.expectSymbol(';');
		return new ConstantDeclarationNode(this.rangeFromPositions(start, this.previousToken().end), name, constType, value, undefined);
	}

	private parseTypeDeclaration(): TypeAliasDeclarationNode | ClassDeclarationNode | RecordDeclarationNode | InterfaceDeclarationNode | EnumTypeDeclarationNode {
		this.advance();
		const name = this.expectIdentifier('type name');
		this.expectSymbol('=');
		if (this.checkKeyword('class')) {
			return this.parseClassDeclaration(name);
		}
		if (this.checkKeyword('record')) {
			return this.parseRecordDeclaration(name);
		}
		if (this.checkKeyword('interface')) {
			return this.parseInterfaceDeclaration(name);
		}
		if (this.checkKeyword('enum')) {
			return this.parseEnumDeclaration(name);
		}
		const typeNode = this.parseTypeNode();
		this.expectSymbol(';');
		return new TypeAliasDeclarationNode(this.rangeFromPositions(name.range.start, this.previousToken().end), name, [], typeNode, undefined);
	}

	private parseClassDeclaration(name: IdentifierNode): ClassDeclarationNode {
		const start = name.range.start;
		this.advance();
		const members: Array<VariableDeclarationNode | ProcedureDeclarationNode | FunctionDeclarationNode | PropertyDeclarationNode> = [];
		while (!this.isAtEnd()) {
			if (this.checkKeyword('end')) {
				this.advance();
				this.expectSymbol(';');
				break;
			}
			const member = this.parseDeclaration();
			if (member !== undefined) {
				members.push(member as never);
				continue;
			}
			this.advance();
		}
		return new ClassDeclarationNode(this.rangeFromPositions(start, this.previousToken().end), name, [], undefined, members, undefined);
	}

	private parseRecordDeclaration(name: IdentifierNode): RecordDeclarationNode {
		const start = name.range.start;
		this.advance();
		const fields: VariableDeclarationNode[] = [];
		while (!this.isAtEnd()) {
			if (this.checkKeyword('end')) {
				this.advance();
				this.expectSymbol(';');
				break;
			}
			const field = this.parseVarSectionDeclaration();
			fields.push(field);
		}
		return new RecordDeclarationNode(this.rangeFromPositions(start, this.previousToken().end), name, fields, undefined, undefined);
	}

	private parseInterfaceDeclaration(name: IdentifierNode): InterfaceDeclarationNode {
		const start = name.range.start;
		this.advance();
		const members: MethodDeclarationNode[] = [];
		while (!this.isAtEnd()) {
			if (this.checkKeyword('end')) {
				this.advance();
				this.expectSymbol(';');
				break;
			}
			const member = this.parseMethodDeclaration();
			if (member !== undefined) {
				members.push(member);
			}
			this.advance();
		}
		return new InterfaceDeclarationNode(this.rangeFromPositions(start, this.previousToken().end), name, [], undefined, members, undefined);
	}

	private parseEnumDeclaration(name: IdentifierNode): EnumTypeDeclarationNode {
		const start = name.range.start;
		this.advance();
		const elements: IdentifierNode[] = [];
		while (!this.isAtEnd()) {
			if (this.checkSymbol('(')) {
				this.advance();
				while (!this.isAtEnd()) {
					if (this.checkSymbol(')')) {
						this.advance();
						break;
					}
					elements.push(this.expectIdentifier('enum member'));
					if (this.checkSymbol(',')) {
						this.advance();
					}
				}
				break;
			}
			if (this.checkSymbol(';')) {
				this.advance();
				break;
			}
			this.advance();
		}
		return new EnumTypeDeclarationNode(this.rangeFromPositions(start, this.previousToken().end), name, elements, undefined);
	}

	private parseProcedureDeclaration(): ProcedureDeclarationNode {
		const start = this.advance().start;
		const name = this.expectIdentifier('procedure name');
		const parameters = this.parseParameterList();
		let body: BlockNode | undefined;
		if (this.checkSymbol(';')) {
			this.advance();
			if (this.checkKeyword('forward')) {
				this.advance();
				this.expectSymbol(';');
			} else if (this.checkKeyword('begin')) {
				body = this.parseBlockBody();
			}
		}
		return new ProcedureDeclarationNode(this.rangeFromPositions(start, this.previousToken().end), name, [], parameters, [], undefined, body, false);
	}

	private parseFunctionDeclaration(): FunctionDeclarationNode {
		const start = this.advance().start;
		const name = this.expectIdentifier('function name');
		const parameters = this.parseParameterList();
		let returnType: TypeNode = this.parseTypeNode();
		let body: BlockNode | undefined;
		if (this.checkSymbol(';')) {
			this.advance();
			if (this.checkKeyword('forward')) {
				this.advance();
				this.expectSymbol(';');
			} else if (this.checkKeyword('begin')) {
				body = this.parseBlockBody();
			}
		}
		return new FunctionDeclarationNode(this.rangeFromPositions(start, this.previousToken().end), name, [], parameters, returnType, [], undefined, body, false);
	}

	private parseMethodDeclaration(): MethodDeclarationNode {
		const start = this.advance().start;
		const kind = this.previousToken().text === 'constructor' ? SubprogramKind.Constructor : SubprogramKind.Destructor;
		const name = this.expectIdentifier('method name');
		const parameters = this.parseParameterList();
		let returnType: TypeNode | undefined;
		let body: BlockNode | undefined;
		if (this.checkSymbol(';')) {
			this.advance();
			if (this.checkKeyword('forward')) {
				this.advance();
				this.expectSymbol(';');
			} else if (this.checkKeyword('begin')) {
				body = this.parseBlockBody();
			}
		}
		return new MethodDeclarationNode(this.rangeFromPositions(start, this.previousToken().end), kind, name, [], parameters, returnType, [], undefined, body, false);
	}

	private parseParameterList(): ParameterDeclarationNode[] {
		const parameters: ParameterDeclarationNode[] = [];
		if (!this.checkSymbol('(')) {
			return parameters;
		}
		this.advance();
		while (!this.isAtEnd()) {
			if (this.checkSymbol(')')) {
				this.advance();
				break;
			}
			let direction: ParameterDirection = ParameterDirection.Value;
			if (this.checkKeyword('var')) {
				this.advance();
				direction = ParameterDirection.Var;
			} else if (this.checkKeyword('const')) {
				this.advance();
				direction = ParameterDirection.Const;
			} else if (this.checkKeyword('out')) {
				this.advance();
				direction = ParameterDirection.Out;
			}
			const name = this.expectIdentifier('parameter name');
			this.expectSymbol(':');
			const paramType = this.parseTypeNode();
			parameters.push(new ParameterDeclarationNode(this.rangeFromPositions(name.range.start, this.previousToken().end), name, paramType, direction, false));
			if (this.checkSymbol(';')) {
				this.advance();
			} else if (this.checkSymbol(',')) {
				this.advance();
			}
		}
		return parameters;
	}

	private parseBlockBody(): BlockNode {
		const start = this.currentToken().start;
		const labels: LabelDeclarationNode[] = [];
		const declarations: Array<VariableDeclarationNode | ConstantDeclarationNode | TypeAliasDeclarationNode | ProcedureDeclarationNode | FunctionDeclarationNode | MethodDeclarationNode | ClassDeclarationNode | RecordDeclarationNode | InterfaceDeclarationNode | PropertyDeclarationNode> = [];
		const statements: Array<EmptyStatementNode | AssignStatementNode | CallStatementNode | IfStatementNode | WhileStatementNode | RepeatStatementNode | ForStatementNode | CaseStatementNode | WithStatementNode | TryStatementNode | GotoStatementNode | ReturnStatementNode | RaiseStatementNode> = [];
		
		console.log("parseBlockBody: starting at line " + start.line);
		
		// Parse declarations before begin
		while (!this.isAtEnd()) {
			console.log("parseBlockBody: current token at line " + this.currentToken().start.line + " type: " + this.currentToken().type + " text: " + this.currentToken().text);
			if (this.checkKeyword('begin')) {
				console.log("parseBlockBody: found main begin at line " + this.currentToken().start.line);
				break;
			}
			// Only stop at end. (end keyword followed by period), not decimal points
			if (this.checkKeyword('end') && this.checkSymbol('.')) {
				console.log("parseBlockBody: found end. at line " + this.currentToken().start.line);
				break;
			}
			if (this.checkSymbol(';')) {
				this.advance();
				continue;
			}
			const decl = this.parseDeclaration();
			if (decl !== undefined) {
				console.log("parseBlockBody: parsed declaration " + decl.constructor.name + " ending at line " + decl.range.end.line);
				declarations.push(decl as never);
				continue;
			}
			console.log("parseBlockBody: skipping unknown token at line " + this.currentToken().start.line);
			this.advance();
		}
		
		// Parse begin...end block with statements
		if (this.checkKeyword('begin')) {
			this.advance();
			let beginDepth = 1; // Track nested begin...end blocks
			while (!this.isAtEnd()) {
				if (this.checkKeyword('begin')) {
					beginDepth++;
					this.advance();
					continue;
				}
				if (this.checkKeyword('end')) {
					beginDepth--;
					if (beginDepth === 0) {
						this.advance();
						// Check if this is end. (end of program)
						if (this.checkSymbol('.')) {
							this.advance();
						}
						break;
					}
					this.advance();
					continue;
				}
				if (this.checkSymbol(';')) {
					this.advance();
					continue;
				}
				const stmt = this.parseStatement();
				if (stmt !== undefined) {
					statements.push(stmt as never);
					continue;
				}
				this.advance();
			}
		}
		
		const end = this.previousToken().end;
		console.log("parseBlockBody: ending at line " + end.line);
		return new BlockNode(this.rangeFromPositions(start, end), labels, declarations, statements);
	}

	private parseStatement(): EmptyStatementNode | AssignStatementNode | CallStatementNode | IfStatementNode | WhileStatementNode | RepeatStatementNode | ForStatementNode | CaseStatementNode | WithStatementNode | TryStatementNode | GotoStatementNode | ReturnStatementNode | RaiseStatementNode | undefined {
		if (this.checkKeyword('begin')) {
			return new EmptyStatementNode(this.rangeFromPositions(this.currentToken().start, this.currentToken().end));
		}
		if (this.checkKeyword('if')) {
			return new EmptyStatementNode(this.rangeFromPositions(this.currentToken().start, this.currentToken().end));
		}
		if (this.checkKeyword('while')) {
			return new EmptyStatementNode(this.rangeFromPositions(this.currentToken().start, this.currentToken().end));
		}
		if (this.checkKeyword('return')) {
			this.advance();
			const expr = this.parseExpression();
			this.expectSymbol(';');
			return new ReturnStatementNode(this.rangeFromPositions(this.previousToken().start, this.previousToken().end), expr);
		}
		if (this.checkIdentifier()) {
			const id = this.expectIdentifier('statement target');
			if (this.checkSymbol('(')) {
				this.advance();
				this.skipTo(';');
				return new CallStatementNode(this.rangeFromPositions(id.range.start, this.previousToken().end), new CallExpressionNode(this.rangeFromPositions(id.range.start, this.previousToken().end), new IdentifierExpressionNode(id.range, id), [], []));
			}
			if (this.checkSymbol(':=')) {
				this.advance();
				this.parseExpression();
				this.expectSymbol(';');
				return new AssignStatementNode(this.rangeFromPositions(id.range.start, this.previousToken().end), new IdentifierExpressionNode(id.range, id), new LiteralExpressionNode(id.range, 0));
			}
		}
		return undefined;
	}

	private parseExpression(): ExpressionNode {
		this.skipTrivia();
		if (this.checkNumber()) {
			const token = this.advance();
			return new LiteralExpressionNode(this.rangeFromTokens(token, token), Number(token.text));
		}
		if (this.checkString()) {
			const token = this.advance();
			return new LiteralExpressionNode(this.rangeFromTokens(token, token), token.text);
		}
		if (this.checkIdentifier()) {
			const id = this.expectIdentifier('expression identifier');
			if (this.checkSymbol('(')) {
				this.advance();
				this.skipTo(')');
				return new CallExpressionNode(this.rangeFromPositions(id.range.start, this.previousToken().end), new IdentifierExpressionNode(id.range, id), [], []);
			}
			return new IdentifierExpressionNode(id.range, id);
		}
		return new LiteralExpressionNode(this.rangeFromTokens(this.currentToken(), this.currentToken()), 0);
	}

	private parseTypeNode(): TypeNode {
		this.skipTrivia();
		if (this.checkKeyword('array')) {
			const start = this.advance().start;
			this.expectKeyword('of');
			const elementType = this.parseTypeNode();
			return new ArrayTypeNode(this.rangeFromPositions(start, this.previousToken().end), [], elementType);
		}
		if (this.checkKeyword('set')) {
			const start = this.advance().start;
			const elementType = this.parseTypeNode();
			return new SetTypeNode(this.rangeFromPositions(start, this.previousToken().end), elementType);
		}
		if (this.checkKeyword('string')) {
			const start = this.advance().start;
			return new StringTypeNode(this.rangeFromPositions(start, this.previousToken().end), undefined);
		}
		if (this.checkSymbol('^')) {
			const start = this.advance().start;
			const pointedType = this.parseTypeNode();
			return new PointerTypeNode(this.rangeFromPositions(start, this.previousToken().end), pointedType);
		}
		if (this.checkIdentifier()) {
			const id = this.expectIdentifier('type name');
			return new NamedTypeNode(this.rangeFromPositions(id.range.start, id.range.end), id);
		}
		return new NamedTypeNode(this.rangeFromPositions(this.currentToken().start, this.currentToken().end), this.createIdentifier('Unknown', this.currentPosition()));
	}

	private checkIdentifier(): boolean {
		return this.currentToken().type === 'identifier';
	}

	private checkNumber(): boolean {
		return this.currentToken().type === 'number';
	}

	private checkString(): boolean {
		return this.currentToken().type === 'string';
	}

	private checkKeyword(keyword: string): boolean {
		return this.currentToken().type === 'keyword' && this.currentToken().text.toLowerCase() === keyword.toLowerCase();
	}

	private checkSymbol(symbol: string): boolean {
		return this.currentToken().type === 'symbol' && this.currentToken().text === symbol;
	}

	private expectIdentifier(context: string): IdentifierNode {
		if (!this.checkIdentifier()) {
			return this.createIdentifier(context, this.currentPosition());
		}
		const token = this.advance();
		return this.createIdentifier(token.text, token.start, token.end);
	}

	private expectKeyword(keyword: string): Token {
		if (!this.checkKeyword(keyword)) {
			return this.currentToken();
		}
		return this.advance();
	}

	private expectSymbol(symbol: string): Token {
		if (!this.checkSymbol(symbol)) {
			return this.currentToken();
		}
		return this.advance();
	}

	private matchKeyword(keyword: string): boolean {
		if (this.checkKeyword(keyword)) {
			this.advance();
			return true;
		}
		return false;
	}

	private skipTrivia(): void {
		while (!this.isAtEnd() && (this.currentToken().type === 'eof' || this.currentToken().type === 'symbol' && this.currentToken().text === ';')) {
			this.advance();
		}
	}

	private skipTo(expected: string): void {
		let depth = 0;
		while (!this.isAtEnd()) {
			if (this.checkSymbol('(')) {
				depth++;
			} else if (this.checkSymbol(')')) {
				if (depth === 0) {
					this.advance();
					return;
				}
				depth--;
			} else if (this.checkSymbol(expected)) {
				this.advance();
				return;
			}
			this.advance();
		}
	}

	private currentToken(): Token {
		return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1] ?? { type: 'eof', text: '', start: this.currentPosition(), end: this.currentPosition() };
	}

	private previousToken(): Token {
		return this.tokens[this.index - 1] ?? this.currentToken();
	}

	private advance(): Token {
		const token = this.currentToken();
		this.index += 1;
		return token;
	}

	private isAtEnd(): boolean {
		return this.currentToken().type === 'eof';
	}

	private createIdentifier(name: string, start: SourcePosition, end?: SourcePosition): IdentifierNode {
		return new IdentifierNode(this.rangeFromPositions(start, end ?? start), name);
	}

	private currentPosition(): SourcePosition {
		return this.currentToken().start;
	}

	private rangeFromTokens(start: Token, end: Token): SourceRange {
		return new SourceRange(start.start, end.end);
	}

	private rangeFromPositions(start: SourcePosition, end: SourcePosition): SourceRange {
		return new SourceRange(start, end);
	}

	private tokenize(text: string): Token[] {
		const tokens: Token[] = [];
		let i = 0;
		let line = 0;
		let character = 0;
		const lines = text.split(/\r?\n/);
		const getPos = () => new SourcePosition(line, character);
		const advance = () => {
			const ch = text[i] ?? '';
			if (ch === '\n') {
				line += 1;
				character = 0;
			} else if (ch === '\r') {
				character = 0;
			} else {
				character += 1;
			}
			i += 1;
		};
		const peek = () => text[i] ?? '';
		while (i < text.length) {
			const start = getPos();
			const ch = peek();
			if (/\s/.test(ch)) {
				advance();
				continue;
			}
			if (ch === '/' && text[i + 1] === '/') {
				while (i < text.length && text[i] !== '\n') {
					advance();
				}
				continue;
			}
			if (ch === '{') {
				while (i < text.length && text[i] !== '}') {
					advance();
				}
				if (i < text.length) {
					advance();
				}
				continue;
			}
			if (ch === '(' && text[i + 1] === '*') {
				while (i < text.length && !(text[i] === '*' && text[i + 1] === ')')) {
					advance();
				}
				if (i < text.length) {
					advance();
					advance();
				}
				continue;
			}
			if (ch === '\'') {
				advance();
				let value = '';
				while (i < text.length) {
					const current = text[i];
					if (current === '\'') {
						if (text[i + 1] === '\'') {
							value += '\'';
							advance();
							advance();
							continue;
						}
						advance();
						break;
					}
					value += current;
					advance();
				}
				const end = getPos();
				tokens.push({ type: 'string', text: value, start, end });
				continue;
			}
			if (/\d/.test(ch)) {
				let value = '';
				while (i < text.length && /\d/.test(text[i])) {
					value += text[i];
					advance();
				}
				const end = getPos();
				tokens.push({ type: 'number', text: value, start, end });
				continue;
			}
			if (/[A-Za-z_]/.test(ch)) {
				let value = '';
				while (i < text.length && /[A-Za-z0-9_]/.test(text[i])) {
					value += text[i];
					advance();
				}
				const end = getPos();
				const normalized = value.toLowerCase();
				tokens.push({ type: KEYWORDS.has(normalized) ? 'keyword' : 'identifier', text: value, start, end });
				continue;
			}
			const symbolMap = [':=', '>=', '<=', '<>', '..', '>=', '<=', '=>'];
			let matched = false;
			for (const candidate of symbolMap) {
				if (text.startsWith(candidate, i)) {
					const end = getPos();
					const token = { type: 'symbol' as const, text: candidate, start, end: end };
					tokens.push(token);
					for (let j = 0; j < candidate.length; j += 1) {
					advance();
					}
					matched = true;
					break;
				}
			}
			if (matched) {
				continue;
			}
			const singleSymbols = [';', ':', ',', '.', '(', ')', '[', ']', '=', '+', '-', '*', '/', '<', '>', '^', '@', '\\'];
			if (singleSymbols.includes(ch)) {
				const end = getPos();
				tokens.push({ type: 'symbol', text: ch, start, end });
				advance();
				continue;
			}
			advance();
		}
		tokens.push({ type: 'eof', text: '', start: getPos(), end: getPos() });
		return tokens;
	}
}
