import {
	Range,
	SymbolKind,
	DocumentSymbol,
	CompletionItem,
	CompletionItemKind
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

// Strip comments and string contents while preserving lengths and lines
export function stripCommentsAndStrings(text: string): string {
	let result = '';
	let i = 0;
	const len = text.length;
	let state: 'normal' | 'lineComment' | 'blockCurly' | 'blockParen' | 'string' = 'normal';

	while (i < len) {
		const c = text[i];
		const next = i + 1 < len ? text[i + 1] : '';

		if (state === 'normal') {
			if (c === '/' && next === '/') {
				state = 'lineComment';
				result += '  ';
				i += 2;
				continue;
			} else if (c === '{') {
				state = 'blockCurly';
				result += ' ';
				i++;
				continue;
			} else if (c === '(' && next === '*') {
				state = 'blockParen';
				result += '  ';
				i += 2;
				continue;
			} else if (c === '\'') {
				state = 'string';
				result += '\'';
				i++;
				continue;
			} else {
				result += c;
				i++;
			}
		} else if (state === 'lineComment') {
			if (c === '\n' || c === '\r') {
				state = 'normal';
				result += c;
			} else {
				result += ' ';
			}
			i++;
		} else if (state === 'blockCurly') {
			if (c === '}') {
				state = 'normal';
				result += ' ';
			} else if (c === '\n' || c === '\r') {
				result += c;
			} else {
				result += ' ';
			}
			i++;
		} else if (state === 'blockParen') {
			if (c === '*' && next === ')') {
				state = 'normal';
				result += '  ';
				i += 2;
				continue;
			} else if (c === '\n' || c === '\r') {
				result += c;
			} else {
				result += ' ';
			}
			i++;
		} else if (state === 'string') {
			if (c === '\'') {
				if (next === '\'') {
					result += '  ';
					i += 2;
					continue;
				} else {
					state = 'normal';
					result += '\'';
				}
			} else if (c === '\n' || c === '\r') {
				result += c;
			} else {
				result += ' ';
			}
			i++;
		}
	}
	return result;
}

export function parseDocumentSymbols(document: TextDocument): DocumentSymbol[] {
	const text = document.getText();
	const cleanText = stripCommentsAndStrings(text);
	const lines = cleanText.split(/\r?\n/);
	const symbols: DocumentSymbol[] = [];

	let currentSection: 'none' | 'const' | 'var' | 'type' = 'none';

	// Regexes
	const sectionHeaderRegex = /^\s*(const|var|threadvar|type|begin|initialization|finalization)\b/i;
	const subprogramRegex = /\b(procedure|function|constructor|destructor)\s+([a-zA-Z0-9_\.]+)/i;
	const packageRegex = /^\s*(program|unit|library)\s+([a-zA-Z0-9_]+)/i;
	const classRecordRegex = /^\s*([a-zA-Z0-9_]+)\s*=\s*(class|record|interface|object|packed record)\b/i;
	const typeAliasRegex = /^\s*([a-zA-Z0-9_]+)\s*=\s*([^;]+);/i;
	const constRegex = /^\s*([a-zA-Z0-9_]+)\s*(?::\s*[^=]+)?=\s*([^;]+);/i;
	const varRegex = /^\s*([a-zA-Z0-9_]+(?:\s*,\s*[a-zA-Z0-9_]+)*)\s*:\s*([^;]+);/i;

	for (let lineNum = 0; lineNum < lines.length; lineNum++) {
		const line = lines[lineNum];
		if (!line.trim()) {
			continue;
		}

		// Check for section transitions
		const sectionMatch = sectionHeaderRegex.exec(line);
		if (sectionMatch) {
			const header = sectionMatch[1].toLowerCase();
			if (header === 'const') {
				currentSection = 'const';
			} else if (header === 'var' || header === 'threadvar') {
				currentSection = 'var';
			} else if (header === 'type') {
				currentSection = 'type';
			} else {
				currentSection = 'none';
			}
		}

		// 1. Check for Package (program, unit, library)
		const pkgMatch = packageRegex.exec(line);
		if (pkgMatch) {
			currentSection = 'none'; // reset section
			const name = pkgMatch[2];
			const startIdx = line.indexOf(name);
			const range = Range.create(lineNum, 0, lineNum, line.length);
			const selectionRange = Range.create(lineNum, startIdx, lineNum, startIdx + name.length);
			symbols.push({
				name,
				kind: SymbolKind.Package,
				range,
				selectionRange
			});
			continue;
		}

		// 2. Check for Subprograms (procedure, function, constructor, destructor)
		const subMatch = subprogramRegex.exec(line);
		if (subMatch) {
			currentSection = 'none'; // subprogram reset sections
			const type = subMatch[1].toLowerCase();
			const name = subMatch[2];
			const startIdx = line.indexOf(name);
			const range = Range.create(lineNum, 0, lineNum, line.length);
			const selectionRange = Range.create(lineNum, startIdx, lineNum, startIdx + name.length);

			let kind: SymbolKind = SymbolKind.Function;
			if (type === 'procedure') {
				kind = SymbolKind.Method;
			} else if (type === 'constructor' || type === 'destructor') {
				kind = SymbolKind.Constructor;
			}

			symbols.push({
				name,
				kind,
				range,
				selectionRange
			});
			continue;
		}

		// 3. Section specific parsing
		if (currentSection === 'type') {
			const classRecMatch = classRecordRegex.exec(line);
			if (classRecMatch) {
				const name = classRecMatch[1];
				const type = classRecMatch[2].toLowerCase();
				const startIdx = line.indexOf(name);
				const range = Range.create(lineNum, 0, lineNum, line.length);
				const selectionRange = Range.create(lineNum, startIdx, lineNum, startIdx + name.length);

				let kind: SymbolKind = SymbolKind.Class;
				if (type.includes('record')) {
					kind = SymbolKind.Struct;
				} else if (type === 'interface') {
					kind = SymbolKind.Interface;
				}

				symbols.push({
					name,
					kind,
					range,
					selectionRange
				});
				continue;
			}

			const aliasMatch = typeAliasRegex.exec(line);
			if (aliasMatch) {
				const name = aliasMatch[1];
				const startIdx = line.indexOf(name);
				const range = Range.create(lineNum, 0, lineNum, line.length);
				const selectionRange = Range.create(lineNum, startIdx, lineNum, startIdx + name.length);
				symbols.push({
					name,
					kind: SymbolKind.Class, // display type aliases as Class/Type
					range,
					selectionRange
				});
				continue;
			}
		} else if (currentSection === 'const') {
			const constMatch = constRegex.exec(line);
			if (constMatch) {
				const name = constMatch[1];
				const startIdx = line.indexOf(name);
				const range = Range.create(lineNum, 0, lineNum, line.length);
				const selectionRange = Range.create(lineNum, startIdx, lineNum, startIdx + name.length);
				symbols.push({
					name,
					kind: SymbolKind.Constant,
					range,
					selectionRange
				});
				continue;
			}
		} else if (currentSection === 'var') {
			const varMatch = varRegex.exec(line);
			if (varMatch) {
				const namesStr = varMatch[1];
				const names = namesStr.split(',').map(n => n.trim());
				for (const name of names) {
					if (!name) {continue;}
					const startIdx = line.indexOf(name);
					const range = Range.create(lineNum, 0, lineNum, line.length);
					const selectionRange = Range.create(lineNum, startIdx, lineNum, startIdx + name.length);
					symbols.push({
						name,
						kind: SymbolKind.Variable,
						range,
						selectionRange
					});
				}
				continue;
			}
		}
	}

	return symbols;
}

export function escapeRegex(text: string): string {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function findDefinition(document: TextDocument, word: string): Range | null {
	if (!word || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(word)) {
		return null;
	}

	const text = document.getText();
	const cleanText = stripCommentsAndStrings(text);
	const lines = cleanText.split(/\r?\n/);
	const escaped = escapeRegex(word);

	// Regexes to locate definition
	const procRegex = new RegExp('\\b(procedure|function|constructor|destructor)\\s+(?:[a-zA-Z0-9_]+\\.)?' + escaped + '\\b', 'i');
	const typeRegex = new RegExp('\\b' + escaped + '\\s*=\\s*(class|record|interface|object|packed record|[^;]+)', 'i');
	const constRegex = new RegExp('\\b' + escaped + '\\s*(?::\\s*[^=]+)?=\\s*', 'i');
	const varRegex = new RegExp('^\\s*(?:[a-zA-Z0-9_]+\\s*,\\s*)*' + escaped + '(?:\\s*,\\s*[a-zA-Z0-9_]+)*\\s*:\\s*[^;]+;', 'i');

	for (let lineNum = 0; lineNum < lines.length; lineNum++) {
		const line = lines[lineNum];

		// Check subprogram
		if (procRegex.test(line)) {
			const idx = line.toLowerCase().indexOf(word.toLowerCase());
			if (idx !== -1) {
				return Range.create(lineNum, idx, lineNum, idx + word.length);
			}
		}

		// Check type alias or class
		if (typeRegex.test(line)) {
			const idx = line.toLowerCase().indexOf(word.toLowerCase());
			if (idx !== -1) {
				return Range.create(lineNum, idx, lineNum, idx + word.length);
			}
		}

		// Check variable declaration list
		if (varRegex.test(line)) {
			// Find position of the exact word
			const idx = line.toLowerCase().indexOf(word.toLowerCase());
			if (idx !== -1) {
				return Range.create(lineNum, idx, lineNum, idx + word.length);
			}
		}

		// Check constant
		if (constRegex.test(line)) {
			const idx = line.toLowerCase().indexOf(word.toLowerCase());
			if (idx !== -1) {
				return Range.create(lineNum, idx, lineNum, idx + word.length);
			}
		}
	}

	return null;
}

const pascalKeywords = [
	'begin', 'end', 'var', 'const', 'type', 'procedure', 'function',
	'constructor', 'destructor', 'program', 'unit', 'uses', 'interface',
	'implementation', 'initialization', 'finalization', 'if', 'then',
	'else', 'for', 'to', 'downto', 'do', 'while', 'repeat', 'until',
	'try', 'finally', 'except', 'class', 'record', 'object', 'nil',
	'true', 'false', 'and', 'or', 'not', 'xor', 'shl', 'shr', 'div',
	'mod', 'in', 'is', 'as', 'with', 'case', 'of', 'array', 'file',
	'set', 'string', 'char', 'integer', 'real', 'boolean', 'double',
	'single', 'word', 'byte', 'cardinal', 'longint', 'int64', 'inherited',
	'override', 'virtual', 'abstract', 'overload', 'stdcall', 'cdecl',
	'pascal', 'register', 'public', 'private', 'protected', 'published'
];

const pascalBuiltins = [
	'writeln', 'write', 'readln', 'read', 'assigned', 'length',
	'high', 'low', 'concat', 'copy', 'delete', 'insert', 'exit',
	'break', 'continue', 'sizeof', 'ord', 'chr', 'inc', 'dec',
	'random', 'randomize', 'pos', 'trim', 'uppercase', 'lowercase',
	'comparetext', 'strtoint', 'inttostr', 'format'
];

export function getCompletions(document: TextDocument): CompletionItem[] {
	const items: CompletionItem[] = [];
	const seen = new Set<string>();

	// Add keywords
	for (const kw of pascalKeywords) {
		const key = kw.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			items.push({
				label: kw,
				kind: CompletionItemKind.Keyword
			});
		}
	}

	// Add builtins
	for (const bi of pascalBuiltins) {
		const key = bi.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			items.push({
				label: bi,
				kind: CompletionItemKind.Function
			});
		}
	}

	// Add document symbols
	const docSymbols = parseDocumentSymbols(document);
	for (const sym of docSymbols) {
		const key = sym.name.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);

			let kind: CompletionItemKind = CompletionItemKind.Text;
			if (sym.kind === SymbolKind.Function) {
				kind = CompletionItemKind.Function;
			} else if (sym.kind === SymbolKind.Method) {
				kind = CompletionItemKind.Method;
			} else if (sym.kind === SymbolKind.Constructor) {
				kind = CompletionItemKind.Constructor;
			} else if (sym.kind === SymbolKind.Class) {
				kind = CompletionItemKind.Class;
			} else if (sym.kind === SymbolKind.Struct) {
				kind = CompletionItemKind.Struct;
			} else if (sym.kind === SymbolKind.Constant) {
				kind = CompletionItemKind.Constant;
			} else if (sym.kind === SymbolKind.Variable) {
				kind = CompletionItemKind.Variable;
			} else if (sym.kind === SymbolKind.Package) {
				kind = CompletionItemKind.Module;
			} else if (sym.kind === SymbolKind.Interface) {
				kind = CompletionItemKind.Interface;
			}

			items.push({
				label: sym.name,
				kind
			});
		}
	}

	// Add some useful snippets
	const snippetPairs: [string, string, string][] = [
		['begin..end', 'begin\n\t$0\nend;', 'Block begin..end'],
		['if..then', 'if $1 then\n\t$0;', 'If statement'],
		['for..to..do', 'for $1 := $2 to $3 do\nbegin\n\t$0\nend;', 'For loop'],
		['while..do', 'while $1 do\nbegin\n\t$0\nend;', 'While loop'],
		['repeat..until', 'repeat\n\t$0\nuntil $1;', 'Repeat loop'],
		['try..finally', 'try\n\t$1\nfinally\n\t$0\nend;', 'Try-finally block']
	];

	for (const [label, insertText, detail] of snippetPairs) {
		items.push({
			label,
			insertText,
			insertTextFormat: 2, // Snippet
			kind: CompletionItemKind.Snippet,
			detail
		});
	}

	return items;
}
