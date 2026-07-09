program SintaxePascalExemplo;

{$mode objfpc}

uses
  SysUtils, Classes;

const
  PI_VALOR = 3.14159;
  LIMITE = 10;

type
  TInteiroPtr = ^Integer;

  TDia = (seg, ter, qua, qui, sex, sab, dom);

  TConjuntoDias = set of TDia;

  TPessoa = record
    Nome : string;
    Idade : Integer;
  end;

  TIntArray = array[0..9] of Integer;

  { Classe de exemplo }

  TContador = class
  private
    FValor : Integer;
  public
    constructor Create;
    destructor Destroy; override;
    procedure Incrementar;
    procedure Somar(AValor : Integer);
    function Valor : Integer;
  end;

var
  i, j : Integer;
  r : Real;
  b : Boolean;
  arr : TIntArray;
  pessoa : TPessoa;
  dias : TConjuntoDias;
  pInt : TInteiroPtr;
  contador : TContador;

{ TContador }

constructor TContador.Create;
begin
  inherited Create;
  FValor := 0;
end;

destructor TContador.Destroy;
begin
  Writeln('Destruindo contador');
  inherited Destroy;
end;

procedure TContador.Incrementar;
begin
  Inc(FValor);
end;

procedure TContador.Somar(AValor : Integer);
begin
  FValor := FValor + AValor;
end;

function TContador.Valor : Integer;
begin
  Result := FValor;
end;

procedure TestarCondicoes(x : Integer);
begin
  if (x > 0) and (x < 10) then
  begin
    Writeln('Entre 1 e 9');
  end
  else if x = 0 then
  begin
    Writeln('Zero');
  end
  else
  begin
    Writeln('Fora do intervalo');
  end;
end;

procedure TestarCase(d : TDia);
begin
  case d of
    seg..sex : Writeln('Dia útil');
    sab, dom : Writeln('Fim de semana');
  else
    Writeln('Desconhecido');
  end;
end;

procedure TestarLoops;
var
  k : Integer;
begin
  k := 0;

  while k < 3 do
  begin
    Writeln('While: ', k);
    Inc(k);
  end;

  repeat
    Dec(k);
    Writeln('Repeat: ', k);
  until k = 0;

  for k := 1 to 3 do
  begin
    Writeln('For: ', k);
  end;
end;

procedure TestarArray;
var
  idx : Integer;
begin
  for idx := 0 to High(arr) do
  begin
    arr[idx] := idx * 2;
  end;

  for idx := 0 to High(arr) do
  begin
    Write(arr[idx], ' ');
  end;

  Writeln;
end;

procedure TestarPonteiro;
begin
  New(pInt);
  pInt^ := 42;
  Writeln('Valor do ponteiro: ', pInt^);
  Dispose(pInt);
end;

procedure TestarExcecao;
begin
  try
    raise Exception.Create('Erro de teste');
  except
    on E : Exception do
    begin
      Writeln('Exceção capturada: ', E.Message);
    end;
  end;
end;

begin
  Writeln('Exemplo de sintaxe Pascal');

  pessoa.Nome := 'Ana';
  pessoa.Idade := 25;

  with pessoa do
  begin
    Writeln('Pessoa: ', Nome, ' idade ', Idade);
  end;

  dias := [seg, ter, qua];

  if seg in dias then
  begin
    Writeln('Segunda está no conjunto');
  end;

  r := PI_VALOR * 2;
  b := (r > 5) or (r < 1);

  Writeln('Real: ', r:0:2);
  Writeln('Boolean: ', b);

  TestarCondicoes(5);
  TestarCase(seg);
  TestarLoops;
  TestarArray;
  TestarPonteiro;
  TestarExcecao;

  contador := TContador.Create;

  try
    contador.Incrementar;
    contador.Somar(10);
    Writeln('Contador: ', contador.Valor);
  finally
    contador.Free;
  end;

  Readln;
end.