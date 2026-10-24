import { Range } from 'vscode-languageserver/node';

// ---------------------------------------------------------------------------
// Modificadores e classificações sintáticas (parte da AST, não da semântica)
// ---------------------------------------------------------------------------

export enum SubprogramKind {
	Procedure = 'procedure',
	Function = 'function',
	Constructor = 'constructor',
	Destructor = 'destructor',
}

export enum Visibility {
	Public = 'public',
	Private = 'private',
	Protected = 'protected',
	Published = 'published',
	StrictPrivate = 'strict private',
	StrictProtected = 'strict protected',
}

/** Modificadores de subprogramas e métodos de classe. */
export enum SubprogramModifier {
	Virtual = 'virtual',
	Override = 'override',
	Overload = 'overload',
	Abstract = 'abstract',
	Reintroduce = 'reintroduce',
	Static = 'static',
	Inline = 'inline',
	Dynamic = 'dynamic',
	Message = 'message',
}

export enum ParameterDirection {
	In = 'in',
	Out = 'out',
	InOut = 'inout',
	Const = 'const',
	Var = 'var',
}

// ---------------------------------------------------------------------------
// Nós base
// ---------------------------------------------------------------------------

/** Nó raiz de toda a AST. Todo nó carrega um intervalo de origem para mapeamento LSP. */
export abstract class ASTNode {
	readonly range: Range;

	constructor(range: Range) {
		this.range = range;
	}
}

export class IdentifierNode extends ASTNode {
	readonly name: string;

	constructor(range: Range, name: string) {
		super(range);
		this.name = name;
	}
}

// ---------------------------------------------------------------------------
// Unidades de compilação
// ---------------------------------------------------------------------------

export class ProgramNode extends ASTNode {
	readonly name: IdentifierNode;
	readonly block: BlockStmtNode;

	constructor(range: Range, name: IdentifierNode, block: BlockStmtNode) {
		super(range);
		this.name = name;
		this.block = block;
	}
}

export class UnitNode extends ASTNode {
	readonly name: IdentifierNode;
	readonly interfaceUses: UsesClauseNode | undefined;
	readonly interfaceSection: InterfaceSectionNode;
	readonly implementationUses: UsesClauseNode | undefined;
	readonly implementationSection: ImplementationSectionNode;
	readonly initialization: BlockStmtNode | undefined;
	readonly finalization: BlockStmtNode | undefined;

	constructor(
		range: Range,
		name: IdentifierNode,
		interfaceUses: UsesClauseNode | undefined,
		interfaceSection: InterfaceSectionNode,
		implementationUses: UsesClauseNode | undefined,
		implementationSection: ImplementationSectionNode,
		initialization: BlockStmtNode | undefined,
		finalization: BlockStmtNode | undefined,
	) {
		super(range);
		this.name = name;
		this.interfaceUses = interfaceUses;
		this.interfaceSection = interfaceSection;
		this.implementationUses = implementationUses;
		this.implementationSection = implementationSection;
		this.initialization = initialization;
		this.finalization = finalization;
	}
}

export class UsesClauseNode extends ASTNode {
	readonly units: readonly IdentifierNode[];

	constructor(range: Range, units: readonly IdentifierNode[]) {
		super(range);
		this.units = units;
	}
}

export class InterfaceSectionNode extends ASTNode {
	readonly declarations: readonly DeclNode[];

	constructor(range: Range, declarations: readonly DeclNode[]) {
		super(range);
		this.declarations = declarations;
	}
}

export class ImplementationSectionNode extends ASTNode {
	readonly declarations: readonly DeclNode[];

	constructor(range: Range, declarations: readonly DeclNode[]) {
		super(range);
		this.declarations = declarations;
	}
}

// ---------------------------------------------------------------------------
// Declarações
// ---------------------------------------------------------------------------

export abstract class DeclNode extends ASTNode {}

export class VarDeclNode extends DeclNode {
	readonly names: readonly IdentifierNode[];
	readonly type: TypeNode;
	readonly visibility: Visibility | undefined;

	constructor(
		range: Range,
		names: readonly IdentifierNode[],
		type: TypeNode,
		visibility: Visibility | undefined,
	) {
		super(range);
		this.names = names;
		this.type = type;
		this.visibility = visibility;
	}
}

export class ConstDeclNode extends DeclNode {
	readonly name: IdentifierNode;
	readonly type: TypeNode | undefined;
	readonly value: ExprNode;
	readonly visibility: Visibility | undefined;

	constructor(
		range: Range,
		name: IdentifierNode,
		type: TypeNode | undefined,
		value: ExprNode,
		visibility: Visibility | undefined,
	) {
		super(range);
		this.name = name;
		this.type = type;
		this.value = value;
		this.visibility = visibility;
	}
}

export class TypeDeclNode extends DeclNode {
	readonly name: IdentifierNode;
	readonly definition: TypeNode;
	readonly visibility: Visibility | undefined;

	constructor(
		range: Range,
		name: IdentifierNode,
		definition: TypeNode,
		visibility: Visibility | undefined,
	) {
		super(range);
		this.name = name;
		this.definition = definition;
		this.visibility = visibility;
	}
}

export class FieldDeclNode extends DeclNode {
	readonly names: readonly IdentifierNode[];
	readonly type: TypeNode;
	readonly visibility: Visibility | undefined;

	constructor(
		range: Range,
		names: readonly IdentifierNode[],
		type: TypeNode,
		visibility: Visibility | undefined,
	) {
		super(range);
		this.names = names;
		this.type = type;
		this.visibility = visibility;
	}
}

export class PropertyDeclNode extends DeclNode {
	readonly name: IdentifierNode;
	readonly type: TypeNode | undefined;
	readonly readAccessor: IdentifierNode | undefined;
	readonly writeAccessor: IdentifierNode | undefined;
	readonly visibility: Visibility | undefined;

	constructor(
		range: Range,
		name: IdentifierNode,
		type: TypeNode | undefined,
		readAccessor: IdentifierNode | undefined,
		writeAccessor: IdentifierNode | undefined,
		visibility: Visibility | undefined,
	) {
		super(range);
		this.name = name;
		this.type = type;
		this.readAccessor = readAccessor;
		this.writeAccessor = writeAccessor;
		this.visibility = visibility;
	}
}

export class ParameterNode extends ASTNode {
	readonly name: IdentifierNode | undefined;
	readonly type: TypeNode | undefined;
	readonly direction: ParameterDirection;
	readonly isConst: boolean;

	constructor(
		range: Range,
		name: IdentifierNode | undefined,
		type: TypeNode | undefined,
		direction: ParameterDirection,
		isConst: boolean,
	) {
		super(range);
		this.name = name;
		this.type = type;
		this.direction = direction;
		this.isConst = isConst;
	}
}

export class SubprogramDeclNode extends DeclNode {
	readonly kind: SubprogramKind;
	readonly name: IdentifierNode | undefined;
	readonly typeParameters: readonly IdentifierNode[];
	readonly parameters: readonly ParameterNode[];
	readonly returnType: TypeNode | undefined;
	readonly modifiers: readonly SubprogramModifier[];
	readonly visibility: Visibility | undefined;
	readonly body: BlockStmtNode | undefined;
	readonly isForward: boolean;

	constructor(
		range: Range,
		kind: SubprogramKind,
		name: IdentifierNode | undefined,
		typeParameters: readonly IdentifierNode[],
		parameters: readonly ParameterNode[],
		returnType: TypeNode | undefined,
		modifiers: readonly SubprogramModifier[],
		visibility: Visibility | undefined,
		body: BlockStmtNode | undefined,
		isForward: boolean,
	) {
		super(range);
		this.kind = kind;
		this.name = name;
		this.typeParameters = typeParameters;
		this.parameters = parameters;
		this.returnType = returnType;
		this.modifiers = modifiers;
		this.visibility = visibility;
		this.body = body;
		this.isForward = isForward;
	}
}

export class LabelDeclNode extends DeclNode {
	readonly labels: readonly IdentifierNode[];

	constructor(range: Range, labels: readonly IdentifierNode[]) {
		super(range);
		this.labels = labels;
	}
}

// ---------------------------------------------------------------------------
// Tipos (representação sintática — distinta dos PascalType semânticos)
// ---------------------------------------------------------------------------

export abstract class TypeNode extends ASTNode {}

export class NamedTypeNode extends TypeNode {
	readonly name: IdentifierNode;

	constructor(range: Range, name: IdentifierNode) {
		super(range);
		this.name = name;
	}
}

export class GenericInstTypeNode extends TypeNode {
	readonly base: TypeNode;
	readonly typeArguments: readonly TypeNode[];

	constructor(range: Range, base: TypeNode, typeArguments: readonly TypeNode[]) {
		super(range);
		this.base = base;
		this.typeArguments = typeArguments;
	}
}

export class GenericDefTypeNode extends TypeNode {
	readonly name: IdentifierNode;
	readonly typeParameters: readonly IdentifierNode[];
	readonly constraint: TypeNode | undefined;
	readonly definition: TypeNode;

	constructor(
		range: Range,
		name: IdentifierNode,
		typeParameters: readonly IdentifierNode[],
		constraint: TypeNode | undefined,
		definition: TypeNode,
	) {
		super(range);
		this.name = name;
		this.typeParameters = typeParameters;
		this.constraint = constraint;
		this.definition = definition;
	}
}

export class ClassTypeNode extends TypeNode {
	readonly parent: TypeNode | undefined;
	readonly members: readonly DeclNode[];
	readonly typeParameters: readonly IdentifierNode[];

	constructor(
		range: Range,
		parent: TypeNode | undefined,
		members: readonly DeclNode[],
		typeParameters: readonly IdentifierNode[],
	) {
		super(range);
		this.parent = parent;
		this.members = members;
		this.typeParameters = typeParameters;
	}
}

export class RecordTypeNode extends TypeNode {
	readonly fields: readonly FieldDeclNode[];
	readonly variant: RecordVariantNode | undefined;

	constructor(
		range: Range,
		fields: readonly FieldDeclNode[],
		variant: RecordVariantNode | undefined,
	) {
		super(range);
		this.fields = fields;
		this.variant = variant;
	}
}

export class RecordVariantNode extends ASTNode {
	readonly tagField: IdentifierNode | undefined;
	readonly tagType: TypeNode | undefined;
	readonly cases: readonly RecordVariantCaseNode[];

	constructor(
		range: Range,
		tagField: IdentifierNode | undefined,
		tagType: TypeNode | undefined,
		cases: readonly RecordVariantCaseNode[],
	) {
		super(range);
		this.tagField = tagField;
		this.tagType = tagType;
		this.cases = cases;
	}
}

export class RecordVariantCaseNode extends ASTNode {
	readonly labels: readonly ExprNode[];
	readonly fields: readonly FieldDeclNode[];

	constructor(range: Range, labels: readonly ExprNode[], fields: readonly FieldDeclNode[]) {
		super(range);
		this.labels = labels;
		this.fields = fields;
	}
}

export class InterfaceTypeNode extends TypeNode {
	readonly parent: TypeNode | undefined;
	readonly members: readonly DeclNode[];
	readonly typeParameters: readonly IdentifierNode[];

	constructor(
		range: Range,
		parent: TypeNode | undefined,
		members: readonly DeclNode[],
		typeParameters: readonly IdentifierNode[],
	) {
		super(range);
		this.parent = parent;
		this.members = members;
		this.typeParameters = typeParameters;
	}
}

export class ArrayTypeNode extends TypeNode {
	readonly indexTypes: readonly TypeNode[];
	readonly elementType: TypeNode;

	constructor(range: Range, indexTypes: readonly TypeNode[], elementType: TypeNode) {
		super(range);
		this.indexTypes = indexTypes;
		this.elementType = elementType;
	}
}

export class PointerTypeNode extends TypeNode {
	readonly pointedType: TypeNode;

	constructor(range: Range, pointedType: TypeNode) {
		super(range);
		this.pointedType = pointedType;
	}
}

export class SubprogramTypeNode extends TypeNode {
	readonly kind: SubprogramKind;
	readonly parameters: readonly ParameterNode[];
	readonly returnType: TypeNode | undefined;
	readonly isReferenceTo: boolean;

	constructor(
		range: Range,
		kind: SubprogramKind,
		parameters: readonly ParameterNode[],
		returnType: TypeNode | undefined,
		isReferenceTo: boolean,
	) {
		super(range);
		this.kind = kind;
		this.parameters = parameters;
		this.returnType = returnType;
		this.isReferenceTo = isReferenceTo;
	}
}

export class EnumTypeNode extends TypeNode {
	readonly elements: readonly IdentifierNode[];

	constructor(range: Range, elements: readonly IdentifierNode[]) {
		super(range);
		this.elements = elements;
	}
}

export class SetTypeNode extends TypeNode {
	readonly elementType: TypeNode;

	constructor(range: Range, elementType: TypeNode) {
		super(range);
		this.elementType = elementType;
	}
}

export class StringTypeNode extends TypeNode {
	readonly size: ExprNode | undefined;

	constructor(range: Range, size: ExprNode | undefined) {
		super(range);
		this.size = size;
	}
}

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

export abstract class StmtNode extends ASTNode {}

export class BlockStmtNode extends StmtNode {
	readonly labels: readonly LabelDeclNode[];
	readonly declarations: readonly DeclNode[];
	readonly statements: readonly StmtNode[];

	constructor(
		range: Range,
		labels: readonly LabelDeclNode[],
		declarations: readonly DeclNode[],
		statements: readonly StmtNode[],
	) {
		super(range);
		this.labels = labels;
		this.declarations = declarations;
		this.statements = statements;
	}
}

export class AssignStmtNode extends StmtNode {
	readonly target: ExprNode;
	readonly value: ExprNode;

	constructor(range: Range, target: ExprNode, value: ExprNode) {
		super(range);
		this.target = target;
		this.value = value;
	}
}

export class CallStmtNode extends StmtNode {
	readonly expression: CallExprNode;

	constructor(range: Range, expression: CallExprNode) {
		super(range);
		this.expression = expression;
	}
}

export class IfStmtNode extends StmtNode {
	readonly condition: ExprNode;
	readonly thenBranch: StmtNode;
	readonly elseBranch: StmtNode | undefined;

	constructor(
		range: Range,
		condition: ExprNode,
		thenBranch: StmtNode,
		elseBranch: StmtNode | undefined,
	) {
		super(range);
		this.condition = condition;
		this.thenBranch = thenBranch;
		this.elseBranch = elseBranch;
	}
}

export class WhileStmtNode extends StmtNode {
	readonly condition: ExprNode;
	readonly body: StmtNode;

	constructor(range: Range, condition: ExprNode, body: StmtNode) {
		super(range);
		this.condition = condition;
		this.body = body;
	}
}

export class RepeatStmtNode extends StmtNode {
	readonly body: readonly StmtNode[];
	readonly condition: ExprNode;

	constructor(range: Range, body: readonly StmtNode[], condition: ExprNode) {
		super(range);
		this.body = body;
		this.condition = condition;
	}
}

export class ForStmtNode extends StmtNode {
	readonly variable: IdentifierNode;
	readonly initial: ExprNode;
	readonly direction: 'to' | 'downto';
	readonly final: ExprNode;
	readonly body: StmtNode;

	constructor(
		range: Range,
		variable: IdentifierNode,
		initial: ExprNode,
		direction: 'to' | 'downto',
		final: ExprNode,
		body: StmtNode,
	) {
		super(range);
		this.variable = variable;
		this.initial = initial;
		this.direction = direction;
		this.final = final;
		this.body = body;
	}
}

export class CaseStmtNode extends StmtNode {
	readonly selector: ExprNode;
	readonly cases: readonly CaseBranchNode[];

	constructor(range: Range, selector: ExprNode, cases: readonly CaseBranchNode[]) {
		super(range);
		this.selector = selector;
		this.cases = cases;
	}
}

export class CaseBranchNode extends ASTNode {
	readonly labels: readonly ExprNode[];
	readonly statements: readonly StmtNode[];

	constructor(range: Range, labels: readonly ExprNode[], statements: readonly StmtNode[]) {
		super(range);
		this.labels = labels;
		this.statements = statements;
	}
}

export class WithStmtNode extends StmtNode {
	readonly variables: readonly ExprNode[];
	readonly body: StmtNode;

	constructor(range: Range, variables: readonly ExprNode[], body: StmtNode) {
		super(range);
		this.variables = variables;
		this.body = body;
	}
}

export class TryStmtNode extends StmtNode {
	readonly body: readonly StmtNode[];
	readonly exceptHandler: readonly StmtNode[] | undefined;
	readonly finallyHandler: readonly StmtNode[] | undefined;

	constructor(
		range: Range,
		body: readonly StmtNode[],
		exceptHandler: readonly StmtNode[] | undefined,
		finallyHandler: readonly StmtNode[] | undefined,
	) {
		super(range);
		this.body = body;
		this.exceptHandler = exceptHandler;
		this.finallyHandler = finallyHandler;
	}
}

export class GotoStmtNode extends StmtNode {
	readonly label: IdentifierNode;

	constructor(range: Range, label: IdentifierNode) {
		super(range);
		this.label = label;
	}
}

export class ReturnStmtNode extends StmtNode {
	readonly value: ExprNode | undefined;

	constructor(range: Range, value: ExprNode | undefined) {
		super(range);
		this.value = value;
	}
}

export class RaiseStmtNode extends StmtNode {
	readonly exception: ExprNode | undefined;

	constructor(range: Range, exception: ExprNode | undefined) {
		super(range);
		this.exception = exception;
	}
}

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

export abstract class ExprNode extends ASTNode {}

export class IdentifierExprNode extends ExprNode {
	readonly name: IdentifierNode;

	constructor(range: Range, name: IdentifierNode) {
		super(range);
		this.name = name;
	}
}

export class LiteralExprNode extends ExprNode {
	readonly value: string | number | boolean;

	constructor(range: Range, value: string | number | boolean) {
		super(range);
		this.value = value;
	}
}

export class BinaryExprNode extends ExprNode {
	readonly operator: string;
	readonly left: ExprNode;
	readonly right: ExprNode;

	constructor(range: Range, operator: string, left: ExprNode, right: ExprNode) {
		super(range);
		this.operator = operator;
		this.left = left;
		this.right = right;
	}
}

export class UnaryExprNode extends ExprNode {
	readonly operator: string;
	readonly operand: ExprNode;

	constructor(range: Range, operator: string, operand: ExprNode) {
		super(range);
		this.operator = operator;
		this.operand = operand;
	}
}

export class MemberExprNode extends ExprNode {
	readonly object: ExprNode;
	readonly member: IdentifierNode;

	constructor(range: Range, object: ExprNode, member: IdentifierNode) {
		super(range);
		this.object = object;
		this.member = member;
	}
}

export class IndexExprNode extends ExprNode {
	readonly object: ExprNode;
	readonly indices: readonly ExprNode[];

	constructor(range: Range, object: ExprNode, indices: readonly ExprNode[]) {
		super(range);
		this.object = object;
		this.indices = indices;
	}
}

export class CallExprNode extends ExprNode {
	readonly callee: ExprNode;
	readonly typeArguments: readonly TypeNode[];
	readonly callArguments: readonly ExprNode[];

	constructor(
		range: Range,
		callee: ExprNode,
		typeArguments: readonly TypeNode[],
		callArguments: readonly ExprNode[],
	) {
		super(range);
		this.callee = callee;
		this.typeArguments = typeArguments;
		this.callArguments = callArguments;
	}
}

export class InheritedExprNode extends ExprNode {
	readonly member: IdentifierNode | undefined;

	constructor(range: Range, member: IdentifierNode | undefined) {
		super(range);
		this.member = member;
	}
}

export class SelfExprNode extends ExprNode {
	constructor(range: Range) {
		super(range);
	}
}

export class CastExprNode extends ExprNode {
	readonly type: TypeNode;
	readonly expression: ExprNode;

	constructor(range: Range, type: TypeNode, expression: ExprNode) {
		super(range);
		this.type = type;
		this.expression = expression;
	}
}

export class DerefExprNode extends ExprNode {
	readonly expression: ExprNode;

	constructor(range: Range, expression: ExprNode) {
		super(range);
		this.expression = expression;
	}
}

export class ParenExprNode extends ExprNode {
	readonly expression: ExprNode;

	constructor(range: Range, expression: ExprNode) {
		super(range);
		this.expression = expression;
	}
}

// ---------------------------------------------------------------------------
// Visitor Pattern
// ---------------------------------------------------------------------------

/**
 * Visitor tipado: cada nó da AST delega para o método correspondente.
 * Permite analisadores semânticos, pretty-printers e coletores de referências
 * sem poluir as classes de nó com lógica externa.
 */
export interface ASTVisitor<R> {
	visitProgram(node: ProgramNode): R;
	visitUnit(node: UnitNode): R;
	visitUsesClause(node: UsesClauseNode): R;
	visitInterfaceSection(node: InterfaceSectionNode): R;
	visitImplementationSection(node: ImplementationSectionNode): R;

	visitVarDecl(node: VarDeclNode): R;
	visitConstDecl(node: ConstDeclNode): R;
	visitTypeDecl(node: TypeDeclNode): R;
	visitFieldDecl(node: FieldDeclNode): R;
	visitPropertyDecl(node: PropertyDeclNode): R;
	visitSubprogramDecl(node: SubprogramDeclNode): R;
	visitLabelDecl(node: LabelDeclNode): R;

	visitNamedType(node: NamedTypeNode): R;
	visitGenericInstType(node: GenericInstTypeNode): R;
	visitGenericDefType(node: GenericDefTypeNode): R;
	visitClassType(node: ClassTypeNode): R;
	visitRecordType(node: RecordTypeNode): R;
	visitInterfaceType(node: InterfaceTypeNode): R;
	visitArrayType(node: ArrayTypeNode): R;
	visitPointerType(node: PointerTypeNode): R;
	visitSubprogramType(node: SubprogramTypeNode): R;
	visitEnumType(node: EnumTypeNode): R;
	visitSetType(node: SetTypeNode): R;
	visitStringType(node: StringTypeNode): R;

	visitBlockStmt(node: BlockStmtNode): R;
	visitAssignStmt(node: AssignStmtNode): R;
	visitCallStmt(node: CallStmtNode): R;
	visitIfStmt(node: IfStmtNode): R;
	visitWhileStmt(node: WhileStmtNode): R;
	visitRepeatStmt(node: RepeatStmtNode): R;
	visitForStmt(node: ForStmtNode): R;
	visitCaseStmt(node: CaseStmtNode): R;
	visitWithStmt(node: WithStmtNode): R;
	visitTryStmt(node: TryStmtNode): R;
	visitGotoStmt(node: GotoStmtNode): R;
	visitReturnStmt(node: ReturnStmtNode): R;
	visitRaiseStmt(node: RaiseStmtNode): R;

	visitIdentifierExpr(node: IdentifierExprNode): R;
	visitLiteralExpr(node: LiteralExprNode): R;
	visitBinaryExpr(node: BinaryExprNode): R;
	visitUnaryExpr(node: UnaryExprNode): R;
	visitMemberExpr(node: MemberExprNode): R;
	visitIndexExpr(node: IndexExprNode): R;
	visitCallExpr(node: CallExprNode): R;
	visitInheritedExpr(node: InheritedExprNode): R;
	visitSelfExpr(node: SelfExprNode): R;
	visitCastExpr(node: CastExprNode): R;
	visitDerefExpr(node: DerefExprNode): R;
	visitParenExpr(node: ParenExprNode): R;
}

/** Visitor que produz efeito colateral (sem valor de retorno). */
export type ASTVisitorVoid = ASTVisitor<void>;

/** Dispatch duplo: cada nó sabe qual método do visitor invocar. */
export function acceptNode<R>(node: ASTNode, visitor: ASTVisitor<R>): R {
	if (node instanceof ProgramNode) {
		return visitor.visitProgram(node);
	}
	if (node instanceof UnitNode) {
		return visitor.visitUnit(node);
	}
	if (node instanceof UsesClauseNode) {
		return visitor.visitUsesClause(node);
	}
	if (node instanceof InterfaceSectionNode) {
		return visitor.visitInterfaceSection(node);
	}
	if (node instanceof ImplementationSectionNode) {
		return visitor.visitImplementationSection(node);
	}
	if (node instanceof VarDeclNode) {
		return visitor.visitVarDecl(node);
	}
	if (node instanceof ConstDeclNode) {
		return visitor.visitConstDecl(node);
	}
	if (node instanceof TypeDeclNode) {
		return visitor.visitTypeDecl(node);
	}
	if (node instanceof FieldDeclNode) {
		return visitor.visitFieldDecl(node);
	}
	if (node instanceof PropertyDeclNode) {
		return visitor.visitPropertyDecl(node);
	}
	if (node instanceof SubprogramDeclNode) {
		return visitor.visitSubprogramDecl(node);
	}
	if (node instanceof LabelDeclNode) {
		return visitor.visitLabelDecl(node);
	}
	if (node instanceof NamedTypeNode) {
		return visitor.visitNamedType(node);
	}
	if (node instanceof GenericInstTypeNode) {
		return visitor.visitGenericInstType(node);
	}
	if (node instanceof GenericDefTypeNode) {
		return visitor.visitGenericDefType(node);
	}
	if (node instanceof ClassTypeNode) {
		return visitor.visitClassType(node);
	}
	if (node instanceof RecordTypeNode) {
		return visitor.visitRecordType(node);
	}
	if (node instanceof InterfaceTypeNode) {
		return visitor.visitInterfaceType(node);
	}
	if (node instanceof ArrayTypeNode) {
		return visitor.visitArrayType(node);
	}
	if (node instanceof PointerTypeNode) {
		return visitor.visitPointerType(node);
	}
	if (node instanceof SubprogramTypeNode) {
		return visitor.visitSubprogramType(node);
	}
	if (node instanceof EnumTypeNode) {
		return visitor.visitEnumType(node);
	}
	if (node instanceof SetTypeNode) {
		return visitor.visitSetType(node);
	}
	if (node instanceof StringTypeNode) {
		return visitor.visitStringType(node);
	}
	if (node instanceof BlockStmtNode) {
		return visitor.visitBlockStmt(node);
	}
	if (node instanceof AssignStmtNode) {
		return visitor.visitAssignStmt(node);
	}
	if (node instanceof CallStmtNode) {
		return visitor.visitCallStmt(node);
	}
	if (node instanceof IfStmtNode) {
		return visitor.visitIfStmt(node);
	}
	if (node instanceof WhileStmtNode) {
		return visitor.visitWhileStmt(node);
	}
	if (node instanceof RepeatStmtNode) {
		return visitor.visitRepeatStmt(node);
	}
	if (node instanceof ForStmtNode) {
		return visitor.visitForStmt(node);
	}
	if (node instanceof CaseStmtNode) {
		return visitor.visitCaseStmt(node);
	}
	if (node instanceof WithStmtNode) {
		return visitor.visitWithStmt(node);
	}
	if (node instanceof TryStmtNode) {
		return visitor.visitTryStmt(node);
	}
	if (node instanceof GotoStmtNode) {
		return visitor.visitGotoStmt(node);
	}
	if (node instanceof ReturnStmtNode) {
		return visitor.visitReturnStmt(node);
	}
	if (node instanceof RaiseStmtNode) {
		return visitor.visitRaiseStmt(node);
	}
	if (node instanceof IdentifierExprNode) {
		return visitor.visitIdentifierExpr(node);
	}
	if (node instanceof LiteralExprNode) {
		return visitor.visitLiteralExpr(node);
	}
	if (node instanceof BinaryExprNode) {
		return visitor.visitBinaryExpr(node);
	}
	if (node instanceof UnaryExprNode) {
		return visitor.visitUnaryExpr(node);
	}
	if (node instanceof MemberExprNode) {
		return visitor.visitMemberExpr(node);
	}
	if (node instanceof IndexExprNode) {
		return visitor.visitIndexExpr(node);
	}
	if (node instanceof CallExprNode) {
		return visitor.visitCallExpr(node);
	}
	if (node instanceof InheritedExprNode) {
		return visitor.visitInheritedExpr(node);
	}
	if (node instanceof SelfExprNode) {
		return visitor.visitSelfExpr(node);
	}
	if (node instanceof CastExprNode) {
		return visitor.visitCastExpr(node);
	}
	if (node instanceof DerefExprNode) {
		return visitor.visitDerefExpr(node);
	}
	if (node instanceof ParenExprNode) {
		return visitor.visitParenExpr(node);
	}
	throw new Error(`Unknown AST node: ${node.constructor.name}`);
}

export function acceptTypeNode<R>(node: TypeNode, visitor: ASTVisitor<R>): R {
	return acceptNode(node, visitor);
}

export function acceptStmtNode<R>(node: StmtNode, visitor: ASTVisitor<R>): R {
	return acceptNode(node, visitor);
}

export function acceptExprNode<R>(node: ExprNode, visitor: ASTVisitor<R>): R {
	return acceptNode(node, visitor);
}

export function acceptDeclNode<R>(node: DeclNode, visitor: ASTVisitor<R>): R {
	return acceptNode(node, visitor);
}
