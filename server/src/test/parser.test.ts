import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parsePascalDocument } from '../compiler/old_parser';
import { ProgramNode, ClassDeclarationNode, IfStatementNode, CaseStatementNode, WhileStatementNode, RepeatStatementNode, ForStatementNode, WithStatementNode, TryStatementNode, RaiseStatementNode } from '../compiler/ast';

test('parser handles the Pascal syntax fixture with classes, conditionals, loops, case, with, try and raise', () => {
	const fixturePath = path.resolve(__dirname, '..', '..', 'src', 'test', 'teste.pas');
	const source = fs.readFileSync(fixturePath, 'utf8');
	const ast = parsePascalDocument(TextDocument.create('file:///teste.pas', 'pascal', 1, source));

	assert.ok(ast instanceof ProgramNode);
	assert.equal(ast.name.name, 'SintaxePascalExemplo');

	const program = ast as ProgramNode;
	const hasClass = program.block.declarations.some(decl => decl instanceof ClassDeclarationNode);
	assert.equal(hasClass, true, 'Expected a class declaration to be parsed');

	const statementKinds = program.block.statements.map(stmt => stmt.constructor.name);
	assert.ok(statementKinds.includes('IfStatementNode'), 'Expected an if statement to be parsed');
	assert.ok(statementKinds.includes('CaseStatementNode'), 'Expected a case statement to be parsed');
	assert.ok(statementKinds.includes('WhileStatementNode'), 'Expected a while statement to be parsed');
	assert.ok(statementKinds.includes('RepeatStatementNode'), 'Expected a repeat statement to be parsed');
	assert.ok(statementKinds.includes('ForStatementNode'), 'Expected a for statement to be parsed');
	assert.ok(statementKinds.includes('WithStatementNode'), 'Expected a with statement to be parsed');
	assert.ok(statementKinds.includes('TryStatementNode'), 'Expected a try statement to be parsed');
	assert.ok(statementKinds.includes('RaiseStatementNode'), 'Expected a raise statement to be parsed');
});
