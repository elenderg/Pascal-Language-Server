import type { Symbol, SubprogramSymbol } from './symbols';
import { OverloadGroup, SubprogramSymbol as SubprogramSymbolClass } from './symbols';

// ---------------------------------------------------------------------------
// Escopos — regras de visibilidade e cadeia de lookup
// ---------------------------------------------------------------------------

export enum ScopeKind {
	Global = 'global',
	Unit = 'unit',
	InterfaceSection = 'interfaceSection',
	ImplementationSection = 'implementationSection',
	Uses = 'uses',
	Class = 'class',
	Local = 'local',
	Block = 'block',
	Record = 'record',
	Interface = 'interface',
}

/**
 * Contrato de escopo. Toda resolução de nome percorre a cadeia de escopos —
 * nunca busca textual no documento.
 */
export interface Scope {
	readonly kind: ScopeKind;
	readonly parent: Scope | undefined;
	readonly name: string;

	define(symbol: Symbol): void;
	resolve(name: string): Symbol | undefined;
	resolveLocal(name: string): Symbol | undefined;
	getSymbols(): Iterable<Symbol>;
	getSubprograms(name: string): readonly SubprogramSymbol[];
}

/** Implementação base: mapa local + encadeamento para o escopo pai. */
export abstract class BaseScope implements Scope {
	readonly parent: Scope | undefined;
	readonly name: string;
	abstract readonly kind: ScopeKind;

	protected readonly symbols = new Map<string, Symbol>();
	protected readonly overloadGroups = new Map<string, OverloadGroup>();

	constructor(name: string, parent?: Scope) {
		this.name = name;
		this.parent = parent;
	}

	define(symbol: Symbol): void {
		symbol.declaringScope = this;

		if (symbol instanceof SubprogramSymbolClass) {
			const sub = symbol;
			if (sub.isOverload || this.overloadGroups.has(sub.name)) {
				let group = this.overloadGroups.get(sub.name);
				if (!group) {
					group = new OverloadGroup(sub.name);
					this.overloadGroups.set(sub.name, group);
					const existing = this.symbols.get(sub.name);
					if (existing instanceof SubprogramSymbolClass) {
						group.add(existing);
					}
				}
				group.add(sub);
			}
		}

		this.symbols.set(symbol.name, symbol);
	}

	resolveLocal(name: string): Symbol | undefined {
		return this.symbols.get(name);
	}

	resolve(name: string): Symbol | undefined {
		const local = this.resolveLocal(name);
		if (local !== undefined) {
			return local;
		}
		return this.parent?.resolve(name);
	}

	getSymbols(): Iterable<Symbol> {
		return this.symbols.values();
	}

	getSubprograms(name: string): readonly SubprogramSymbol[] {
		const group = this.overloadGroups.get(name);
		if (group) {
			return group.members;
		}
		const sym = this.symbols.get(name);
		if (sym instanceof SubprogramSymbolClass) {
			return [sym];
		}
		return this.parent ? this.parent.getSubprograms(name) : [];
	}
}

/** Escopo de bloco begin..end ou corpo de subprograma. */
export class LocalScope extends BaseScope {
	readonly kind = ScopeKind.Local as const;

	constructor(name: string, parent: Scope) {
		super(name, parent);
	}
}

export class BlockScope extends BaseScope {
	readonly kind = ScopeKind.Block as const;

	constructor(name: string, parent: Scope) {
		super(name, parent);
	}
}

/** Escopo específico para corpo de procedure. */
export class ProcedureScope extends LocalScope {
	constructor(name: string, parent: Scope) {
		super(name, parent);
	}
}

/** Escopo específico para corpo de function. */
export class FunctionScope extends LocalScope {
	constructor(name: string, parent: Scope) {
		super(name, parent);
	}
}

/** Escopo específico para corpo de method em classe. */
export class MethodScope extends LocalScope {
	/** Referência ao escopo da classe onde o método está declarado. */
	readonly classScope: ClassScope | undefined;

	constructor(name: string, parent: Scope, classScope?: ClassScope) {
		super(name, parent);
		this.classScope = classScope;
	}
}

/** Seção interface de uma unit — símbolos exportados via uses. */
export class InterfaceSectionScope extends BaseScope {
	readonly kind = ScopeKind.InterfaceSection as const;

	constructor(name: string, parent: Scope) {
		super(name, parent);
	}
}

/** Seção implementation — visível apenas dentro da unit. */
export class ImplementationSectionScope extends BaseScope {
	readonly kind = ScopeKind.ImplementationSection as const;

	constructor(name: string, parent: Scope) {
		super(name, parent);
	}

	override resolve(name: string): Symbol | undefined {
		const local = this.resolveLocal(name);
		if (local !== undefined) {
			return local;
		}
		return this.parent?.resolve(name);
	}
}

/**
 * Agrega símbolos exportados pelas units referenciadas na cláusula uses.
 * Não define símbolos próprios — apenas delega para units importadas.
 */
export class UsesScope implements Scope {
	readonly kind = ScopeKind.Uses as const;
	readonly parent: Scope | undefined;
	readonly name: string;
	private readonly importedUnits = new Map<string, Scope>();

	constructor(name: string, parent?: Scope) {
		this.name = name;
		this.parent = parent;
	}

	addUnit(unitName: string, interfaceScope: Scope): void {
		this.importedUnits.set(unitName.toLowerCase(), interfaceScope);
	}

	define(_symbol: Symbol): void {
		throw new Error('UsesScope does not define symbols directly');
	}

	resolveLocal(name: string): Symbol | undefined {
		for (const unitScope of this.importedUnits.values()) {
			const found = unitScope.resolveLocal(name);
			if (found !== undefined) {
				return found;
			}
		}
		return undefined;
	}

	resolve(name: string): Symbol | undefined {
		const local = this.resolveLocal(name);
		if (local !== undefined) {
			return local;
		}
		return this.parent?.resolve(name);
	}

	getSymbols(): Iterable<Symbol> {
		const all: Symbol[] = [];
		for (const unitScope of this.importedUnits.values()) {
			all.push(...unitScope.getSymbols());
		}
		return all;
	}

	getSubprograms(name: string): readonly SubprogramSymbol[] {
		const results: SubprogramSymbol[] = [];
		for (const unitScope of this.importedUnits.values()) {
			results.push(...unitScope.getSubprograms(name));
		}
		return results;
	}

	getImportedUnitScope(unitName: string): Scope | undefined {
		return this.importedUnits.get(unitName.toLowerCase());
	}
}

/**
 * Escopo de classe: lookup local → hierarquia de classes base → escopo externo.
 */
export class ClassScope extends BaseScope {
	readonly kind = ScopeKind.Class as const;
	readonly parentClassScope: ClassScope | undefined;

	constructor(name: string, parent: Scope, parentClassScope?: ClassScope) {
		super(name, parent);
		this.parentClassScope = parentClassScope;
	}

	override resolve(name: string): Symbol | undefined {
		const local = this.resolveLocal(name);
		if (local !== undefined) {
			return local;
		}
		if (this.parentClassScope !== undefined) {
			const inBase = this.parentClassScope.resolve(name);
			if (inBase !== undefined) {
				return inBase;
			}
		}
		return this.parent?.resolve(name);
	}

	override getSubprograms(name: string): readonly SubprogramSymbol[] {
		const local = this.getLocalSubprograms(name);
		if (local.length > 0) {
			return local;
		}
		if (this.parentClassScope !== undefined) {
			return this.parentClassScope.getSubprograms(name);
		}
		return this.parent ? this.parent.getSubprograms(name) : [];
	}

	private getLocalSubprograms(name: string): readonly SubprogramSymbol[] {
		const group = this.overloadGroups.get(name);
		if (group) {
			return group.members;
		}
		const sym = this.symbols.get(name);
		if (sym instanceof SubprogramSymbolClass) {
			return [sym];
		}
		return [];
	}
}

/** Escopo de record — sem herança, apenas encadeamento para o pai lexical. */
export class RecordScope extends BaseScope {
	readonly kind = ScopeKind.Record as const;

	constructor(name: string, parent: Scope) {
		super(name, parent);
	}
}

/** Escopo de interface Pascal — suporta herança de interface. */
export class InterfaceScope extends BaseScope {
	readonly kind = ScopeKind.Interface as const;
	readonly parentInterfaceScope: InterfaceScope | undefined;

	constructor(name: string, parent: Scope, parentInterfaceScope?: InterfaceScope) {
		super(name, parent);
		this.parentInterfaceScope = parentInterfaceScope;
	}

	override resolve(name: string): Symbol | undefined {
		const local = this.resolveLocal(name);
		if (local !== undefined) {
			return local;
		}
		if (this.parentInterfaceScope !== undefined) {
			const inParent = this.parentInterfaceScope.resolve(name);
			if (inParent !== undefined) {
				return inParent;
			}
		}
		return this.parent?.resolve(name);
	}
}

/**
 * Escopo raiz de uma unit ou program.
 *
 * Cadeia de lookup (implementation):
 *   local → implementation → interface → uses → (parent global)
 *
 * Cadeia de lookup (interface):
 *   local → interface → uses → (parent global)
 */
export class UnitScope extends BaseScope {
	readonly kind = ScopeKind.Unit as const;
	readonly usesScope: UsesScope;
	readonly interfaceScope: InterfaceSectionScope;
	readonly implementationScope: ImplementationSectionScope;

	constructor(name: string, parent?: Scope) {
		super(name, parent);
		this.usesScope = new UsesScope(`${name}.uses`, this);
		this.interfaceScope = new InterfaceSectionScope(`${name}.interface`, this.usesScope);
		this.implementationScope = new ImplementationSectionScope(
			`${name}.implementation`,
			this.interfaceScope,
		);
	}

	/** Retorna o escopo ativo para declarações na seção interface. */
	getInterfaceDeclarationScope(): Scope {
		return this.interfaceScope;
	}

	/** Retorna o escopo ativo para declarações na seção implementation. */
	getImplementationDeclarationScope(): Scope {
		return this.implementationScope;
	}

	/** Retorna o escopo ativo para corpos de subprogramas (implementation + uses + interface). */
	getImplementationLookupScope(): Scope {
		return this.implementationScope;
	}

	/** Retorna o escopo ativo para código na seção interface (forward, inline). */
	getInterfaceLookupScope(): Scope {
		return this.interfaceScope;
	}

	override define(_symbol: Symbol): void {
		throw new Error('Use interfaceScope or implementationScope to define symbols in a unit');
	}

	override resolveLocal(_name: string): Symbol | undefined {
		return undefined;
	}

	override resolve(name: string): Symbol | undefined {
		return this.implementationScope.resolve(name);
	}

	override getSymbols(): Iterable<Symbol> {
		const all: Symbol[] = [];
		all.push(...this.interfaceScope.getSymbols());
		all.push(...this.implementationScope.getSymbols());
		return all;
	}
}

/** Escopo global do workspace — units abertas indexadas por nome. */
export class GlobalScope extends BaseScope {
	readonly kind = ScopeKind.Global as const;
	private readonly unitsByName = new Map<string, Scope>();

	constructor() {
		super('global');
	}

	registerUnit(unitName: string, unitScope: UnitScope): void {
		this.unitsByName.set(unitName.toLowerCase(), unitScope);
	}

	unregisterUnit(unitName: string): void {
		this.unitsByName.delete(unitName.toLowerCase());
	}

	override resolveLocal(name: string): Symbol | undefined {
		const unitScope = this.unitsByName.get(name.toLowerCase());
		if (unitScope !== undefined) {
			return unitScope.resolveLocal(name);
		}
		for (const scope of this.unitsByName.values()) {
			const found = scope.resolveLocal(name);
			if (found !== undefined) {
				return found;
			}
		}
		return super.resolveLocal(name);
	}

	getUnitScope(unitName: string): Scope | undefined {
		return this.unitsByName.get(unitName.toLowerCase());
	}
}
