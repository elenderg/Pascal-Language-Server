const { getDocumentSymbols } = require('./out/semanticLSP');
const { PascalDocument } = require('./out/compiler/models');
const { parsePascalDocument } = require('./out/compiler/parser');
const { TextDocument } = require('vscode-languageserver-textdocument');

const source = 'program Test;\nvar x: integer;\nbegin\nend.';
const doc = new PascalDocument('file:///test.pas', source, 1);
const ast = parsePascalDocument(TextDocument.create(doc.uri, 'pascal', doc.version, doc.text));
doc.setParsed(ast, 'program');
doc.analyzeSemantic();
console.log('phase', doc.analysisPhase);
try {
  const symbols = getDocumentSymbols(doc);
  console.log(JSON.stringify(symbols, null, 2));
} catch (e) {
  console.error(e && e.stack || e);
  process.exit(1);
}
