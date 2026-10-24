program WithRecordTest;

type
  TCor = (Vermelho, Verde, Azul);
  TEstado = (Solteiro, Casado);
  TPessoa = record
    Idade: Integer;
    Altura: Real;
    CorFavorita: TCor;
    Estado: TEstado;
  end;

var
  PessoaAtual: TPessoa;

procedure ExibirPessoa(Pessoa: TPessoa);
begin
  with Pessoa do
  begin
    case CorFavorita of
      Vermelho: Write('Vermelho');
      Verde: Write('Verde');
      Azul: Write('Azul')
    end;
  end;
end;

begin
  PessoaAtual.Idade := 35;
  PessoaAtual.Altura := 1.75;
end.
