/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as assert from 'assert';
import { activate, getDocUri } from './helper';

suite('Go to definition', () => {
	test('Resolves definitions recursively through Pascal units', async () => {
		const docUri = getDocUri('definition_test.pas');
		await activate(docUri);
		const position = findPosition('GetDefinition');
		const definition = await vscode.commands.executeCommand<vscode.Location[]>(
			'vscode.executeDefinitionProvider',
			docUri,
			position,
		);

		assert.ok(definition);
		assert.strictEqual(definition.length, 1);
		assert.strictEqual(definition[0].uri.fsPath, getDocUri('DefinitionDependency.pas').fsPath);
		assert.strictEqual(definition[0].range.start.line, 10);
		assert.strictEqual(definition[0].range.start.character, 9);
	});

	test('Resolves type definitions through used units', async () => {
		const docUri = getDocUri('definition_test.pas');
		await activate(docUri);
		const typePosition = findPosition('TDependencyType', 'TypedValue:');
		const definition = await vscode.commands.executeCommand<vscode.Location[]>(
			'vscode.executeTypeDefinitionProvider',
			docUri,
			typePosition,
		);

		assert.ok(definition);
		assert.strictEqual(definition.length, 1);
		assert.strictEqual(definition[0].uri.fsPath, getDocUri('DefinitionDependency.pas').fsPath);
		assert.strictEqual(definition[0].range.start.line, 5);
	});

	test('Resolves implementations through used units', async () => {
		const docUri = getDocUri('definition_test.pas');
		await activate(docUri);
		const implementation = await vscode.commands.executeCommand<vscode.Location[]>(
			'vscode.executeImplementationProvider',
			docUri,
			findPosition('GetDefinition'),
		);

		assert.ok(implementation);
		assert.strictEqual(implementation.length, 1);
		assert.strictEqual(implementation[0].uri.fsPath, getDocUri('DefinitionDependency.pas').fsPath);
		assert.strictEqual(implementation[0].range.start.line, 13);
	});

	test('Finds references across the dependency chain', async () => {
		const docUri = getDocUri('definition_test.pas');
		await activate(docUri);
		const references = await vscode.commands.executeCommand<vscode.Location[]>(
			'vscode.executeReferenceProvider',
			docUri,
			findPosition('GetDefinition'),
			{ includeDeclaration: true },
		);

		assert.ok(references);
		assert.strictEqual(references.length, 3);
		assert.deepStrictEqual(
			references.map(reference => reference.uri.fsPath),
			[
				docUri.fsPath,
				getDocUri('DefinitionDependency.pas').fsPath,
				getDocUri('DefinitionDependency.pas').fsPath,
			],
		);
	});

	test('Resolves record fields inside a with block', async () => {
		const docUri = getDocUri('with_record_test.pas');
		await activate(docUri);
		const definition = await vscode.commands.executeCommand<vscode.Location[]>(
			'vscode.executeDefinitionProvider',
			docUri,
			findPosition('CorFavorita', 'case CorFavorita'),
		);

		assert.ok(definition);
		assert.strictEqual(definition.length, 1);
		assert.strictEqual(definition[0].uri.fsPath, docUri.fsPath);
		assert.strictEqual(definition[0].range.start.line, 8);
		assert.strictEqual(definition[0].range.start.character, 4);
	});

	test('Resolves the type of a record field inside a with block', async () => {
		const docUri = getDocUri('with_record_test.pas');
		await activate(docUri);
		const typeDefinition = await vscode.commands.executeCommand<vscode.Location[]>(
			'vscode.executeTypeDefinitionProvider',
			docUri,
			findPosition('CorFavorita', 'case CorFavorita'),
		);

		assert.ok(typeDefinition);
		assert.strictEqual(typeDefinition.length, 1);
		assert.strictEqual(typeDefinition[0].uri.fsPath, docUri.fsPath);
		assert.strictEqual(typeDefinition[0].range.start.line, 3);
		assert.strictEqual(typeDefinition[0].range.start.character, 2);
	});

	test('Resolves record fields through the explicit member access operator', async () => {
		const docUri = getDocUri('with_record_test.pas');
		await activate(docUri);
		for (const fieldName of ['Idade', 'Altura']) {
			const definition = await vscode.commands.executeCommand<vscode.Location[]>(
				'vscode.executeDefinitionProvider',
				docUri,
				findPosition(fieldName, `PessoaAtual.${fieldName}`),
			);

			assert.ok(definition, `Expected definition for PessoaAtual.${fieldName}`);
			assert.strictEqual(definition.length, 1);
			assert.strictEqual(definition[0].uri.fsPath, docUri.fsPath);
			assert.strictEqual(definition[0].range.start.line, fieldName === 'Idade' ? 6 : 7);
		}
	});

	test('Resolves enumeration members used in a with block case', async () => {
		const docUri = getDocUri('with_record_test.pas');
		await activate(docUri);
		const definition = await vscode.commands.executeCommand<vscode.Location[]>(
			'vscode.executeDefinitionProvider',
			docUri,
			findPosition('Vermelho', "Vermelho:"),
		);

		assert.ok(definition);
		assert.strictEqual(definition.length, 1);
		assert.strictEqual(definition[0].uri.fsPath, docUri.fsPath);
		assert.strictEqual(definition[0].range.start.line, 3);
		assert.strictEqual(definition[0].range.start.character, 10);
	});
});

function findPosition(word: string, precedingText?: string): vscode.Position {
	const document = vscode.window.activeTextEditor!.document;
	const lineNumber = document.getText().split(/\r?\n/).findIndex(line =>
		line.includes(word) && (!precedingText || line.includes(precedingText)),
	);
	assert.notStrictEqual(lineNumber, -1);
	const line = document.lineAt(lineNumber).text;
	return new vscode.Position(lineNumber, line.indexOf(word));
}
