import type { Scope } from './scopes';
import type { Symbol } from './symbols';
import {
	PascalType,
	PrimitiveType,
	ClassType,
	RecordType,
	InterfaceType,
	GenericType,
	AliasType,
	UnresolvedType,
	ArrayType,
	PointerType,
	SubprogramType,
	EnumType,
	SetType,
	GenericParameterType,
	getBuiltinPrimitiveType,
	PrimitiveTypeName,
} from './types';
import type { TypeNode } from './ast';
import {
	IdentifierNode,
	NamedTypeNode,
	GenericInstTypeNode,
	ClassTypeNode,
	RecordTypeNode,
	InterfaceTypeNode,
	ArrayTypeNode,
	PointerTypeNode,
	SubprogramTypeNode,
	EnumTypeNode,
	SetTypeNode,
	StringTypeNode,
	FormalParameterTypeNode,
} from './ast';

// ---------------------------------------------------------------------------
// TypeResolver - converte TypeNode da AST em PascalType semântico
// ---------------------------------------------------------------------------

/**
 * Resolve tipos sintáticos (TypeNode) em tipos semânticos (PascalType).
 * Esta versão básica não resolve referências a símbolos - isso será feito
 * em uma fase posterior de resolução de nomes.
 */
export class TypeResolver {
	private readonly uri: string;

	constructor(uri: string) {
		this.uri = uri;
	}

	/**
	 * Converte um TypeNode em PascalType.
	 * Tipos nomeados retornam UnresolvedType inicialmente.
	 */
	resolveType(typeNode: TypeNode | undefined): PascalType {
		if (typeNode === undefined) {
			return new PrimitiveType(PrimitiveTypeName.Integer);
		}

		if (typeNode instanceof IdentifierNode) {
			return this.resolveIdentifierType(typeNode);
		}
		if (typeNode instanceof NamedTypeNode) {
			return this.resolveNamedType(typeNode);
		}
		if (typeNode instanceof GenericInstTypeNode) {
			return this.resolveGenericInstType(typeNode);
		}
		if (typeNode instanceof ClassTypeNode) {
			return this.resolveClassType(typeNode);
		}
		if (typeNode instanceof RecordTypeNode) {
			return this.resolveRecordType(typeNode);
		}
		if (typeNode instanceof InterfaceTypeNode) {
			return this.resolveInterfaceType(typeNode);
		}
		if (typeNode instanceof ArrayTypeNode) {
			return this.resolveArrayType(typeNode);
		}
		if (typeNode instanceof PointerTypeNode) {
			return this.resolvePointerType(typeNode);
		}
		if (typeNode instanceof SubprogramTypeNode) {
			return this.resolveSubprogramType(typeNode);
		}
		if (typeNode instanceof EnumTypeNode) {
			return this.resolveEnumType(typeNode);
		}
		if (typeNode instanceof SetTypeNode) {
			return this.resolveSetType(typeNode);
		}
		if (typeNode instanceof StringTypeNode) {
			return this.resolveStringType(typeNode);
		}

		return new UnresolvedType('unknown');
	}

	resolveIdentifierType(node: IdentifierNode): PascalType {
		const name = node.name;
		const builtin = getBuiltinPrimitiveType(name);
		if (builtin !== undefined) {
			return builtin;
		}
		return new UnresolvedType(name);
	}

	resolveNamedType(node: NamedTypeNode): PascalType {
		const name = node.name.name;
		const builtin = getBuiltinPrimitiveType(name);
		if (builtin !== undefined) {
			return builtin;
		}
		return new UnresolvedType(name);
	}

	resolveGenericInstType(node: GenericInstTypeNode): PascalType {
		const baseType = this.resolveType(node.base);
		const typeArgs = node.typeArguments.map(arg => this.resolveType(arg));
		return new GenericType(baseType, typeArgs);
	}

	resolveClassType(node: ClassTypeNode): PascalType {
		const baseClass = node.baseType ? this.resolveType(node.baseType) : undefined;
		const typeParams = node.typeParameters.map(tp => {
			const name = tp.name;
			return new GenericParameterType(name);
		});
		return new ClassType(baseClass as ClassType | undefined, typeParams);
	}

	resolveRecordType(_node: RecordTypeNode): PascalType {
		return new RecordType();
	}

	resolveInterfaceType(node: InterfaceTypeNode): PascalType {
		const parentInterface = node.baseType ? this.resolveType(node.baseType) : undefined;
		const typeParams = node.typeParameters.map(tp => {
			const name = tp.name;
			return new GenericParameterType(name);
		});
		return new InterfaceType(parentInterface as InterfaceType | undefined, typeParams);
	}

	resolveArrayType(node: ArrayTypeNode): PascalType {
		const indexTypes = node.indexTypes.map(it => this.resolveType(it));
		const elementType = this.resolveType(node.elementType);
		return new ArrayType(indexTypes, elementType);
	}

	resolvePointerType(node: PointerTypeNode): PascalType {
		const pointedType = this.resolveType(node.pointedType);
		return new PointerType(pointedType);
	}

	resolveSubprogramType(node: SubprogramTypeNode): PascalType {
		const paramTypes = node.parameters.map(pt => this.resolveType(pt.paramType));
		const returnType = node.returnType ? this.resolveType(node.returnType) : undefined;
		return new SubprogramType(paramTypes, returnType, node.isReferenceTo);
	}

	resolveEnumType(node: EnumTypeNode): PascalType {
		const elements = node.elements.map(e => e.name);
		return new EnumType(elements);
	}

	resolveSetType(node: SetTypeNode): PascalType {
		const elementType = this.resolveType(node.elementType);
		return new SetType(elementType);
	}

	resolveStringType(_node: StringTypeNode): PascalType {
		return getBuiltinPrimitiveType(PrimitiveTypeName.String) ?? new PrimitiveType(PrimitiveTypeName.String);
	}
}
