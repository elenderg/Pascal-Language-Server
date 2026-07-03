import { ASTNodeKind } from './kinds';
import { ASTNode, DeclarationNode, StatementNode } from './node-base';
import type { SourceRange } from './source-range';
import type { ASTVisitor } from './visitor';
import type { IdentifierNode } from './type-nodes';
import type {
	ConstantDeclarationNode,
	FunctionDeclarationNode,
	LabelDeclarationNode,
	ProcedureDeclarationNode,
	TypeSectionMember,
	VariableDeclarationNode,
} from './declarations';

export class UsesClauseNode extends ASTNode {
	readonly kind = ASTNodeKind.UsesClause;
	readonly units: readonly IdentifierNode[];

	constructor(range: SourceRange, units: readonly IdentifierNode[]) {
		super(range);
		this.units = units;
		this.adoptAll(units);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitUsesClause(this);
	}
}

export class TypeSectionNode extends ASTNode {
	readonly kind = ASTNodeKind.TypeSection;
	readonly declarations: readonly TypeSectionMember[];

	constructor(range: SourceRange, declarations: readonly TypeSectionMember[]) {
		super(range);
		this.declarations = declarations;
		this.adoptAll(declarations);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitTypeSection(this);
	}
}

export class ConstSectionNode extends ASTNode {
	readonly kind = ASTNodeKind.ConstSection;
	readonly constants: readonly ConstantDeclarationNode[];

	constructor(range: SourceRange, constants: readonly ConstantDeclarationNode[]) {
		super(range);
		this.constants = constants;
		this.adoptAll(constants);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitConstSection(this);
	}
}

export class VarSectionNode extends ASTNode {
	readonly kind = ASTNodeKind.VarSection;
	readonly variables: readonly VariableDeclarationNode[];

	constructor(range: SourceRange, variables: readonly VariableDeclarationNode[]) {
		super(range);
		this.variables = variables;
		this.adoptAll(variables);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitVarSection(this);
	}
}

export type UnitSectionDeclaration =
	| ProcedureDeclarationNode
	| FunctionDeclarationNode
	| DeclarationNode;

export class UnitSectionNode extends ASTNode {
	readonly kind = ASTNodeKind.UnitSection;
	readonly usesClause: UsesClauseNode | undefined;
	readonly typeSection: TypeSectionNode | undefined;
	readonly constSection: ConstSectionNode | undefined;
	readonly varSection: VarSectionNode | undefined;
	readonly declarations: readonly UnitSectionDeclaration[];

	constructor(
		range: SourceRange,
		usesClause: UsesClauseNode | undefined,
		typeSection: TypeSectionNode | undefined,
		constSection: ConstSectionNode | undefined,
		varSection: VarSectionNode | undefined,
		declarations: readonly UnitSectionDeclaration[],
	) {
		super(range);
		this.usesClause = usesClause;
		this.typeSection = typeSection;
		this.constSection = constSection;
		this.varSection = varSection;
		this.declarations = declarations;
		this.adoptAll(usesClause, typeSection, constSection, varSection, declarations);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitUnitSection(this);
	}
}

export class BlockNode extends ASTNode {
	readonly kind = ASTNodeKind.Block;
	readonly labels: readonly LabelDeclarationNode[];
	readonly declarations: readonly DeclarationNode[];
	readonly statements: readonly StatementNode[];

	constructor(
		range: SourceRange,
		labels: readonly LabelDeclarationNode[],
		declarations: readonly DeclarationNode[],
		statements: readonly StatementNode[],
	) {
		super(range);
		this.labels = labels;
		this.declarations = declarations;
		this.statements = statements;
		this.adoptAll(labels, declarations, statements);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitBlock(this);
	}
}

export class ProgramNode extends ASTNode {
	readonly kind = ASTNodeKind.Program;
	readonly name: IdentifierNode;
	readonly block: BlockNode;

	constructor(range: SourceRange, name: IdentifierNode, block: BlockNode) {
		super(range);
		this.name = name;
		this.block = block;
		this.adoptAll(name, block);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitProgram(this);
	}
}

export class UnitNode extends ASTNode {
	readonly kind = ASTNodeKind.Unit;
	readonly name: IdentifierNode;
	readonly interfaceSection: UnitSectionNode;
	readonly implementationSection: UnitSectionNode;
	readonly initialization: BlockNode | undefined;
	readonly finalization: BlockNode | undefined;

	constructor(
		range: SourceRange,
		name: IdentifierNode,
		interfaceSection: UnitSectionNode,
		implementationSection: UnitSectionNode,
		initialization: BlockNode | undefined,
		finalization: BlockNode | undefined,
	) {
		super(range);
		this.name = name;
		this.interfaceSection = interfaceSection;
		this.implementationSection = implementationSection;
		this.initialization = initialization;
		this.finalization = finalization;
		this.adoptAll(name, interfaceSection, implementationSection, initialization, finalization);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitUnit(this);
	}
}
