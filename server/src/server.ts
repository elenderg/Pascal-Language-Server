/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	TextDocumentSyncKind,
	InitializeResult,
	Location,
	DocumentSymbol,
	Range
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as url from 'url';

import {
	parseDocumentSymbols,
	getCompletions,
	findDefinition
} from './pascalParser';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			},
			definitionProvider: true,
			documentSymbolProvider: true
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The Pascal settings
interface PascalSettings {
	compilerPath: string;
	compilerOptions: string[];
	checkTrigger: 'onSave' | 'onChange' | 'off';
	onChangeDebounceMs: number;
}

const defaultSettings: PascalSettings = {
	compilerPath: 'fpc',
	compilerOptions: [],
	checkTrigger: 'onSave',
	onChangeDebounceMs: 700
};
let globalSettings: PascalSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings = new Map<string, Thenable<PascalSettings>>();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = (
			(change.settings.pascal || defaultSettings)
		);
	}
	// Refresh the diagnostics for all open documents
	for (const doc of documents.all()) {
		validateTextDocument(doc);
	}
});

function getDocumentSettings(resource: string): Thenable<PascalSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'pascal'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

const filesWithDiagnostics = new Set<string>();
const activeProcesses = new Map<string, child_process.ChildProcess>();
const validationTimers = new Map<string, NodeJS.Timeout>();

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
	const timer = validationTimers.get(e.document.uri);
	if (timer) {
		clearTimeout(timer);
		validationTimers.delete(e.document.uri);
	}
	const proc = activeProcesses.get(e.document.uri);
	if (proc) {
		proc.kill();
		activeProcesses.delete(e.document.uri);
	}
	// Clear diagnostics for closed document
	connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
	filesWithDiagnostics.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(async change => {
	const settings = await getDocumentSettings(change.document.uri);
	if (settings.checkTrigger === 'onChange') {
		const existingTimer = validationTimers.get(change.document.uri);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}
		const timer = setTimeout(() => {
			validationTimers.delete(change.document.uri);
			validateTextDocument(change.document);
		}, settings.onChangeDebounceMs);
		validationTimers.set(change.document.uri, timer);
	}
});

documents.onDidSave(change => {
	validateTextDocument(change.document);
});

documents.onDidOpen(change => {
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	const settings = await getDocumentSettings(textDocument.uri);

	if (settings.checkTrigger === 'off') {
		// Clear diagnostics for this file
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
		filesWithDiagnostics.delete(textDocument.uri);
		return;
	}

	const uri = textDocument.uri;
	if (!uri.startsWith('file://')) {
		return;
	}

	const originalPath = url.fileURLToPath(uri);
	const cwd = path.dirname(originalPath);
	const filename = path.basename(originalPath);

	// Kill any active compile process for this document
	const activeProc = activeProcesses.get(uri);
	if (activeProc) {
		activeProc.kill();
		activeProcesses.delete(uri);
	}

	// Create temp directory for compilation to avoid cluttering workspace
	const tempDir = path.join(os.tmpdir(), 'pascal-lsp-temp-' + Math.random().toString(36).substring(2, 10));
	const outDir = path.join(tempDir, 'out');
	
	try {
		await fs.promises.mkdir(outDir, { recursive: true });
		
		let targetFilePath = originalPath;
		// If we validate on change, write current editor contents to a temp file
		if (settings.checkTrigger === 'onChange') {
			targetFilePath = path.join(tempDir, filename);
			await fs.promises.writeFile(targetFilePath, textDocument.getText(), 'utf8');
		}

		const compilerPath = settings.compilerPath || 'fpc';
		const args = [
			'-Cn', // Compile only, do not link
			'-FE' + outDir,
			'-FU' + outDir,
			...settings.compilerOptions,
			targetFilePath
		];

		const child = child_process.execFile(compilerPath, args, { cwd });
		activeProcesses.set(uri, child);

		let stdout = '';
		let stderr = '';

		if (child.stdout) {
			child.stdout.on('data', data => {
				stdout += data;
			});
		}
		if (child.stderr) {
			child.stderr.on('data', data => {
				stderr += data;
			});
		}

		child.on('close', async () => {
			activeProcesses.delete(uri);

			// Map to hold current diagnostic report updates
			const currentDiagnostics = new Map<string, Diagnostic[]>();
			
			// Initialize with currently dirty files to clear them if resolved
			for (const prevUri of filesWithDiagnostics) {
				currentDiagnostics.set(prevUri, []);
			}
			currentDiagnostics.set(uri, []);

			const combinedOutput = stdout + '\n' + stderr;
			const lines = combinedOutput.split(/\r?\n/);
			const lineRegex = /^(.*?)\((\d+)(?:,(\d+))?\)\s+(Error|Fatal|Warning|Hint|Note):\s+(.*)$/i;

			for (const line of lines) {
				const match = lineRegex.exec(line);
				if (match) {
					const matchedPath = match[1];
					const lineNum = parseInt(match[2], 10) - 1; // 0-based
					const colNum = match[3] ? parseInt(match[3], 10) - 1 : -1; // 0-based
					const severityStr = match[4].toLowerCase();
					const message = match[5];

					// Map temp file back to original uri
					let matchedUri = '';
					if (matchedPath === targetFilePath || path.basename(matchedPath).toLowerCase() === filename.toLowerCase()) {
						matchedUri = uri;
					} else {
						// Resolve other dependency files absolute paths
						let resolvedPath = matchedPath;
						if (!path.isAbsolute(resolvedPath)) {
							resolvedPath = path.resolve(cwd, resolvedPath);
						}
						matchedUri = url.pathToFileURL(resolvedPath).toString();
					}

					// Find line content to get exact end position of the word
					let lineContent = '';
					if (matchedUri === uri) {
						const docLines = textDocument.getText().split(/\r?\n/);
						if (lineNum >= 0 && lineNum < docLines.length) {
							lineContent = docLines[lineNum];
						}
					} else {
						// Read line content from disk for other files
						try {
							const fileContent = await fs.promises.readFile(url.fileURLToPath(matchedUri), 'utf8');
							const fileLines = fileContent.split(/\r?\n/);
							if (lineNum >= 0 && lineNum < fileLines.length) {
								lineContent = fileLines[lineNum];
							}
						} catch (e) {
							// ignore
						}
					}

					let severity: DiagnosticSeverity = DiagnosticSeverity.Error;
					if (severityStr === 'warning') {
						severity = DiagnosticSeverity.Warning;
					} else if (severityStr === 'hint') {
						severity = DiagnosticSeverity.Hint;
					} else if (severityStr === 'note') {
						severity = DiagnosticSeverity.Information;
					}

					const range = getDiagnosticRange(lineContent, lineNum, colNum);
					const diagnostic: Diagnostic = {
						severity,
						range,
						message,
						source: 'fpc'
					};

					let diags = currentDiagnostics.get(matchedUri);
					if (!diags) {
						diags = [];
						currentDiagnostics.set(matchedUri, diags);
					}
					diags.push(diagnostic);
				}
			}

			// Send diagnostics to client
			for (const [diagUri, diags] of currentDiagnostics) {
				connection.sendDiagnostics({ uri: diagUri, diagnostics: diags });
				if (diags.length > 0) {
					filesWithDiagnostics.add(diagUri);
				} else {
					filesWithDiagnostics.delete(diagUri);
				}
			}

			// Cleanup the temp files
			try {
				await fs.promises.rm(tempDir, { recursive: true, force: true });
			} catch (err) {
				// Ignore cleanup errors
			}
		});

	} catch (e) {
		connection.console.error(`Error in validation: ${e}`);
		try {
			await fs.promises.rm(tempDir, { recursive: true, force: true });
		} catch (err) {
			// Ignore cleanup errors
		}
	}
}

function getDiagnosticRange(lineContent: string, lineNum: number, colStart: number): Range {
	if (colStart < 0 || !lineContent || colStart >= lineContent.length) {
		return Range.create(lineNum, 0, lineNum, lineContent ? lineContent.length : 1);
	}
	let colEnd = colStart;
	const wordChar = /^[a-zA-Z0-9_]$/;
	if (wordChar.test(lineContent[colStart])) {
		while (colEnd < lineContent.length && wordChar.test(lineContent[colEnd])) {
			colEnd++;
		}
	} else {
		colEnd = colStart + 1;
	}
	return Range.create(lineNum, colStart, lineNum, colEnd);
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received a file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion((params): CompletionItem[] => {
	const document = documents.get(params.textDocument.uri);
	if (document) {
		return getCompletions(document);
	}
	return [];
});

// This handler resolves additional information for the item selected in the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	return item;
});

// Document Symbol Handler
connection.onDocumentSymbol((params): DocumentSymbol[] => {
	const document = documents.get(params.textDocument.uri);
	if (document) {
		return parseDocumentSymbols(document);
	}
	return [];
});

// Go to Definition Handler
connection.onDefinition((params) => {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return null;
	}

	// Extract the word under cursor
	const text = document.getText();
	const offset = document.offsetAt(params.position);
	
	let start = offset;
	while (start > 0 && /[a-zA-Z0-9_]/.test(text[start - 1])) {
		start--;
	}
	let end = offset;
	while (end < text.length && /[a-zA-Z0-9_]/.test(text[end])) {
		end++;
	}

	const word = text.slice(start, end);
	const range = findDefinition(document, word);
	if (range) {
		return {
			uri: document.uri,
			range
		} satisfies Location;
	}

	return null;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
