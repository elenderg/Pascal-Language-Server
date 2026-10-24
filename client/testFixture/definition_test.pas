program DefinitionTest;

uses
  DefinitionMiddle;

var
  Answer: Integer;
  TypedValue: TDependencyType;

begin
  Answer := GetDefinition;
  TypedValue := Default(TDependencyType);
end.
