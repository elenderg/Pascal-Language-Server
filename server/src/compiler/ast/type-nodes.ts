import { ASTNodeKind, ParameterDirection } from './kinds';
import { ASTNode, DeclarationNode, TypeNode, type ExpressionNode } from './node-base';
import type { SourceRange } from './source-range';
import type { ASTVisitor } from './visitor';

export class IdentifierNode extends ASTNode {
	readonly kind = ASTNodeKind.Identifier;
	readonly name: string;

	constructor(range: SourceRange, name: string) {
		super(range);
		this.name = name;
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitIdentifier(this);
	}
}

export class NamedTypeNode extends TypeNode {
	readonly kind = ASTNodeKind.NamedType;
	readonly name: IdentifierNode;

	constructor(range: SourceRange, name: IdentifierNode) {
		super(range);
		this.name = name;
		this.adopt(name);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitNamedType(this);
	}
}

export class GenericInstTypeNode extends TypeNode {
	readonly kind = ASTNodeKind.GenericType;
	readonly base: TypeNode;
	readonly typeArguments: readonly TypeNode[];

	constructor(range: SourceRange, base: TypeNode, typeArguments: readonly TypeNode[]) {
		super(range);
		this.base = base;
		this.typeArguments = typeArguments;
		this.adoptAll(base, typeArguments);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitGenericInstType(this);
	}
}

export class ClassTypeNode extends TypeNode {
	readonly kind = ASTNodeKind.ClassType;
	readonly baseType: TypeNode | undefined;
	readonly members: readonly DeclarationNode[];
	readonly typeParameters: readonly IdentifierNode[];

	constructor(
		range: SourceRange,
		baseType: TypeNode | undefined,
		members: readonly DeclarationNode[],
		typeParameters: readonly IdentifierNode[],
	) {
		super(range);
		this.baseType = baseType;
		this.members = members;
		this.typeParameters = typeParameters;
		this.adoptAll(baseType, typeParameters, members);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitClassType(this);
	}
}

export class RecordTypeNode extends TypeNode {
	readonly kind = ASTNodeKind.RecordType;
	readonly fields: readonly DeclarationNode[];
	readonly variant: RecordVariantNode | undefined;

	constructor(
		range: SourceRange,
		fields: readonly DeclarationNode[],
		variant: RecordVariantNode | undefined,
	) {
		super(range);
		this.fields = fields;
		this.variant = variant;
		this.adoptAll(fields, variant);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitRecordType(this);
	}
}

export class RecordVariantNode extends ASTNode {
	readonly kind = ASTNodeKind.RecordVariant;
	readonly tagField: IdentifierNode | undefined;
	readonly tagType: TypeNode | undefined;
	readonly cases: readonly RecordVariantCaseNode[];

	constructor(
		range: SourceRange,
		tagField: IdentifierNode | undefined,
		tagType: TypeNode | undefined,
		cases: readonly RecordVariantCaseNode[],
	) {
		super(range);
		this.tagField = tagField;
		this.tagType = tagType;
		this.cases = cases;
		this.adoptAll(tagField, tagType, cases);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitRecordVariant(this);
	}
}

export class RecordVariantCaseNode extends ASTNode {
	readonly kind = ASTNodeKind.RecordVariantCase;
	readonly labels: readonly ExpressionNode[];
	readonly fields: readonly DeclarationNode[];

	constructor(
		range: SourceRange,
		labels: readonly ExpressionNode[],
		fields: readonly DeclarationNode[],
	) {
		super(range);
		this.labels = labels;
		this.fields = fields;
		this.adoptAll(labels, fields);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitRecordVariantCase(this);
	}
}

export class InterfaceTypeNode extends TypeNode {
	readonly kind = ASTNodeKind.InterfaceType;
	readonly baseType: TypeNode | undefined;
	readonly members: readonly DeclarationNode[];
	readonly typeParameters: readonly IdentifierNode[];

	constructor(
		range: SourceRange,
		baseType: TypeNode | undefined,
		members: readonly DeclarationNode[],
		typeParameters: readonly IdentifierNode[],
	) {
		super(range);
		this.baseType = baseType;
		this.members = members;
		this.typeParameters = typeParameters;
		this.adoptAll(baseType, typeParameters, members);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitInterfaceType(this);
	}
}

export class ArrayTypeNode extends TypeNode {
	readonly kind = ASTNodeKind.ArrayType;
	readonly indexTypes: readonly TypeNode[];
	readonly elementType: TypeNode;

	constructor(range: SourceRange, indexTypes: readonly TypeNode[], elementType: TypeNode) {
		super(range);
		this.indexTypes = indexTypes;
		this.elementType = elementType;
		this.adoptAll(indexTypes, elementType);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitArrayType(this);
	}
}

export class PointerTypeNode extends TypeNode {
	readonly kind = ASTNodeKind.PointerType;
	readonly pointedType: TypeNode;

	constructor(range: SourceRange, pointedType: TypeNode) {
		super(range);
		this.pointedType = pointedType;
		this.adopt(pointedType);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitPointerType(this);
	}
}

export class FormalParameterTypeNode extends TypeNode {
	readonly kind = ASTNodeKind.FormalParameterType;
	readonly name: IdentifierNode | undefined;
	readonly paramType: TypeNode | undefined;
	readonly direction: ParameterDirection;
	readonly isConst: boolean;

	constructor(
		range: SourceRange,
		name: IdentifierNode | undefined,
		paramType: TypeNode | undefined,
		direction: ParameterDirection,
		isConst: boolean,
	) {
		super(range);
		this.name = name;
		this.paramType = paramType;
		this.direction = direction;
		this.isConst = isConst;
		this.adoptAll(name, paramType);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitFormalParameterType(this);
	}
}

export class SubprogramTypeNode extends TypeNode {
	readonly kind = ASTNodeKind.SubprogramType;
	readonly isReferenceTo: boolean;
	readonly parameters: readonly FormalParameterTypeNode[];
	readonly returnType: TypeNode | undefined;

	constructor(
		range: SourceRange,
		isReferenceTo: boolean,
		parameters: readonly FormalParameterTypeNode[],
		returnType: TypeNode | undefined,
	) {
		super(range);
		this.isReferenceTo = isReferenceTo;
		this.parameters = parameters;
		this.returnType = returnType;
		this.adoptAll(parameters, returnType);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitSubprogramType(this);
	}
}

export class EnumTypeNode extends TypeNode {
	readonly kind = ASTNodeKind.EnumType;
	readonly elements: readonly IdentifierNode[];

	constructor(range: SourceRange, elements: readonly IdentifierNode[]) {
		super(range);
		this.elements = elements;
		this.adoptAll(elements);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitEnumType(this);
	}
}

export class SetTypeNode extends TypeNode {
	readonly kind = ASTNodeKind.SetType;
	readonly elementType: TypeNode;

	constructor(range: SourceRange, elementType: TypeNode) {
		super(range);
		this.elementType = elementType;
		this.adopt(elementType);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitSetType(this);
	}
}

export class StringTypeNode extends TypeNode {
	readonly kind = ASTNodeKind.StringType;
	readonly size: ExpressionNode | undefined;

	constructor(range: SourceRange, size: ExpressionNode | undefined) {
		super(range);
		this.size = size;
		this.adopt(size);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitStringType(this);
	}
}
