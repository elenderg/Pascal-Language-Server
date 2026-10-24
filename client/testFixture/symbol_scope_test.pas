procedure TrocarValores(A: integer; var B: integer);
var
  Temporario: integer;
begin
  Temporario := A;
  A := B;
  B := Temporario;
end;

function CalcularSoma(A: integer; B: integer): integer;
begin
  CalcularSoma := A + B;
end;

function MaiorValor(A, B: integer): integer;
begin
  if A > B then
    MaiorValor := A
  else
    MaiorValor := B;
end;
