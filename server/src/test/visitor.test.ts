import test from 'node:test';
import assert from 'node:assert/strict';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentKind, PascalDocument } from '../compiler/models';
import { parsePascalDocument } from '../compiler/old_parser';
import { RecursiveASTVisitor, type ASTNode } from '../compiler/ast/index';

test('RecursiveASTVisitor exposes a central visitNode hook for custom visitors', () => {
	const source = 'program Test;\nvar x: Integer;\nbegin\n  x := 1;\nend.';
	const document = new PascalDocument('file:///test-node.pas', source, 1);
	const ast = parsePascalDocument(TextDocument.create(document.uri, 'pascal', document.version, document.text));
	document.setParsed(ast, DocumentKind.Program);

	const visited: string[] = [];

	class NodeTrackingVisitor extends RecursiveASTVisitor {
		protected defaultResult(): void {
			// no-op
		}

		protected override visitNode(node: ASTNode): void {
			visited.push(node.constructor.name);
			super.visitNode(node);
		}
	}

	ast.accept(new NodeTrackingVisitor());

	assert.ok(visited.includes('ProgramNode'));
	assert.ok(visited.includes('BlockNode'));
	assert.ok(visited.includes('IdentifierNode'));
});
