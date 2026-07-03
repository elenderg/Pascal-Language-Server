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
		this.visitNodeChildren(node);
	}
	visitUnit(node: UnitNode): void {
		this.visitNodeChildren(node);
	}
	visitUnitSection(node: UnitSectionNode): void {
		this.visitNodeChildren(node);
	}
	visitUsesClause(node: UsesClauseNode): void {
		this.visitNodeChildren(node);
	}
	visitTypeSection(node: TypeSectionNode): void {
		this.visitNodeChildren(node);
	}
	visitConstSection(node: ConstSectionNode): void {
		this.visitNodeChildren(node);
	}
	visitVarSection(node: VarSectionNode): void {
		this.visitNodeChildren(node);
	}
	visitBlock(node: BlockNode): void {
		this.visitNodeChildren(node);
	}
	visitProcedureDeclaration(node: ProcedureDeclarationNode): void {
		this.visitNodeChildren(node);
	}
	visitFunctionDeclaration(node: FunctionDeclarationNode): void {
		this.visitNodeChildren(node);
	}
	visitMethodDeclaration(node: MethodDeclarationNode): void {
		this.visitNodeChildren(node);
	}
	visitClassDeclaration(node: ClassDeclarationNode): void {
		this.visitNodeChildren(node);
	}
	visitRecordDeclaration(node: RecordDeclarationNode): void {
		this.visitNodeChildren(node);
	}
	visitInterfaceDeclaration(node: InterfaceDeclarationNode): void {
		this.visitNodeChildren(node);
	}
	visitVariableDeclaration(node: VariableDeclarationNode): void {
		this.visitNodeChildren(node);
	}
	visitParameterDeclaration(node: ParameterDeclarationNode): void {
		this.visitNodeChildren(node);
	}
	visitConstantDeclaration(node: ConstantDeclarationNode): void {
		this.visitNodeChildren(node);
	}
	visitTypeAliasDeclaration(node: TypeAliasDeclarationNode): void {
		this.visitNodeChildren(node);
	}
	visitEnumTypeDeclaration(node: EnumTypeDeclarationNode): void {
		this.visitNodeChildren(node);
	}
	visitPropertyDeclaration(node: PropertyDeclarationNode): void {
		this.visitNodeChildren(node);
	}
	visitLabelDeclaration(node: LabelDeclarationNode): void {
		this.visitNodeChildren(node);
	}
	visitIdentifier(_node: IdentifierNode): void {
		this.defaultResult();
	}
	visitNamedType(node: NamedTypeNode): void {
		this.visitNodeChildren(node);
	}
	visitGenericInstType(node: GenericInstTypeNode): void {
		this.visitNodeChildren(node);
	}
	visitClassType(node: ClassTypeNode): void {
		this.visitNodeChildren(node);
	}
	visitRecordType(node: RecordTypeNode): void {
		this.visitNodeChildren(node);
	}
	visitInterfaceType(node: InterfaceTypeNode): void {
		this.visitNodeChildren(node);
	}
	visitArrayType(node: ArrayTypeNode): void {
		this.visitNodeChildren(node);
	}
	visitPointerType(node: PointerTypeNode): void {
		this.visitNodeChildren(node);
	}
	visitSubprogramType(node: SubprogramTypeNode): void {
		this.visitNodeChildren(node);
	}
	visitFormalParameterType(node: FormalParameterTypeNode): void {
		this.visitNodeChildren(node);
	}
	visitEnumType(node: EnumTypeNode): void {
		this.visitNodeChildren(node);
	}
	visitSetType(node: SetTypeNode): void {
		this.visitNodeChildren(node);
	}
	visitStringType(node: StringTypeNode): void {
		this.visitNodeChildren(node);
	}
	visitRecordVariant(node: RecordVariantNode): void {
		this.visitNodeChildren(node);
	}
	visitRecordVariantCase(node: RecordVariantCaseNode): void {
		this.visitNodeChildren(node);
	}
	visitAssignStatement(node: AssignStatementNode): void {
		this.visitNodeChildren(node);
	}
	visitCallStatement(node: CallStatementNode): void {
		this.visitNodeChildren(node);
	}
	visitIfStatement(node: IfStatementNode): void {
		this.visitNodeChildren(node);
	}
	visitWhileStatement(node: WhileStatementNode): void {
		this.visitNodeChildren(node);
	}
	visitRepeatStatement(node: RepeatStatementNode): void {
		this.visitNodeChildren(node);
	}
	visitForStatement(node: ForStatementNode): void {
		this.visitNodeChildren(node);
	}
	visitCaseStatement(node: CaseStatementNode): void {
		this.visitNodeChildren(node);
	}
	visitCaseBranch(node: CaseBranchNode): void {
		this.visitNodeChildren(node);
	}
	visitWithStatement(node: WithStatementNode): void {
		this.visitNodeChildren(node);
	}
	visitTryStatement(node: TryStatementNode): void {
		this.visitNodeChildren(node);
	}
	visitGotoStatement(node: GotoStatementNode): void {
		this.visitNodeChildren(node);
	}
	visitReturnStatement(node: ReturnStatementNode): void {
		this.visitNodeChildren(node);
	}
	visitRaiseStatement(node: RaiseStatementNode): void {
		this.visitNodeChildren(node);
	}
	visitEmptyStatement(_node: EmptyStatementNode): void {
		this.defaultResult();
	}
	visitIdentifierExpression(node: IdentifierExpressionNode): void {
		this.visitNodeChildren(node);
	}
	visitLiteralExpression(_node: LiteralExpressionNode): void {
		this.defaultResult();
	}
	visitBinaryExpression(node: BinaryExpressionNode): void {
		this.visitNodeChildren(node);
	}
	visitUnaryExpression(node: UnaryExpressionNode): void {
		this.visitNodeChildren(node);
	}
	visitMemberExpression(node: MemberExpressionNode): void {
		this.visitNodeChildren(node);
	}
	visitIndexExpression(node: IndexExpressionNode): void {
		this.visitNodeChildren(node);
	}
	visitCallExpression(node: CallExpressionNode): void {
		this.visitNodeChildren(node);
	}
	visitInheritedExpression(node: InheritedExpressionNode): void {
		this.visitNodeChildren(node);
	}
	visitSelfExpression(_node: SelfExpressionNode): void {
		this.defaultResult();
	}
	visitCastExpression(node: CastExpressionNode): void {
		this.visitNodeChildren(node);
	}
	visitDerefExpression(node: DerefExpressionNode): void {
		this.visitNodeChildren(node);
	}
	visitParenExpression(node: ParenExpressionNode): void {
		this.visitNodeChildren(node);
	}

	protected visitNodeChildren(node: ASTNode): void {
		visitChildren(node, this);
	}
}
