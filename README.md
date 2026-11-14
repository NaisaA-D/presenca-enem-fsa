# Presença ENEM FSA — 15/11/2026

Dashboard estática para GitHub Pages, com gravação em Google Sheets por Apps Script.

## O que está pronto

- Lista completa de pré-cadastrados, com função ao lado do nome.
- Primeira aba Registrar presença, com dois quadrados: Manhã e Tarde. O código libera a lista da manhã na sessão; a tarde abre automaticamente em 15/11/2026 às 15h30, no horário de São Paulo, para quem possui o link. O serviço de gravação também verifica o horário.
- Inclusão de colaborador pelo mesmo código da chegada, com identificação de quem cadastrou, data e escola opcional.
- Listas separadas Colaboradores e Coordenadores no Sheets, atualizadas a cada gravação.
- Visões por escola, cidade e van; contagem de pessoas únicas; coordenação compartilhada identificada.
- Realocação de colaboradores com mesmo código da chegada e histórico.
- Validação no servidor, controle de conflitos, reenvios idempotentes e exportação CSV.

## Planilha criada

https://docs.google.com/spreadsheets/d/1D3wwscmiKFgJmUhOT98MjuAEQpl0tJdl7Cns4XwP1A0/edit

A planilha contém os pré-cadastros. Todas as presenças começam pendentes. As abas de pessoas impedidas de participar não são retornadas pela API pública. Não publique a planilha inteira: o serviço disponibiliza apenas os dados necessários à dashboard.

## Ativação do Google Sheets

1. Na planilha, abra **Extensões → Apps Script**. Cole `apps-script/Code.gs` no arquivo de código e salve.
2. Em Configurações do projeto → Propriedades do script, defina `SPREADSHEET_ID` como `1D3wwscmiKFgJmUhOT98MjuAEQpl0tJdl7Cns4XwP1A0`.
3. Execute `configurarCodigos` no editor. Autorize na sua conta Google. Volte à planilha para definir um único código de exatamente 4 dígitos, usado tanto na chegada quanto na administração. As propriedades guardam somente hashes com salt.
4. Publique como **Aplicativo da Web**, executando como você, acesso **Qualquer pessoa**. Copie o URL terminado em `/exec` e cole em `apiUrl`, no arquivo `config.js`.
5. Abra a dashboard e faça um teste de gravação com uma pessoa de teste. Confira o registro na aba Historico e as listas Colaboradores/Coordenadores. Remova a presença de teste com o código de chegada. O teste real de integração depende dessa publicação; os testes automatizados usam serviços simulados.

Não use códigos pessoais ou senhas da sua conta. O código único permite marcar chegadas, corrigir presenças, incluir e realocar colaboradores. O nome do operador é informado por ele, sem autenticação individual. Quem possui o link pode visualizar os nomes/escolas e confirmar a tarde após a liberação das 15h30 no dia da ação. As quotas do Apps Script limitam volume e disponibilidade; esta solução não é um sistema de comprovação de identidade.

## Publicação no GitHub

Os arquivos públicos deste projeto já foram enviados para https://github.com/NaisaA-D/presenca-enem-fsa. Não envie `.private`, arquivos de trabalho ou a planilha local. O `.gitignore` já os exclui.

Em **Settings → Pages**, selecione **GitHub Actions**. O workflow `.github/workflows/pages.yml` verifica o código, executa os testes e publica somente os cinco arquivos estáticos copiados para `dist`. O endereço final será informado pelo GitHub quando a implantação terminar.

O código foi enviado ao repositório pela integração GitHub. A ativação do Pages em Settings e a autorização/publicação do Apps Script precisam ser concluídas na conta da proprietária. O site e a integração ainda não tiveram a publicação confirmada.

## Operação

Na primeira aba **Registrar presença**, escolha **Manhã** e informe seu nome e o código uma única vez enquanto a página estiver aberta. Também pode usar **Liberar chegada**. O código fica somente em memória na sessão; navegar pelas abas ou atualizar os dados não pede a senha novamente. Recarregar/fechar a página pede nova liberação. Na lista de presença, o quadrado com `+` registra presença após confirmação; `✓` indica presença salva. Corrigir uma presença exige código da chegada. As presenças inicial e da tarde são independentes.

Em **Adicionar colaborador**, informe nome completo, escola (opcional), quem cadastrou e o código da chegada. Nomes idênticos, desconsiderando acentos, caixa e espaços repetidos, são bloqueados para revisão. Homônimos precisam ser revisados pela organização. Nomes na aba NaoAlocar também são bloqueados quando coincidem. A inclusão não marca presença.

As abas Colaboradores e Coordenadores são visões de saída. A fonte da escala é Pessoas/Escolas/Vans/Alocacoes; novos cadastros são gravados em Inclusoes; presenças e realocações, em Historico. Edite a escala base apenas antes da ação. Durante a ação, use a dashboard para preservar o histórico. Se uma visão de saída não atualizar após uma gravação, execute `atualizarVisoes` — a alteração permanece no histórico.

## Prévia e verificações locais

Node 22 ou mais recente. Sem dependências para o site.

```sh
npm test
npm run check
npm run dev
```

A prévia real da escala usa `http://127.0.0.1:4173/?demo=1` e o arquivo local ignorado `.private/seed.json`. Os códigos de demonstração aparecem no banner e não são aceitos pelo serviço publicado. Marcações da prévia ficam só em memória e desaparecem ao recarregar. O serviço local escuta apenas no próprio computador.

## Estado da entrega

Planilha criada e pré-cadastros verificados. Código preparado e testes locais concluídos. Código enviado ao GitHub. Ativação do Pages, autorização do Apps Script, definição dos códigos e teste de ponta a ponta ainda pendentes. Nenhuma presença real foi registrada.





## Atualização da liberação por horário

Depois de copiar a versão nova de Code.gs para o Apps Script, salve e use Implantar → Gerenciar implantações → Editar (lápis) → Versão: Nova versão → Implantar. Isso mantém o URL atual e o código já definido. Não é necessário executar configurarCodigos novamente.

