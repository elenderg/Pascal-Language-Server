import { Range } from 'vscode-languageserver/node';
import type { ASTNode, SubprogramKind, SubprogramModifier, Visibility, ParameterDirection } from './ast';
import { SubprogramModifier as SubprogramModifierEnum } from './ast';
import type { PascalType } from './types';
import { GenericParameterType, VoidType } from './types';
import type { Scope } from './scopes';

// ---------------------------------------------------------------------------
// Símbolos — entidades nomeadas do programa
// ---------------------------------------------------------------------------

export enum SymbolKind {
	Variable = 'variable',
	Constant = 'constant',
	Type = 'type',
	Subprogram = 'subprogram',
	Parameter = 'parameter',
	Field = 'field',
	Property = 'property',
	Unit = 'unit',
	Label = 'label',
	GenericParameter = 'genericParameter',
	EnumMember = 'enumMember',
}

/** Entidade nomeada vinculada a um tipo semântico e a uma posição de origem. */
export abstract class Symbol {
	readonly name: string;
	readonly range: Range;
	readonly uri: string;
	readonly kind: SymbolKind;
	type: PascalType;
	/** Nó AST que originou este símbolo (para referência cruzada sem busca textual). */
	readonly declaringNode: ASTNode | undefined;
	/** Escopo onde o símbolo foi definido. */
	declaringScope: Scope | undefined;

	constructor(
		name: string,
		range: Range,
		uri: string,
		kind: SymbolKind,
		type: PascalType,
		declaringNode?: ASTNode,
	) {
		this.name = name;
		this.range = range;
		this.uri = uri;
		this.kind = kind;
		this.type = type;
		this.declaringNode = declaringNode;
	}
}

export class VariableSymbol extends Symbol {
	constructor(
		name: string,
		range: Range,
		uri: string,
		type: PascalType,
		declaringNode?: ASTNode,
	) {
		super(name, range, uri, SymbolKind.Variable, type, declaringNode);
	}
}

export class ConstantSymbol extends Symbol {
	constructor(
		name: string,
		range: Range,
		uri: string,
		type: PascalType,
		declaringNode?: ASTNode,
	) {
		super(name, range, uri, SymbolKind.Constant, type, declaringNode);
	}
}

export class TypeSymbol extends Symbol {
	constructor(
		name: string,
		range: Range,
		uri: string,
		type: PascalType,
		declaringNode?: ASTNode,
	) {
		super(name, range, uri, SymbolKind.Type, type, declaringNode);
	}
}

export class ClassSymbol extends TypeSymbol {
	readonly visibility: Visibility | undefined;
	readonly isAbstract: boolean;
	readonly isSealed: boolean;

	constructor(
		name: string,
		range: Range,
		uri: string,
		type: PascalType,
		visibility: Visibility | undefined,
		isAbstract: boolean,
		isSealed: boolean,
		declaringNode?: ASTNode,
	) {
		super(name, range, uri, type, declaringNode);
		this.visibility = visibility;
		this.isAbstract = isAbstract;
		this.isSealed = isSealed;
	}
}

export class RecordSymbol extends TypeSymbol {
	readonly visibility: Visibility | undefined;

	constructor(
		name: string,
		range: Range,
		uri: string,
		type: PascalType,
		visibility: Visibility | undefined,
		declaringNode?: ASTNode,
	) {
		super(name, range, uri, type, declaringNode);
		this.visibility = visibility;
	}
}

export class InterfaceSymbol extends TypeSymbol {
	readonly visibility: Visibility | undefined;

	constructor(
		name: string,
		range: Range,
		uri: string,
		type: PascalType,
		visibility: Visibility | undefined,
		declaringNode?: ASTNode,
	) {
		super(name, range, uri, type, declaringNode);
		this.visibility = visibility;
	}
}

export class GenericParameterSymbol extends TypeSymbol {
	readonly constraint: PascalType | undefined;

	constructor(
		name: string,
		range: Range,
		uri: string,
		constraint: PascalType | undefined,
		declaringNode?: ASTNode,
	) {
		super(name, range, uri, new GenericParameterType(name, constraint), declaringNode);
		this.constraint = constraint;
	}
}

export class ParameterSymbol extends VariableSymbol {
	readonly direction: ParameterDirection;
	readonly index: number;
	override readonly kind = SymbolKind.Parameter;

	constructor(
		name: string,
		range: Range,
		uri: string,
		type: PascalType,
		direction: ParameterDirection,
		index: number,
		declaringNode?: ASTNode,
	) {
		super(name, range, uri, type, declaringNode);
		this.direction = direction;
		this.index = index;
	}
}

export class FieldSymbol extends VariableSymbol {
	readonly visibility: Visibility | undefined;

	constructor(
		name: string,
		range: Range,
		uri: string,
		type: PascalType,
		visibility: Visibility | undefined,
		declaringNode?: ASTNode,
	) {
		super(name, range, uri, type, declaringNode);
		this.visibility = visibility;
	}
}

export class PropertySymbol extends Symbol {
	readonly readSymbol: Symbol | undefined;
	readonly writeSymbol: Symbol | undefined;
	readonly visibility: Visibility | undefined;

	constructor(
		name: string,
		range: Range,
		uri: string,
		type: PascalType,
		readSymbol: Symbol | undefined,
		writeSymbol: Symbol | undefined,
		visibility: Visibility | undefined,
		declaringNode?: ASTNode,
	) {
		super(name, range, uri, SymbolKind.Property, type, declaringNode);
		this.readSymbol = readSymbol;
		this.writeSymbol = writeSymbol;
		this.visibility = visibility;
	}
}

export class LabelSymbol extends Symbol {
	constructor(name: string, range: Range, uri: string, declaringNode?: ASTNode) {
		super(name, range, uri, SymbolKind.Label, new VoidType(), declaringNode);
	}
}

export class EnumMemberSymbol extends ConstantSymbol {
	readonly ordinal: number;

	constructor(
		name: string,
		range: Range,
		uri: string,
		type: PascalType,
		ordinal: number,
		declaringNode?: ASTNode,
	) {
		super(name, range, uri, type, declaringNode);
		this.ordinal = ordinal;
	}
}

/** Agrupa overloads com o mesmo nome. */
export class OverloadGroup {
	readonly name: string;
	readonly members: SubprogramSymbol[] = [];

	constructor(name: string) {
		this.name = name;
	}

	add(member: SubprogramSymbol): void {
		this.members.push(member);
	}
}

export class SubprogramSymbol extends Symbol {
	readonly subprogramKind: SubprogramKind;
	readonly parameters: readonly ParameterSymbol[];
	readonly returnType: PascalType | undefined;
	readonly modifiers: readonly SubprogramModifier[];
	readonly visibility: Visibility | undefined;
	readonly isForward: boolean;
	/** Escopo do corpo (variáveis locais, labels, subprogramas aninhados). */
	bodyScope: Scope | undefined;
	/** Grupo de overload quando há múltiplas assinaturas com o mesmo nome. */
	overloadGroup: OverloadGroup | undefined;

	constructor(
		name: string,
		range: Range,
		uri: string,
		subprogramKind: SubprogramKind,
		parameters: readonly ParameterSymbol[],
		returnType: PascalType | undefined,
		modifiers: readonly SubprogramModifier[],
		visibility: Visibility | undefined,
		isForward: boolean,
		type: PascalType,
		declaringNode?: ASTNode,
	) {
		super(name, range, uri, SymbolKind.Subprogram, type, declaringNode);
		this.subprogramKind = subprogramKind;
		this.parameters = parameters;
		this.returnType = returnType;
		this.modifiers = modifiers;
		this.visibility = visibility;
		this.isForward = isForward;
	}

	get isVirtual(): boolean {
		return this.modifiers.includes(SubprogramModifierEnum.Virtual);
	}

	get isOverride(): boolean {
		return this.modifiers.includes(SubprogramModifierEnum.Override);
	}

	get isOverload(): boolean {
		return this.modifiers.includes(SubprogramModifierEnum.Overload);
	}

	get isAbstract(): boolean {
		return this.modifiers.includes(SubprogramModifierEnum.Abstract);
	}

	get isStatic(): boolean {
		return this.modifiers.includes(SubprogramModifierEnum.Static);
	}
}

export class UnitSymbol extends Symbol {
	readonly unitName: string;
	/** Escopo raiz da unit (interface + implementation + uses). */
	unitScope: Scope | undefined;
	/** Documento de origem desta unit. */
	sourceUri: string;

	constructor(
		unitName: string,
		range: Range,
		uri: string,
		declaringNode?: ASTNode,
	) {
		super(unitName, range, uri, SymbolKind.Unit, new VoidType(), declaringNode);
		this.unitName = unitName;
		this.sourceUri = uri;
	}
}
