export enum SubprogramKind {
	Procedure = 'procedure',
	Function = 'function',
	Constructor = 'constructor',
	Destructor = 'destructor',
}

export enum Visibility {
	Public = 'public',
	Private = 'private',
	Protected = 'protected',
	Published = 'published',
	StrictPrivate = 'strict private',
	StrictProtected = 'strict protected',
}

export enum SubprogramModifier {
	Virtual = 'virtual',
	Override = 'override',
	Overload = 'overload',
	Abstract = 'abstract',
	Reintroduce = 'reintroduce',
	Static = 'static',
	Inline = 'inline',
	Dynamic = 'dynamic',
	Message = 'message',
}

export enum ParameterDirection {
	Value = 'value',
	Var = 'var',
	Const = 'const',
	Out = 'out',
}

export enum ASTNodeKind {
	// Estrutura
	Program = 'Program',
	Unit = 'Unit',
	UnitSection = 'UnitSection',
	UsesClause = 'UsesClause',
	TypeSection = 'TypeSection',
	ConstSection = 'ConstSection',
	VarSection = 'VarSection',
	Block = 'Block',

	// Declarações
	ProcedureDeclaration = 'ProcedureDeclaration',
	FunctionDeclaration = 'FunctionDeclaration',
	MethodDeclaration = 'MethodDeclaration',
	ClassDeclaration = 'ClassDeclaration',
	RecordDeclaration = 'RecordDeclaration',
	InterfaceDeclaration = 'InterfaceDeclaration',
	VariableDeclaration = 'VariableDeclaration',
	ParameterDeclaration = 'ParameterDeclaration',
	FormalParameterType = 'FormalParameterType',
	ConstantDeclaration = 'ConstantDeclaration',
	TypeAliasDeclaration = 'TypeAliasDeclaration',
	EnumTypeDeclaration = 'EnumTypeDeclaration',
	PropertyDeclaration = 'PropertyDeclaration',
	LabelDeclaration = 'LabelDeclaration',

	// Tipos (sintaxe)
	Identifier = 'Identifier',
	NamedType = 'NamedType',
	GenericType = 'GenericType',
	ClassType = 'ClassType',
	RecordType = 'RecordType',
	InterfaceType = 'InterfaceType',
	ArrayType = 'ArrayType',
	PointerType = 'PointerType',
	SubprogramType = 'SubprogramType',
	EnumType = 'EnumType',
	SetType = 'SetType',
	StringType = 'StringType',
	RecordVariant = 'RecordVariant',
	RecordVariantCase = 'RecordVariantCase',

	// Statements
	Statement = 'Statement',
	AssignStatement = 'AssignStatement',
	CallStatement = 'CallStatement',
	IfStatement = 'IfStatement',
	WhileStatement = 'WhileStatement',
	RepeatStatement = 'RepeatStatement',
	ForStatement = 'ForStatement',
	CaseStatement = 'CaseStatement',
	CaseBranch = 'CaseBranch',
	WithStatement = 'WithStatement',
	TryStatement = 'TryStatement',
	GotoStatement = 'GotoStatement',
	ReturnStatement = 'ReturnStatement',
	RaiseStatement = 'RaiseStatement',
	EmptyStatement = 'EmptyStatement',

	// Expressions
	Expression = 'Expression',
	IdentifierExpression = 'IdentifierExpression',
	LiteralExpression = 'LiteralExpression',
	BinaryExpression = 'BinaryExpression',
	UnaryExpression = 'UnaryExpression',
	MemberExpression = 'MemberExpression',
	IndexExpression = 'IndexExpression',
	CallExpression = 'CallExpression',
	InheritedExpression = 'InheritedExpression',
	SelfExpression = 'SelfExpression',
	CastExpression = 'CastExpression',
	DerefExpression = 'DerefExpression',
	ParenExpression = 'ParenExpression',
}
