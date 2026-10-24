unit DefinitionDependency;

interface

type
  TDependencyType = record
    Value: Integer;
  end;

function GetDefinition: Integer;

implementation

function GetDefinition: Integer;
begin
  Result := 42;
end;

end.
