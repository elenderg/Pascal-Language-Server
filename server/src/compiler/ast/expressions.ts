import { ASTNodeKind } from './kinds';
import { ExpressionNode } from './node-base';
import type { SourceRange } from './source-range';
import type { ASTVisitor } from './visitor';
import type { IdentifierNode } from './type-nodes';
import type { TypeNode } from './node-base';

export class IdentifierExpressionNode extends ExpressionNode {
	readonly kind = ASTNodeKind.IdentifierExpression;
	readonly name: IdentifierNode;

	constructor(range: SourceRange, name: IdentifierNode) {
		super(range);
		this.name = name;
		this.adopt(name);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitIdentifierExpression(this);
	}
}

export class LiteralExpressionNode extends ExpressionNode {
	readonly kind = ASTNodeKind.LiteralExpression;
	readonly value: string | number | boolean;

	constructor(range: SourceRange, value: string | number | boolean) {
		super(range);
		this.value = value;
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitLiteralExpression(this);
	}
}

export class BinaryExpressionNode extends ExpressionNode {
	readonly kind = ASTNodeKind.BinaryExpression;
	readonly operator: string;
	readonly left: ExpressionNode;
	readonly right: ExpressionNode;

	constructor(range: SourceRange, operator: string, left: ExpressionNode, right: ExpressionNode) {
		super(range);
		this.operator = operator;
		this.left = left;
		this.right = right;
		this.adoptAll(left, right);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitBinaryExpression(this);
	}
}

export class UnaryExpressionNode extends ExpressionNode {
	readonly kind = ASTNodeKind.UnaryExpression;
	readonly operator: string;
	readonly operand: ExpressionNode;

	constructor(range: SourceRange, operator: string, operand: ExpressionNode) {
		super(range);
		this.operator = operator;
		this.operand = operand;
		this.adopt(operand);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitUnaryExpression(this);
	}
}

export class MemberExpressionNode extends ExpressionNode {
	readonly kind = ASTNodeKind.MemberExpression;
	readonly object: ExpressionNode;
	readonly member: IdentifierNode;

	constructor(range: SourceRange, object: ExpressionNode, member: IdentifierNode) {
		super(range);
		this.object = object;
		this.member = member;
		this.adoptAll(object, member);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitMemberExpression(this);
	}
}

export class IndexExpressionNode extends ExpressionNode {
	readonly kind = ASTNodeKind.IndexExpression;
	readonly object: ExpressionNode;
	readonly indices: readonly ExpressionNode[];

	constructor(range: SourceRange, object: ExpressionNode, indices: readonly ExpressionNode[]) {
		super(range);
		this.object = object;
		this.indices = indices;
		this.adoptAll(object, indices);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitIndexExpression(this);
	}
}

export class CallExpressionNode extends ExpressionNode {
	readonly kind = ASTNodeKind.CallExpression;
	readonly callee: ExpressionNode;
	readonly typeArguments: readonly TypeNode[];
	readonly callArguments: readonly ExpressionNode[];

	constructor(
		range: SourceRange,
		callee: ExpressionNode,
		typeArguments: readonly TypeNode[],
		callArguments: readonly ExpressionNode[],
	) {
		super(range);
		this.callee = callee;
		this.typeArguments = typeArguments;
		this.callArguments = callArguments;
		this.adoptAll(callee, typeArguments, callArguments);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitCallExpression(this);
	}
}

export class InheritedExpressionNode extends ExpressionNode {
	readonly kind = ASTNodeKind.InheritedExpression;
	readonly member: IdentifierNode | undefined;

	constructor(range: SourceRange, member: IdentifierNode | undefined) {
		super(range);
		this.member = member;
		this.adopt(member);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitInheritedExpression(this);
	}
}

export class SelfExpressionNode extends ExpressionNode {
	readonly kind = ASTNodeKind.SelfExpression;

	constructor(range: SourceRange) {
		super(range);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitSelfExpression(this);
	}
}

export class CastExpressionNode extends ExpressionNode {
	readonly kind = ASTNodeKind.CastExpression;
	readonly castType: TypeNode;
	readonly expression: ExpressionNode;

	constructor(range: SourceRange, castType: TypeNode, expression: ExpressionNode) {
		super(range);
		this.castType = castType;
		this.expression = expression;
		this.adoptAll(castType, expression);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitCastExpression(this);
	}
}

export class DerefExpressionNode extends ExpressionNode {
	readonly kind = ASTNodeKind.DerefExpression;
	readonly expression: ExpressionNode;

	constructor(range: SourceRange, expression: ExpressionNode) {
		super(range);
		this.expression = expression;
		this.adopt(expression);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitDerefExpression(this);
	}
}

export class ParenExpressionNode extends ExpressionNode {
	readonly kind = ASTNodeKind.ParenExpression;
	readonly expression: ExpressionNode;

	constructor(range: SourceRange, expression: ExpressionNode) {
		super(range);
		this.expression = expression;
		this.adopt(expression);
	}

	accept<R>(visitor: ASTVisitor<R>): R {
		return visitor.visitParenExpression(this);
	}
}
