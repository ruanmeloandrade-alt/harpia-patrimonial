# Acesso do cliente: página completa, sem popup

Data: 16/10/2026.

## Solicitação e decisão

O usuário mostrou a abertura de /cliente/ e rejeitou o formulário pequeno sobre o sistema escurecido. Pediu uma página de login/cadastro com apresentação compatível com a Hárpia e seu público de alto patrimônio. A alteração é exclusiva da entrada do cliente, mantendo a home e as páginas dos imóveis.

## Implementação publicada

Commit gh-pages: c6c1ac9dee0b8729a1611d8ccc43256ab02ab3ab.
Base preservada: 62fb563b7174c7a91df5da0f150af4d4f913a78f.
Somente dois arquivos alterados, conferidos por compare:

- cliente/index.html
- assets/client/access-20261016.css

A rota continua /cliente/, já utilizada pelo botão Área Interna da home. O formulário inicial agora é Acessar minha conta; Primeiro acesso abre o cadastro na mesma página.

O layout ocupa a página inteira. Painel institucional verde sólido com a logo oficial, texto de posicionamento já aprovado e fotografia existente da curadoria. Coluna de formulário em fundo sólido #EEEEF0. Paleta #3D5033/#C3CE94, fontes oficiais Inter/Mermaid locais, campos com altura de 52 px e texto de 15 px no desktop/16 px no mobile, sem escala artificial ou overlay translúcido.

Inclui navegação Voltar ao site, alternância de login/cadastro, exibir/ocultar senha, autofill apropriado, rótulos vinculados aos campos, foco visível, mensagens de erro de continuidade, política de privacidade, termos e ajuda via WhatsApp com contexto da origem. Não há link de recuperação fingindo uma funcionalidade que não existe.

O conteúdo do workspace fica hidden/inert desde o HTML inicial, com CSS crítico no head, e não aparece atrás do formulário nem recebe foco enquanto a página de entrada está visível. O layout não é um dialog, não bloqueia a rolagem do documento e não tem fechamento de modal. Mobile tem composição própria, sem rolagem interna do formulário.

Os formulários mantêm IDs, nomes e integração com a rotina legada existente. Não houve alteração em APIs, banco, RLS, usuários, permissões, domínio, home, rodapé, detalhes de imóveis, integrações ou bundle React. A foto, a marca e as fontes já existiam no repositório. Nenhuma imagem ou fonte de teste foi enviada ao GitHub.

## Verificações executadas

🟢 JavaScript inline aprovado em node --check.
🟢 Testes Chromium locais em 360, 390, 768, 1024, 1366, 1440 e 1920 px, em ambos os modos: largura do documento igual à viewport, formulários dentro da tela, somente um formulário visível, posição relative em vez de modal e workspace oculto.
🟢 Fontes locais oficiais carregadas e apresentação desktop/mobile inspecionada.
🟢 Alternância entre login/cadastro, campos obrigatórios, formato de e-mail e botão exibir/ocultar senha testados.
🟢 Fluxo visual de entrada/retorno com a rotina legada exercitado em armazenamento exclusivamente de teste, sem gravações ou envios em produção.
🟢 Zero erros JavaScript não capturados no cenário de teste.
🟢 Sem JavaScript, o formulário e aviso continuam visíveis e o workspace permanece oculto.
🟢 SHA dos blobs do GitHub confere com os arquivos testados: HTML 218eac70ef22d03a7e5f6e23c5d418fe3e6794dd (apenas newline final omitido), CSS 8b226aa64dd43eacc8738d43ccd545c602076340.

Os testes usaram set_content, recursos oficiais embutidos apenas no documento local e armazenamento em memória exclusivo da execução de QA. O Chromium bloqueia navegação HTTP por política do ambiente; o acesso web ao domínio também falhou. Isso não comprova indisponibilidade do site.

🟠 NÃO VERIFICADO: inspeção direta da página no domínio e comportamento com contas reais. Não confundir teste de apresentação com teste de autenticação.

## Pendência séria preexistente, separada do design

A rotina legada saveClientAccount desta página grava dados do cadastro no navegador e não valida a senha no servidor. A nova apresentação não torna esse mecanismo uma autenticação real. Esta etapa não alterou a rotina para evitar mudanças de backend ou migração de contas não solicitadas.

Antes de usar esta área com dados privados, integrar o login/cadastro à autenticação real e verificar a autorização na camada de dados. Não afirmar que o acesso está seguro ou funcional de ponta a ponta apenas porque a apresentação foi publicada. Esse achado é específico da página cliente/index.html, não uma auditoria de todos os módulos de autenticação do projeto.

## Continuidade e publicação confirmada

Preservar a publicação estática da /cliente/ ao integrar futuramente o aplicativo React. O novo CSS está isolado em #access-gate e não substitui estilos do workspace. Os arquivos completos de produção estão na gh-pages e não foram mergeados na main.

A publicação automática já configurada foi confirmada na execução 38925411293: build, report-build-status e deploy concluídos com status completed e conclusion success. O job de implantação 117055656266 também teve a etapa Deploy to GitHub Pages concluída com sucesso. Nenhum workflow foi criado, alterado ou disparado manualmente.
