import { Position, Range } from 'vscode-languageserver/node';

/** Posição em texto-fonte (0-based, compatível com LSP). */
export class SourcePosition {
	readonly line: number;
	readonly character: number;

	constructor(line: number, character: number) {
		this.line = line;
		this.character = character;
	}

	static fromLsp(position: Position): SourcePosition {
		return new SourcePosition(position.line, position.character);
	}

	toLsp(): Position {
		return { line: this.line, character: this.character };
	}

	isBefore(other: SourcePosition): boolean {
		return this.line < other.line
			|| (this.line === other.line && this.character < other.character);
	}

	isBeforeOrEqual(other: SourcePosition): boolean {
		return this.isBefore(other)
			|| (this.line === other.line && this.character === other.character);
	}
}

/** Intervalo contíguo no texto-fonte. Todo nó da AST referencia um SourceRange. */
export class SourceRange {
	readonly start: SourcePosition;
	readonly end: SourcePosition;

	constructor(start: SourcePosition, end: SourcePosition) {
		this.start = start;
		this.end = end;
	}

	static fromLsp(range: Range): SourceRange {
		return new SourceRange(
			SourcePosition.fromLsp(range.start),
			SourcePosition.fromLsp(range.end),
		);
	}

	static single(line: number, character: number): SourceRange {
		const pos = new SourcePosition(line, character);
		return new SourceRange(pos, pos);
	}

	static between(start: SourcePosition, end: SourcePosition): SourceRange {
		return new SourceRange(start, end);
	}

	toLsp(): Range {
		return { start: this.start.toLsp(), end: this.end.toLsp() };
	}

	contains(position: SourcePosition): boolean {
		return position.isBeforeOrEqual(this.end) && this.start.isBeforeOrEqual(position);
	}

	merge(other: SourceRange): SourceRange {
		const start = this.start.isBefore(other.start) ? this.start : other.start;
		const end = this.end.isBefore(other.end) ? other.end : this.end;
		return new SourceRange(start, end);
	}
}
