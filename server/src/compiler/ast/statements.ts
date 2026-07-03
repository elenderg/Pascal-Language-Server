import { ASTNodeKind } from './kinds';
import { ExpressionNode, StatementNode } from './node-base';
import type { SourceRange } from './source-range';
import type { ASTVisitor } from './visitor';
import type { IdentifierNode } from './type-nodes';
import type { CallExpressionNode } from './expressions';

export class AssignStatementNode extends StatementNode {
	readonly kind = ASTNodeKind.AssignStatement;
	readonly target: ExpressionNode;
	readonly value: ExpressionNode;

	constructor(range: SourceRange, target: ExpressionNode, value: ExpressionNode) {
		super(range);
		this.target = target;
		this.value = value;
		this.adoptAll(target, value);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitAssignStatement(this);
	}
}

export class CallStatementNode extends StatementNode {
	readonly kind = ASTNodeKind.CallStatement;
	readonly expression: CallExpressionNode;

	constructor(range: SourceRange, expression: CallExpressionNode) {
		super(range);
		this.expression = expression;
		this.adopt(expression);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitCallStatement(this);
	}
}

export class IfStatementNode extends StatementNode {
	readonly kind = ASTNodeKind.IfStatement;
	readonly condition: ExpressionNode;
	readonly thenBranch: StatementNode;
	readonly elseBranch: StatementNode | undefined;

	constructor(
		range: SourceRange,
		condition: ExpressionNode,
		thenBranch: StatementNode,
		elseBranch: StatementNode | undefined,
	) {
		super(range);
		this.condition = condition;
		this.thenBranch = thenBranch;
		this.elseBranch = elseBranch;
		this.adoptAll(condition, thenBranch, elseBranch);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitIfStatement(this);
	}
}

export class WhileStatementNode extends StatementNode {
	readonly kind = ASTNodeKind.WhileStatement;
	readonly condition: ExpressionNode;
	readonly body: StatementNode;

	constructor(range: SourceRange, condition: ExpressionNode, body: StatementNode) {
		super(range);
		this.condition = condition;
		this.body = body;
		this.adoptAll(condition, body);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitWhileStatement(this);
	}
}

export class RepeatStatementNode extends StatementNode {
	readonly kind = ASTNodeKind.RepeatStatement;
	readonly body: readonly StatementNode[];
	readonly condition: ExpressionNode;

	constructor(range: SourceRange, body: readonly StatementNode[], condition: ExpressionNode) {
		super(range);
		this.body = body;
		this.condition = condition;
		this.adoptAll(body, condition);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitRepeatStatement(this);
	}
}

export class ForStatementNode extends StatementNode {
	readonly kind = ASTNodeKind.ForStatement;
	readonly variable: IdentifierNode;
	readonly initial: ExpressionNode;
	readonly direction: 'to' | 'downto';
	readonly final: ExpressionNode;
	readonly body: StatementNode;

	constructor(
		range: SourceRange,
		variable: IdentifierNode,
		initial: ExpressionNode,
		direction: 'to' | 'downto',
		final: ExpressionNode,
		body: StatementNode,
	) {
		super(range);
		this.variable = variable;
		this.initial = initial;
		this.direction = direction;
		this.final = final;
		this.body = body;
		this.adoptAll(variable, initial, final, body);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitForStatement(this);
	}
}

export class CaseBranchNode extends StatementNode {
	readonly kind = ASTNodeKind.CaseBranch;
	readonly labels: readonly ExpressionNode[];
	readonly statements: readonly StatementNode[];

	constructor(range: SourceRange, labels: readonly ExpressionNode[], statements: readonly StatementNode[]) {
		super(range);
		this.labels = labels;
		this.statements = statements;
		this.adoptAll(labels, statements);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitCaseBranch(this);
	}
}

export class CaseStatementNode extends StatementNode {
	readonly kind = ASTNodeKind.CaseStatement;
	readonly selector: ExpressionNode;
	readonly cases: readonly CaseBranchNode[];

	constructor(range: SourceRange, selector: ExpressionNode, cases: readonly CaseBranchNode[]) {
		super(range);
		this.selector = selector;
		this.cases = cases;
		this.adoptAll(selector, cases);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitCaseStatement(this);
	}
}

export class WithStatementNode extends StatementNode {
	readonly kind = ASTNodeKind.WithStatement;
	readonly variables: readonly ExpressionNode[];
	readonly body: StatementNode;

	constructor(range: SourceRange, variables: readonly ExpressionNode[], body: StatementNode) {
		super(range);
		this.variables = variables;
		this.body = body;
		this.adoptAll(variables, body);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitWithStatement(this);
	}
}

export class TryStatementNode extends StatementNode {
	readonly kind = ASTNodeKind.TryStatement;
	readonly body: readonly StatementNode[];
	readonly exceptHandler: readonly StatementNode[] | undefined;
	readonly finallyHandler: readonly StatementNode[] | undefined;

	constructor(
		range: SourceRange,
		body: readonly StatementNode[],
		exceptHandler: readonly StatementNode[] | undefined,
		finallyHandler: readonly StatementNode[] | undefined,
	) {
		super(range);
		this.body = body;
		this.exceptHandler = exceptHandler;
		this.finallyHandler = finallyHandler;
		this.adoptAll(body, exceptHandler, finallyHandler);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitTryStatement(this);
	}
}

export class GotoStatementNode extends StatementNode {
	readonly kind = ASTNodeKind.GotoStatement;
	readonly label: IdentifierNode;

	constructor(range: SourceRange, label: IdentifierNode) {
		super(range);
		this.label = label;
		this.adopt(label);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitGotoStatement(this);
	}
}

export class ReturnStatementNode extends StatementNode {
	readonly kind = ASTNodeKind.ReturnStatement;
	readonly value: ExpressionNode | undefined;

	constructor(range: SourceRange, value: ExpressionNode | undefined) {
		super(range);
		this.value = value;
		this.adopt(value);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitReturnStatement(this);
	}
}

export class RaiseStatementNode extends StatementNode {
	readonly kind = ASTNodeKind.RaiseStatement;
	readonly exception: ExpressionNode | undefined;

	constructor(range: SourceRange, exception: ExpressionNode | undefined) {
		super(range);
		this.exception = exception;
		this.adopt(exception);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitRaiseStatement(this);
	}
}

export class EmptyStatementNode extends StatementNode {
	readonly kind = ASTNodeKind.EmptyStatement;

	constructor(range: SourceRange) {
		super(range);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitEmptyStatement(this);
	}
}
