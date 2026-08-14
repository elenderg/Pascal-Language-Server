import type { ASTNode } from './node-base';
import type {
	ProgramNode,
	UnitNode,
	UnitSectionNode,
	UsesClauseNode,
	TypeSectionNode,
	ConstSectionNode,
	VarSectionNode,
	BlockNode,
} from './sections';
import type {
	ProcedureDeclarationNode,
	FunctionDeclarationNode,
	MethodDeclarationNode,
	ClassDeclarationNode,
	RecordDeclarationNode,
	InterfaceDeclarationNode,
	VariableDeclarationNode,
	ParameterDeclarationNode,
	ConstantDeclarationNode,
	TypeAliasDeclarationNode,
	EnumTypeDeclarationNode,
	PropertyDeclarationNode,
	LabelDeclarationNode,
} from './declarations';
import type {
	IdentifierNode,
	NamedTypeNode,
	GenericInstTypeNode,
	ClassTypeNode,
	RecordTypeNode,
	InterfaceTypeNode,
	ArrayTypeNode,
	PointerTypeNode,
	SubprogramTypeNode,
	FormalParameterTypeNode,
	EnumTypeNode,
	SetTypeNode,
	StringTypeNode,
	RecordVariantNode,
	RecordVariantCaseNode,
} from './type-nodes';
import type {
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
} from './statements';
import type {
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
} from './expressions';

export interface ASTVisitor<R> {
	visitProgram(node: ProgramNode): R;
	visitUnit(node: UnitNode): R;
	visitUnitSection(node: UnitSectionNode): R;
	visitUsesClause(node: UsesClauseNode): R;
	visitTypeSection(node: TypeSectionNode): R;
	visitConstSection(node: ConstSectionNode): R;
	visitVarSection(node: VarSectionNode): R;
	visitBlock(node: BlockNode): R;

	visitProcedureDeclaration(node: ProcedureDeclarationNode): R;
	visitFunctionDeclaration(node: FunctionDeclarationNode): R;
	visitMethodDeclaration(node: MethodDeclarationNode): R;
	visitClassDeclaration(node: ClassDeclarationNode): R;
	visitRecordDeclaration(node: RecordDeclarationNode): R;
	visitInterfaceDeclaration(node: InterfaceDeclarationNode): R;
	visitVariableDeclaration(node: VariableDeclarationNode): R;
	visitParameterDeclaration(node: ParameterDeclarationNode): R;
	visitConstantDeclaration(node: ConstantDeclarationNode): R;
	visitTypeAliasDeclaration(node: TypeAliasDeclarationNode): R;
	visitEnumTypeDeclaration(node: EnumTypeDeclarationNode): R;
	visitPropertyDeclaration(node: PropertyDeclarationNode): R;
	visitLabelDeclaration(node: LabelDeclarationNode): R;

	visitIdentifier(node: IdentifierNode): R;
	visitNamedType(node: NamedTypeNode): R;
	visitGenericInstType(node: GenericInstTypeNode): R;
	visitClassType(node: ClassTypeNode): R;
	visitRecordType(node: RecordTypeNode): R;
	visitInterfaceType(node: InterfaceTypeNode): R;
	visitArrayType(node: ArrayTypeNode): R;
	visitPointerType(node: PointerTypeNode): R;
	visitSubprogramType(node: SubprogramTypeNode): R;
	visitFormalParameterType(node: FormalParameterTypeNode): R;
	visitEnumType(node: EnumTypeNode): R;
	visitSetType(node: SetTypeNode): R;
	visitStringType(node: StringTypeNode): R;
	visitRecordVariant(node: RecordVariantNode): R;
	visitRecordVariantCase(node: RecordVariantCaseNode): R;

	visitAssignStatement(node: AssignStatementNode): R;
	visitCallStatement(node: CallStatementNode): R;
	visitIfStatement(node: IfStatementNode): R;
	visitWhileStatement(node: WhileStatementNode): R;
	visitRepeatStatement(node: RepeatStatementNode): R;
	visitForStatement(node: ForStatementNode): R;
	visitCaseStatement(node: CaseStatementNode): R;
	visitCaseBranch(node: CaseBranchNode): R;
	visitWithStatement(node: WithStatementNode): R;
	visitTryStatement(node: TryStatementNode): R;
	visitGotoStatement(node: GotoStatementNode): R;
	visitReturnStatement(node: ReturnStatementNode): R;
	visitRaiseStatement(node: RaiseStatementNode): R;
	visitEmptyStatement(node: EmptyStatementNode): R;

	visitIdentifierExpression(node: IdentifierExpressionNode): R;
	visitLiteralExpression(node: LiteralExpressionNode): R;
	visitBinaryExpression(node: BinaryExpressionNode): R;
	visitUnaryExpression(node: UnaryExpressionNode): R;
	visitMemberExpression(node: MemberExpressionNode): R;
	visitIndexExpression(node: IndexExpressionNode): R;
	visitCallExpression(node: CallExpressionNode): R;
	visitInheritedExpression(node: InheritedExpressionNode): R;
	visitSelfExpression(node: SelfExpressionNode): R;
	visitCastExpression(node: CastExpressionNode): R;
	visitDerefExpression(node: DerefExpressionNode): R;
	visitParenExpression(node: ParenExpressionNode): R;
}

export type ASTVisitorVoid = ASTVisitor<void>;

/** Percorre recursivamente todos os filhos via visitor. */
export function visitChildren(node: ASTNode, visitor: ASTVisitorVoid): void {
	for (const child of node.children) {
		child.accept(visitor);
	}
}

/** Visitor base que percorre todos os filhos sem lógica própria. */
export abstract class RecursiveASTVisitor implements ASTVisitorVoid {
	protected abstract defaultResult(): void;

	visitProgram(node: ProgramNode): void {
		this.visitNode(node);
	}
	visitUnit(node: UnitNode): void {
		this.visitNode(node);
	}
	visitUnitSection(node: UnitSectionNode): void {
		this.visitNode(node);
	}
	visitUsesClause(node: UsesClauseNode): void {
		this.visitNode(node);
	}
	visitTypeSection(node: TypeSectionNode): void {
		this.visitNode(node);
	}
	visitConstSection(node: ConstSectionNode): void {
		this.visitNode(node);
	}
	visitVarSection(node: VarSectionNode): void {
		this.visitNode(node);
	}
	visitBlock(node: BlockNode): void {
		this.visitNode(node);
	}
	visitProcedureDeclaration(node: ProcedureDeclarationNode): void {
		this.visitNode(node);
	}
	visitFunctionDeclaration(node: FunctionDeclarationNode): void {
		this.visitNode(node);
	}
	visitMethodDeclaration(node: MethodDeclarationNode): void {
		this.visitNode(node);
	}
	visitClassDeclaration(node: ClassDeclarationNode): void {
		this.visitNode(node);
	}
	visitRecordDeclaration(node: RecordDeclarationNode): void {
		this.visitNode(node);
	}
	visitInterfaceDeclaration(node: InterfaceDeclarationNode): void {
		this.visitNode(node);
	}
	visitVariableDeclaration(node: VariableDeclarationNode): void {
		this.visitNode(node);
	}
	visitParameterDeclaration(node: ParameterDeclarationNode): void {
		this.visitNode(node);
	}
	visitConstantDeclaration(node: ConstantDeclarationNode): void {
		this.visitNode(node);
	}
	visitTypeAliasDeclaration(node: TypeAliasDeclarationNode): void {
		this.visitNode(node);
	}
	visitEnumTypeDeclaration(node: EnumTypeDeclarationNode): void {
		this.visitNode(node);
	}
	visitPropertyDeclaration(node: PropertyDeclarationNode): void {
		this.visitNode(node);
	}
	visitLabelDeclaration(node: LabelDeclarationNode): void {
		this.visitNode(node);
	}
	visitIdentifier(node: IdentifierNode): void {
		this.visitNode(node);
	}
	visitNamedType(node: NamedTypeNode): void {
		this.visitNode(node);
	}
	visitGenericInstType(node: GenericInstTypeNode): void {
		this.visitNode(node);
	}
	visitClassType(node: ClassTypeNode): void {
		this.visitNode(node);
	}
	visitRecordType(node: RecordTypeNode): void {
		this.visitNode(node);
	}
	visitInterfaceType(node: InterfaceTypeNode): void {
		this.visitNode(node);
	}
	visitArrayType(node: ArrayTypeNode): void {
		this.visitNode(node);
	}
	visitPointerType(node: PointerTypeNode): void {
		this.visitNode(node);
	}
	visitSubprogramType(node: SubprogramTypeNode): void {
		this.visitNode(node);
	}
	visitFormalParameterType(node: FormalParameterTypeNode): void {
		this.visitNode(node);
	}
	visitEnumType(node: EnumTypeNode): void {
		this.visitNode(node);
	}
	visitSetType(node: SetTypeNode): void {
		this.visitNode(node);
	}
	visitStringType(node: StringTypeNode): void {
		this.visitNode(node);
	}
	visitRecordVariant(node: RecordVariantNode): void {
		this.visitNode(node);
	}
	visitRecordVariantCase(node: RecordVariantCaseNode): void {
		this.visitNode(node);
	}
	visitAssignStatement(node: AssignStatementNode): void {
		this.visitNode(node);
	}
	visitCallStatement(node: CallStatementNode): void {
		this.visitNode(node);
	}
	visitIfStatement(node: IfStatementNode): void {
		this.visitNode(node);
	}
	visitWhileStatement(node: WhileStatementNode): void {
		this.visitNode(node);
	}
	visitRepeatStatement(node: RepeatStatementNode): void {
		this.visitNode(node);
	}
	visitForStatement(node: ForStatementNode): void {
		this.visitNode(node);
	}
	visitCaseStatement(node: CaseStatementNode): void {
		this.visitNode(node);
	}
	visitCaseBranch(node: CaseBranchNode): void {
		this.visitNode(node);
	}
	visitWithStatement(node: WithStatementNode): void {
		this.visitNode(node);
	}
	visitTryStatement(node: TryStatementNode): void {
		this.visitNode(node);
	}
	visitGotoStatement(node: GotoStatementNode): void {
		this.visitNode(node);
	}
	visitReturnStatement(node: ReturnStatementNode): void {
		this.visitNode(node);
	}
	visitRaiseStatement(node: RaiseStatementNode): void {
		this.visitNode(node);
	}
	visitEmptyStatement(node: EmptyStatementNode): void {
		this.visitNode(node);
	}
	visitIdentifierExpression(node: IdentifierExpressionNode): void {
		this.visitNode(node);
	}
	visitLiteralExpression(node: LiteralExpressionNode): void {
		this.visitNode(node);
	}
	visitBinaryExpression(node: BinaryExpressionNode): void {
		this.visitNode(node);
	}
	visitUnaryExpression(node: UnaryExpressionNode): void {
		this.visitNode(node);
	}
	visitMemberExpression(node: MemberExpressionNode): void {
		this.visitNode(node);
	}
	visitIndexExpression(node: IndexExpressionNode): void {
		this.visitNode(node);
	}
	visitCallExpression(node: CallExpressionNode): void {
		this.visitNode(node);
	}
	visitInheritedExpression(node: InheritedExpressionNode): void {
		this.visitNode(node);
	}
	visitSelfExpression(node: SelfExpressionNode): void {
		this.visitNode(node);
	}
	visitCastExpression(node: CastExpressionNode): void {
		this.visitNode(node);
	}
	visitDerefExpression(node: DerefExpressionNode): void {
		this.visitNode(node);
	}
	visitParenExpression(node: ParenExpressionNode): void {
		this.visitNode(node);
	}

	protected visitNode(node: ASTNode): void {
		this.visitNodeChildren(node);
	}

	protected visitNodeChildren(node: ASTNode): void {
		visitChildren(node, this);
	}
}
