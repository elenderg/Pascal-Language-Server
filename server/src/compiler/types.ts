import type { Scope } from './scopes';
import type { Symbol } from './symbols';

// ---------------------------------------------------------------------------
// Sistema de tipos semântico (distinto dos TypeNode sintáticos da AST)
// ---------------------------------------------------------------------------

export enum TypeKind {
	Primitive = 'primitive',
	Class = 'class',
	Record = 'record',
	Interface = 'interface',
	Generic = 'generic',
	Alias = 'alias',
	Unresolved = 'unresolved',
	Array = 'array',
	Pointer = 'pointer',
	Subprogram = 'subprogram',
	Enum = 'enum',
	Set = 'set',
	Void = 'void',
}

export enum PrimitiveTypeName {
	Integer = 'Integer',
	Int64 = 'Int64',
	Cardinal = 'Cardinal',
	Real = 'Real',
	Double = 'Double',
	Extended = 'Extended',
	Currency = 'Currency',
	Char = 'Char',
	WideChar = 'WideChar',
	Boolean = 'Boolean',
	String = 'String',
	WideString = 'WideString',
	AnsiString = 'AnsiString',
	Pointer = 'Pointer',
	Comp = 'Comp',
}

/** Tipo semântico base. Separado dos Symbol para permitir aliases, generics e tipos anônimos. */
export abstract class PascalType {
	abstract readonly kind: TypeKind;

	/** Símbolo que declarou este tipo, quando aplicável. */
	declaringSymbol: Symbol | undefined;

	constructor(declaringSymbol?: Symbol) {
		this.declaringSymbol = declaringSymbol;
	}
}

export class PrimitiveType extends PascalType {
	readonly kind = TypeKind.Primitive as const;
	readonly name: PrimitiveTypeName;

	constructor(name: PrimitiveTypeName) {
		super();
		this.name = name;
	}
}

export class VoidType extends PascalType {
	readonly kind = TypeKind.Void as const;
}

export class ClassType extends PascalType {
	readonly kind = TypeKind.Class as const;
	readonly baseClass: ClassType | undefined;
	readonly typeParameters: readonly GenericParameterType[];
	/** Escopo de membros da classe — preenchido pelo analisador semântico. */
	classScope: Scope | undefined;

	constructor(
		baseClass?: ClassType,
		typeParameters: readonly GenericParameterType[] = [],
		declaringSymbol?: Symbol,
	) {
		super(declaringSymbol);
		this.baseClass = baseClass;
		this.typeParameters = typeParameters;
	}
}

export class RecordType extends PascalType {
	readonly kind = TypeKind.Record as const;
	recordScope: Scope | undefined;

	constructor(declaringSymbol?: Symbol) {
		super(declaringSymbol);
	}
}

export class InterfaceType extends PascalType {
	readonly kind = TypeKind.Interface as const;
	readonly parentInterface: InterfaceType | undefined;
	readonly typeParameters: readonly GenericParameterType[];
	interfaceScope: Scope | undefined;

	constructor(
		parentInterface?: InterfaceType,
		typeParameters: readonly GenericParameterType[] = [],
		declaringSymbol?: Symbol,
	) {
		super(declaringSymbol);
		this.parentInterface = parentInterface;
		this.typeParameters = typeParameters;
	}
}

/** Parâmetro de tipo genérico (ex.: T em TList&lt;T&gt;). */
export class GenericParameterType extends PascalType {
	readonly kind = TypeKind.Generic as const;
	readonly name: string;
	readonly constraint: PascalType | undefined;

	constructor(name: string, constraint?: PascalType) {
		super();
		this.name = name;
		this.constraint = constraint;
	}
}

/**
 * Instanciação ou definição genérica completa.
 * A resolução concreta de membros fica para fases posteriores.
 */
export class GenericType extends PascalType {
	readonly kind = TypeKind.Generic as const;
	readonly definition: PascalType;
	readonly typeArguments: readonly PascalType[];

	constructor(definition: PascalType, typeArguments: readonly PascalType[] = []) {
		super(definition.declaringSymbol);
		this.definition = definition;
		this.typeArguments = typeArguments;
	}
}

export class AliasType extends PascalType {
	readonly kind = TypeKind.Alias as const;
	readonly underlying: PascalType;

	constructor(underlying: PascalType, declaringSymbol?: Symbol) {
		super(declaringSymbol);
		this.underlying = underlying;
	}

	/** Resolve cadeias de alias até o tipo concreto. */
	resolveAlias(): PascalType {
		let current: PascalType = this.underlying;
		while (current instanceof AliasType) {
			current = current.underlying;
		}
		return current;
	}
}

/**
 * Placeholder para referências de tipo ainda não resolvidas
 * (uses pendente, forward declaration, análise em duas passagens).
 */
export class UnresolvedType extends PascalType {
	readonly kind = TypeKind.Unresolved as const;
	readonly name: string;
	readonly unitHint: string | undefined;

	constructor(name: string, unitHint?: string) {
		super();
		this.name = name;
		this.unitHint = unitHint;
	}

	resolvedType: PascalType | undefined;
}

export class ArrayType extends PascalType {
	readonly kind = TypeKind.Array as const;
	readonly indexTypes: readonly PascalType[];
	readonly elementType: PascalType;

	constructor(indexTypes: readonly PascalType[], elementType: PascalType) {
		super();
		this.indexTypes = indexTypes;
		this.elementType = elementType;
	}
}

export class PointerType extends PascalType {
	readonly kind = TypeKind.Pointer as const;
	readonly pointedType: PascalType;

	constructor(pointedType: PascalType) {
		super();
		this.pointedType = pointedType;
	}
}

export class SubprogramType extends PascalType {
	readonly kind = TypeKind.Subprogram as const;
	readonly parameterTypes: readonly PascalType[];
	readonly returnType: PascalType | undefined;
	readonly isReferenceTo: boolean;

	constructor(
		parameterTypes: readonly PascalType[],
		returnType: PascalType | undefined,
		isReferenceTo: boolean,
	) {
		super();
		this.parameterTypes = parameterTypes;
		this.returnType = returnType;
		this.isReferenceTo = isReferenceTo;
	}
}

export class EnumType extends PascalType {
	readonly kind = TypeKind.Enum as const;
	readonly elements: readonly string[];

	constructor(elements: readonly string[], declaringSymbol?: Symbol) {
		super(declaringSymbol);
		this.elements = elements;
	}
}

export class SetType extends PascalType {
	readonly kind = TypeKind.Set as const;
	readonly elementType: PascalType;

	constructor(elementType: PascalType) {
		super();
		this.elementType = elementType;
	}
}

/** Tipos primitivos predefinidos disponíveis globalmente. */
export const BUILTIN_PRIMITIVE_TYPES: ReadonlyMap<string, PrimitiveType> = new Map(
	Object.values(PrimitiveTypeName).map(name => [name.toLowerCase(), new PrimitiveType(name)]),
);

export function getBuiltinPrimitiveType(name: string): PrimitiveType | undefined {
	return BUILTIN_PRIMITIVE_TYPES.get(name.toLowerCase());
}
