import { ASTNodeKind, ParameterDirection, SubprogramKind, SubprogramModifier, Visibility } from './kinds';
import { DeclarationNode, ExpressionNode, TypeNode } from './node-base';
import type { SourceRange } from './source-range';
import type { ASTVisitor } from './visitor';
import { IdentifierNode, RecordVariantNode } from './type-nodes';
import type { BlockNode } from './sections';

export class ParameterDeclarationNode extends DeclarationNode {
	readonly kind = ASTNodeKind.ParameterDeclaration;
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
		return visitor.visitParameterDeclaration(this);
	}
}

export class VariableDeclarationNode extends DeclarationNode {
	readonly kind = ASTNodeKind.VariableDeclaration;
	readonly names: readonly IdentifierNode[];
	readonly varType: TypeNode;
	readonly visibility: Visibility | undefined;
	readonly initialValue: ExpressionNode | undefined;

	constructor(
		range: SourceRange,
		names: readonly IdentifierNode[],
		varType: TypeNode,
		visibility: Visibility | undefined,
		initialValue: ExpressionNode | undefined,
	) {
		super(range);
		this.names = names;
		this.varType = varType;
		this.visibility = visibility;
		this.initialValue = initialValue;
		this.adoptAll(names, varType, initialValue);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitVariableDeclaration(this);
	}
}

export class ConstantDeclarationNode extends DeclarationNode {
	readonly kind = ASTNodeKind.ConstantDeclaration;
	readonly name: IdentifierNode;
	readonly constType: TypeNode | undefined;
	readonly value: ExpressionNode;
	readonly visibility: Visibility | undefined;

	constructor(
		range: SourceRange,
		name: IdentifierNode,
		constType: TypeNode | undefined,
		value: ExpressionNode,
		visibility: Visibility | undefined,
	) {
		super(range);
		this.name = name;
		this.constType = constType;
		this.value = value;
		this.visibility = visibility;
		this.adoptAll(name, constType, value);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitConstantDeclaration(this);
	}
}

export class PropertyDeclarationNode extends DeclarationNode {
	readonly kind = ASTNodeKind.PropertyDeclaration;
	readonly name: IdentifierNode;
	readonly propType: TypeNode | undefined;
	readonly readAccessor: IdentifierNode | undefined;
	readonly writeAccessor: IdentifierNode | undefined;
	readonly visibility: Visibility | undefined;

	constructor(
		range: SourceRange,
		name: IdentifierNode,
		propType: TypeNode | undefined,
		readAccessor: IdentifierNode | undefined,
		writeAccessor: IdentifierNode | undefined,
		visibility: Visibility | undefined,
	) {
		super(range);
		this.name = name;
		this.propType = propType;
		this.readAccessor = readAccessor;
		this.writeAccessor = writeAccessor;
		this.visibility = visibility;
		this.adoptAll(name, propType, readAccessor, writeAccessor);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitPropertyDeclaration(this);
	}
}

export class LabelDeclarationNode extends DeclarationNode {
	readonly kind = ASTNodeKind.LabelDeclaration;
	readonly labels: readonly IdentifierNode[];

	constructor(range: SourceRange, labels: readonly IdentifierNode[]) {
		super(range);
		this.labels = labels;
		this.adoptAll(labels);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitLabelDeclaration(this);
	}
}

abstract class SubprogramDeclarationBase extends DeclarationNode {
	readonly name: IdentifierNode | undefined;
	readonly typeParameters: readonly IdentifierNode[];
	readonly parameters: readonly ParameterDeclarationNode[];
	readonly modifiers: readonly SubprogramModifier[];
	readonly visibility: Visibility | undefined;
	readonly body: BlockNode | undefined;
	readonly isForward: boolean;

	constructor(
		range: SourceRange,
		name: IdentifierNode | undefined,
		typeParameters: readonly IdentifierNode[],
		parameters: readonly ParameterDeclarationNode[],
		modifiers: readonly SubprogramModifier[],
		visibility: Visibility | undefined,
		body: BlockNode | undefined,
		isForward: boolean,
	) {
		super(range);
		this.name = name;
		this.typeParameters = typeParameters;
		this.parameters = parameters;
		this.modifiers = modifiers;
		this.visibility = visibility;
		this.body = body;
		this.isForward = isForward;
		this.adoptAll(name, typeParameters, parameters, body);
	}
}

export class ProcedureDeclarationNode extends SubprogramDeclarationBase {
	readonly kind = ASTNodeKind.ProcedureDeclaration;

	constructor(
		range: SourceRange,
		name: IdentifierNode | undefined,
		typeParameters: readonly IdentifierNode[],
		parameters: readonly ParameterDeclarationNode[],
		modifiers: readonly SubprogramModifier[],
		visibility: Visibility | undefined,
		body: BlockNode | undefined,
		isForward: boolean,
	) {
		super(range, name, typeParameters, parameters, modifiers, visibility, body, isForward);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitProcedureDeclaration(this);
	}
}

export class FunctionDeclarationNode extends SubprogramDeclarationBase {
	readonly kind = ASTNodeKind.FunctionDeclaration;
	readonly returnType: TypeNode;

	constructor(
		range: SourceRange,
		name: IdentifierNode | undefined,
		typeParameters: readonly IdentifierNode[],
		parameters: readonly ParameterDeclarationNode[],
		returnType: TypeNode,
		modifiers: readonly SubprogramModifier[],
		visibility: Visibility | undefined,
		body: BlockNode | undefined,
		isForward: boolean,
	) {
		super(range, name, typeParameters, parameters, modifiers, visibility, body, isForward);
		this.returnType = returnType;
		this.adopt(returnType);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitFunctionDeclaration(this);
	}
}

export class MethodDeclarationNode extends SubprogramDeclarationBase {
	readonly kind = ASTNodeKind.MethodDeclaration;
	readonly methodKind: SubprogramKind;
	readonly returnType: TypeNode | undefined;

	constructor(
		range: SourceRange,
		methodKind: SubprogramKind,
		name: IdentifierNode | undefined,
		typeParameters: readonly IdentifierNode[],
		parameters: readonly ParameterDeclarationNode[],
		returnType: TypeNode | undefined,
		modifiers: readonly SubprogramModifier[],
		visibility: Visibility | undefined,
		body: BlockNode | undefined,
		isForward: boolean,
	) {
		super(range, name, typeParameters, parameters, modifiers, visibility, body, isForward);
		this.methodKind = methodKind;
		this.returnType = returnType;
		this.adopt(returnType);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitMethodDeclaration(this);
	}
}

export class ClassDeclarationNode extends DeclarationNode {
	readonly kind = ASTNodeKind.ClassDeclaration;
	readonly name: IdentifierNode;
	readonly typeParameters: readonly IdentifierNode[];
	readonly baseType: TypeNode | undefined;
	readonly members: readonly DeclarationNode[];
	readonly visibility: Visibility | undefined;

	constructor(
		range: SourceRange,
		name: IdentifierNode,
		typeParameters: readonly IdentifierNode[],
		baseType: TypeNode | undefined,
		members: readonly DeclarationNode[],
		visibility: Visibility | undefined,
	) {
		super(range);
		this.name = name;
		this.typeParameters = typeParameters;
		this.baseType = baseType;
		this.members = members;
		this.visibility = visibility;
		this.adoptAll(name, typeParameters, baseType, members);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitClassDeclaration(this);
	}
}

export class RecordDeclarationNode extends DeclarationNode {
	readonly kind = ASTNodeKind.RecordDeclaration;
	readonly name: IdentifierNode | undefined;
	readonly fields: readonly VariableDeclarationNode[];
	readonly variant: RecordVariantNode | undefined;
	readonly visibility: Visibility | undefined;

	constructor(
		range: SourceRange,
		name: IdentifierNode | undefined,
		fields: readonly VariableDeclarationNode[],
		variant: RecordVariantNode | undefined,
		visibility: Visibility | undefined,
	) {
		super(range);
		this.name = name;
		this.fields = fields;
		this.variant = variant;
		this.visibility = visibility;
		this.adoptAll(name, fields, variant);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitRecordDeclaration(this);
	}
}

export class InterfaceDeclarationNode extends DeclarationNode {
	readonly kind = ASTNodeKind.InterfaceDeclaration;
	readonly name: IdentifierNode;
	readonly typeParameters: readonly IdentifierNode[];
	readonly baseType: TypeNode | undefined;
	readonly members: readonly MethodDeclarationNode[];
	readonly visibility: Visibility | undefined;

	constructor(
		range: SourceRange,
		name: IdentifierNode,
		typeParameters: readonly IdentifierNode[],
		baseType: TypeNode | undefined,
		members: readonly MethodDeclarationNode[],
		visibility: Visibility | undefined,
	) {
		super(range);
		this.name = name;
		this.typeParameters = typeParameters;
		this.baseType = baseType;
		this.members = members;
		this.visibility = visibility;
		this.adoptAll(name, typeParameters, baseType, members);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitInterfaceDeclaration(this);
	}
}

export class TypeAliasDeclarationNode extends DeclarationNode {
	readonly kind = ASTNodeKind.TypeAliasDeclaration;
	readonly name: IdentifierNode;
	readonly typeParameters: readonly IdentifierNode[];
	readonly aliasedType: TypeNode;
	readonly visibility: Visibility | undefined;

	constructor(
		range: SourceRange,
		name: IdentifierNode,
		typeParameters: readonly IdentifierNode[],
		aliasedType: TypeNode,
		visibility: Visibility | undefined,
	) {
		super(range);
		this.name = name;
		this.typeParameters = typeParameters;
		this.aliasedType = aliasedType;
		this.visibility = visibility;
		this.adoptAll(name, typeParameters, aliasedType);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitTypeAliasDeclaration(this);
	}
}

export class EnumTypeDeclarationNode extends DeclarationNode {
	readonly kind = ASTNodeKind.EnumTypeDeclaration;
	readonly name: IdentifierNode;
	readonly elements: readonly IdentifierNode[];
	readonly visibility: Visibility | undefined;

	constructor(
		range: SourceRange,
		name: IdentifierNode,
		elements: readonly IdentifierNode[],
		visibility: Visibility | undefined,
	) {
		super(range);
		this.name = name;
		this.elements = elements;
		this.visibility = visibility;
		this.adoptAll(name, elements);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitEnumTypeDeclaration(this);
	}
}

export type TypeSectionMember =
	| ClassDeclarationNode
	| RecordDeclarationNode
	| InterfaceDeclarationNode
	| TypeAliasDeclarationNode
	| EnumTypeDeclarationNode;
