import test from 'node:test';
import assert from 'node:assert/strict';
import { Position } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentKind, PascalDocument } from '../compiler/models';
import { parsePascalDocument } from '../compiler/parser';
import { goToDefinition } from '../semanticLSP';

test('goToDefinition resolves a declaration from the parsed AST', () => {
	const source = 'program Test;\nvar x: Integer;\nbegin\n  x := 1;\nend.';
	const document = new PascalDocument('file:///test.pas', source, 1);
	const ast = parsePascalDocument(TextDocument.create(document.uri, 'pascal', document.version, document.text));
	document.setParsed(ast, DocumentKind.Program);
	document.analyzeSemantic();

	const result = goToDefinition(document, Position.create(3, 3));

	assert.ok(result, 'Expected a definition location');
	assert.equal(result?.uri, document.uri);
	assert.equal(result?.range.start.line, 1);
	assert.equal(result?.range.start.character, 4);
});
