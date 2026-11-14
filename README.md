# Presença ENEM FSA — 15/11/2026

Dashboard estática para GitHub Pages, com gravação em Google Sheets por Apps Script.

## O que está pronto

- Lista completa de pré-cadastrados, com função ao lado do nome.
- Presença inicial protegida pelo código compartilhado; presença da tarde aberta a quem possui o link.
- Inclusão de colaborador pelo mesmo código da chegada, com identificação de quem cadastrou, data e escola opcional.
- Listas separadas Colaboradores e Coordenadores no Sheets, atualizadas a cada gravação.
- Visões por escola, cidade e van; contagem de pessoas únicas; coordenação compartilhada identificada.
- Realocação de colaboradores com código de administração separado e histórico.
- Validação no servidor, controle de conflitos, reenvios idempotentes e exportação CSV.

## Planilha criada

https://docs.google.com/spreadsheets/d/1D3wwscmiKFgJmUhOT98MjuAEQpl0tJdl7Cns4XwP1A0/edit

A planilha contém os pré-cadastros. Todas as presenças começam pendentes. As abas de pessoas impedidas de participar não são retornadas pela API pública. Não publique a planilha inteira: o serviço disponibiliza apenas os dados necessários à dashboard.

## Ativação do Google Sheets

1. Na planilha, abra **Extensões → Apps Script**. Cole `apps-script/Code.gs` no arquivo de código e salve.
2. Em Configurações do projeto → Propriedades do script, defina `SPREADSHEET_ID` como `1D3wwscmiKFgJmUhOT98MjuAEQpl0tJdl7Cns4XwP1A0`.
3. Execute `configurarCodigos` no editor. Autorize na sua conta Google. Volte à planilha para responder aos dois diálogos: código da chegada (mínimo 8 caracteres) e código administrativo diferente (mínimo 12). As propriedades guardam somente hashes com salt.
4. Publique como **Aplicativo da Web**, executando como você, acesso **Qualquer pessoa**. Copie o URL terminado em `/exec` e cole em `apiUrl`, no arquivo `config.js`.
5. Abra a dashboard e faça um teste de gravação com uma pessoa de teste. Confira o registro na aba Historico e as listas Colaboradores/Coordenadores. Remova a presença de teste com o código de chegada. O teste real de integração depende dessa publicação; os testes automatizados usam serviços simulados.

Não use códigos pessoais ou senhas da sua conta. O código de chegada permite marcar chegadas, corrigir presenças e incluir colaboradores. O nome do operador é informado por ele, sem autenticação individual. Quem possui o link pode visualizar os nomes/escolas e confirmar a tarde. As quotas do Apps Script limitam volume e disponibilidade; esta solução não é um sistema de comprovação de identidade.

## Publicação no GitHub

Crie um repositório novo `presenca-enem-fsa` na conta NaisaA-D e envie os arquivos públicos deste projeto. Não envie `.private`, arquivos de trabalho ou a planilha local. O `.gitignore` já os exclui.

Em **Settings → Pages**, selecione **GitHub Actions**. O workflow `.github/workflows/pages.yml` verifica o código, executa os testes e publica somente os cinco arquivos estáticos copiados para `dist`. O endereço final será informado pelo GitHub quando a implantação terminar.

O conector disponível não cria repositórios. A criação do repositório e a autorização/publicação do Apps Script precisam ser concluídas na conta da proprietária. Nenhuma publicação foi realizada automaticamente.

## Operação

Use **Liberar chegada** para informar seu nome e o código. O código fica somente em memória na sessão. Na lista de presença, o quadrado com `+` registra presença após confirmação; `✓` indica presença salva. Corrigir uma presença exige código da chegada. As presenças inicial e da tarde são independentes.

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

Planilha criada e pré-cadastros verificados. Código preparado e testes locais concluídos. Publicação no GitHub, autorização do Apps Script, definição dos códigos e teste de ponta a ponta ainda pendentes. Nenhuma presença real foi registrada.
