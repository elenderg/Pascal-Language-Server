import { SourceRange } from './source-range';
import type { ASTVisitor } from './visitor';

/** Nó base da AST. Mantém range, ligações pai/filho e dispatch de visitor. */
export abstract class ASTNode {
	readonly range: SourceRange;
	parent: ASTNode | undefined = undefined;
	private readonly _children: ASTNode[] = [];

	constructor(range: SourceRange) {
		this.range = range;
	}

	get children(): readonly ASTNode[] {
		return this._children;
	}

	abstract accept<R>(visitor: ASTVisitor<R>): R;

	protected adopt(child: ASTNode | undefined): void {
		if (child === undefined) {
			return;
		}
		if (child.parent !== undefined) {
			child.parent._detach(child);
		}
		child.parent = this;
		this._children.push(child);
	}

	protected adoptAll(...nodes: unknown[]): void {
		for (const node of nodes) {
			if (node === undefined || node === null) {
				continue;
			}
			if (Array.isArray(node)) {
				for (const item of node) {
					this.adopt(item as ASTNode);
				}
			} else {
				this.adopt(node as ASTNode);
			}
		}
	}

	private _detach(child: ASTNode): void {
		const index = this._children.indexOf(child);
		if (index >= 0) {
			this._children.splice(index, 1);
		}
	}
}

export abstract class DeclarationNode extends ASTNode {}

export abstract class StatementNode extends ASTNode {}

export abstract class ExpressionNode extends ASTNode {}

export abstract class TypeNode extends ASTNode {}
