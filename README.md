# Cypher 2 Toolkit

## v0.23.2

- Remove a associação automática das Player Intrusions com Types antigos de Numenera.
- Importa todas as intrusões somente como Abilities, organizadas em `General Abilities → Player Intrusions` no compêndio.
- Mantém a categoria de ficha `Player Intrusion`, o custo automático de 1 XP e a alocação manual pelo Mestre.

## v0.23.1

- Corrige a categoria das intrusões para o nome exato `Player Intrusion` usado na ficha.
- Migra automaticamente Items já importados no compêndio, no mundo e nas fichas.
- Torna o distribuidor permanentemente acessível nas configurações do módulo e dentro do importador.

## v0.23.0

- Adiciona suporte a Player Intrusions importadas como Abilities, com confirmação, gasto automático de 1 XP e publicação no chat.
- O importador passa a aceitar Journals e a resolver links de Abilities para regras importadas.
- Inclui um distribuidor pós-importação para adicionar as três intrusões corretas a cada ficha sem duplicações.
- Reconhece coleções de Player Intrusions para Glaive, Nano, Wright e Delve; Tinkering Vision pode ser substituída por Ingenious Repurposing.
- Weapon Break usa uma conversão direta para Cypher 2 e aponta para o Journal de Damage to Objects da página 300.

## v0.22.0

- Adiciona um Plano da Cena ao painel de Oportunidades de Cypher, salvo diretamente na Scene ativa.
- Permite preparar gatilho narrativo, personagem, Pool e custo; todos os campos são opcionais e podem ser definidos no momento da oferta.
- Inclui reordenação por arrastar, oferta com campos pré-preenchidos e estados pendente, oferecido, aceito, recusado, entregue ou ignorado.
- Exibe no painel Wounds & Resources um contador discreto das oportunidades pendentes da cena.

## v0.4.1

- Corrige o uso de habilidades importadas no Foundry VTT 13.
- O botão de uso chama diretamente o motor All-in-One Roll do sistema Cypher.
- Mantém compatibilidade com a automação de wounds e special rolls.

# Cypher 2 Toolkit — v0.1.0

Módulo comunitário para Foundry VTT que reúne:

1. controle de ferimentos menores, moderados e graves do Cypher 2;
2. importação privada de Types, Foci e Abilities a partir de JSON;
3. criação automática de compêndios no mundo.

O módulo **não contém textos de livros**. O conteúdo é fornecido pelo próprio usuário por meio de um arquivo JSON local.

## Compatibilidade inicial

- Foundry VTT 12–14;
- sistema `cyphersystem` de mrkwnzl;
- esta versão é uma beta e precisa ser testada em uma cópia do mundo antes do uso definitivo.

## Instalação manual em servidor

1. Descompacte o ZIP.
2. Envie a pasta `cypher-2-toolkit` para `Data/modules/` do servidor.
3. Reinicie o Foundry.
4. Ative **Cypher 2 Toolkit** em Gerenciar módulos.

A pasta final deve ficar assim:

```text
Data/modules/cypher-2-toolkit/module.json
```

## Ferimentos

O módulo acrescenta a personagens:

- ferimentos menores;
- ferimentos moderados;
- ferimentos graves;
- escalonamento automático quando uma trilha está cheia;
- cálculo da penalidade global;
- Active Effect informativo;
- botão na ficha e painel universal de Wounds & Resources;
- limites configuráveis por personagem;
- opção de marcar o token como derrotado.

Se a versão antiga `cypher-wounds` tiver sido usada, os dados de ferimentos são copiados automaticamente para o novo namespace quando o mundo é aberto por um GM.

### Limitação atual

A penalidade de ferimentos é registrada e exibida, mas ainda não altera automaticamente todas as rolagens do sistema Cypher. Essa integração será desenvolvida após testes no servidor real.

## Importador

Abra:

```text
Configurações do jogo → Configurar definições → Cypher 2 Toolkit → Abrir importador
```

O importador aceita JSON com as seguintes coleções:

- `abilities`: criadas como Items do tipo `ability`;
- `types`, `foci` e `descriptors`;
- `skills`: criadas como Items do tipo `skill`;
- `cyphers`: criados como Items do tipo `cypher`.

Os compêndios são criados no mundo:

- `Cypher 2 — Abilities`;
- `Cypher 2 — Types`;
- `Cypher 2 — Foci`.
- `Cypher 2 — Random Cyphers`.

Types e Foci podem listar habilidades relacionadas no campo `abilities`. O importador cria links para os Items correspondentes.

### Modos

**Atualizar e acrescentar:** atualiza entradas com o mesmo `sourceId` e cria as novas.

**Substituir:** remove somente entradas anteriormente gerenciadas pelo Toolkit naquele compêndio e recria o conteúdo importado. Entradas manuais não são apagadas.

## JSON de exemplo

O importador possui um botão para baixar o exemplo. Uma cópia também está em:

```text
samples/content-example.json
```

Campos mínimos por entrada:

```json
{
  "id": "ability.example",
  "name": "Example Ability"
}
```

Para habilidades, também podem ser usados:

- `description` em HTML;
- `cost`;
- `pool`;
- `tier`;
- `damage`;
- `additionalSteps`;
- `document` ou `data` para fornecer dados completos do Item do sistema.

## API para macros

Após o carregamento:

```js
game.cypher2Toolkit.openImporter();
```

Importação programática:

```js
await game.cypher2Toolkit.importContent(payload, {
  mode: "update",
  prefix: "cypher-2"
});
```

Ferimentos:

```js
await game.cypher2Toolkit.wounds.take(actor, "minor");
await game.cypher2Toolkit.wounds.heal(actor);
await game.cypher2Toolkit.wounds.open(actor);
```

## Segurança

Faça backup do mundo antes da primeira importação. Teste inicialmente com um JSON pequeno contendo um Type, um Focus e algumas Abilities.

## Organização automática dos compêndios

As habilidades importadas são organizadas em pastas internas no compêndio:

- `Types / <nome do Type> / Tier <n>`
- `Foci / <nome do Focus> / Tier <n>`
- `General Abilities`

O JSON pode declarar a origem com o campo `origin`. Quando ele não existe, o importador tenta inferir a origem pelo identificador da habilidade e pelos Types/Foci incluídos no mesmo arquivo.


## v0.2.3 hotfix

Disabled the experimental automatic wound-hindrance hook because it could prevent the Cypher System roll dialog from opening. Wound penalties remain displayed for manual application while a safer integration is developed.


## v0.3.1
- Move the wound hindrance notice to a compact badge in the roll window title bar.
- Imported abilities now rely on the Cypher System native roll/pay button.
- Remove the redundant Toolkit play button that could intercept ability clicks.
- Add a chat-only fallback only when the system sheet has no native roll control.


## Special rolls (Cypher 2)
- Natural 17 on a successful damage-dealing attack: +1 damage automatically.
- Natural 18 on a successful damage-dealing attack: +2 damage automatically.
- Natural 19: choose +3 damage (damage attacks only) or a minor effect.
- Natural 20: choose +4 damage (damage attacks only) or a major effect; the action's Pool cost is restored automatically.
- The effect picker lists the common combat effects from the Cypher 2 rules and permits an agreed custom effect.


## v0.4.2
- Adds import and drag-and-drop application for Descriptors.
- Descriptors can apply Pool increases and prompt for the granted trained skill.


## v0.4.3
- Restores the Cypher System native Roll Item button for imported abilities on Foundry v13.
- Imported abilities now use itemRollMacro, restoring automatic base cost, Edge, Effort, Pool payment, and other native roll behavior.
- Existing imported abilities are normalized automatically when the world starts.


## v0.4.4
- Fixes imported ability buttons on Foundry v13.
- Stores ability costs as strings, as required by the v13 Cypher System itemRollMacro (`0`, `2`, `3+`, etc.).
- Migrates existing imported abilities automatically when the world starts.
- Leaves the native Roll Item button and its event listener untouched.


## v0.4.5
- Replaces the wide token wound tracks with three compact circular meters inside the token.
- Uses cyan, amber, and crimson for minor, moderate, and major wounds.
- Each meter shows current wounds, progress toward its capacity, and a I/II/III severity label.
- Shows global hindrance as a separate −N badge.
- Keeps the old external circle tracks as an optional legacy display mode.


## v0.5.0
- Converts NPC attack damage into wounds: 1–4 Minor, 5–8 Moderate, 9+ Major.
- Adds the conversion and an Apply Wound button to NPC attack chat cards.
- The chat button applies the wound to targeted PCs, controlled PCs, or the user's assigned character.
- Adds direct Minor, Moderate, and Major wound buttons to the Token HUD for PCs.


## v0.5.1
- Fixes Token HUD wound controls on Foundry v13 by resolving the token through `hud.object`.
- Falls back between the right and left HUD columns.
- Prevents duplicate wound controls after HUD re-renders.


## v0.6.0
- Removes NPC attack damage conversion permanently.
- Adds a universal floating wound applicator between the player list and macro hotbar.
- Target priority: targeted PCs, controlled PCs, assigned character, or sole owned PC.
- Buttons apply Minor, Moderate, Major, or heal one wound.
- Shift-click on I/II/III removes one wound of that severity.
- Panel is collapsible, draggable, and saves its position per browser.


## v0.6.1
- Fixes the universal applicator Heal button.
- Fixes Shift-click wound removal in the universal applicator.


## v0.7.0
- Removes wound indicators from tokens and centralizes them in the universal wound panel.
- Shows current/capacity, colored wound circles, and global hindrance for each selected or targeted PC.
- Makes the panel resizable with a drag handle and saves its size per browser.
- Adds a reset-size button while retaining drag, collapse, target priority, apply, heal, and Shift-click removal.


## v0.7.1
- Refreshes the universal wound panel immediately after wound, Actor, or Item changes.
- Replaces capacity-sized dot rows with one severity marker and current/capacity values.
- Permanently removes visual wound overlays from tokens and cleans up old overlays.
- Adds a button beside each character name to open the full wound control.
- Uses native CSS resizing with ResizeObserver persistence for Foundry v13.


## v0.7.2
- Hides the legacy Hale/Hurt/Impaired/Debilitated damage-track row from PC sheets.
- Keeps the recovery roll and recovery checkboxes intact.
- Renames the section header from Damage & Recovery to Recovery.


## v0.8.0
- Adds native Skill compendium import support.
- Skill JSON entries are imported as Cypher System `skill` Items with Trained rating and the native Roll Item controls.
- Adds support for campaign-specific skill libraries such as the Numenera skill list.


## v0.9.0
- Mostra discretamente XP e Reservas de Potência, Velocidade e Intelecto no painel universal de wounds.
- Mostra a Reserva adicional somente quando ela está habilitada na ficha.
- Mantém a ficha nativa como único local de edição: o painel é apenas informativo.
- Registra mudanças de XP e Reservas em mensagens privadas visíveis somente aos Mestres.
- Identifica o personagem, o usuário responsável e os valores anterior e posterior.
- Evita mensagens duplicadas quando há mais de um Mestre conectado.
- Permite desativar separadamente a exibição no painel e os avisos privados nas configurações do módulo.

## v0.10.0
- Adiciona os botões Rallying, Treatment e Recovery diretamente à seção Recovery da ficha de PC.
- Rallying valida e gasta Potência sem aplicar Edge, removendo automaticamente o wound escolhido.
- Treatment usa a Roll Engine nativa, preenche a skill Healing e só remove o wound após sucesso.
- Recovery consome exatamente a opção escolhida, mantém a rolagem nativa e automatiza os efeitos sobre wounds.
- Inclui Last Action +2 e as escolhas de uma hora e dez horas, incluindo o teste adicional de Potência para Major Wound.

## v0.10.1
- Abre uma janela de distribuição após cada rolagem de Recovery.
- Permite alocar o resultado entre Potência, Velocidade e Intelecto sem ultrapassar o total rolado ou o máximo de cada Reserva.
- Exibe os pontos distribuídos e restantes em tempo real e aplica todas as alterações em uma única atualização da ficha.

## v0.11.0
- Adiciona um Assistente de Oportunidades de Cypher visível somente para Mestres.
- Classifica a tabela de cyphers não manifestos por contexto e apresenta três sugestões ponderadas para a cena.
- Mantém guardados, histórico antirrepetição e posição/minimização do painel por cliente.
- Localiza Items correspondentes no mundo e em compêndios sem duplicar suas descrições no módulo.
- Permite lembrar o Mestre, adicionar o Item à ficha, enviar em segredo aos donos do personagem ou publicar a oportunidade no chat.

## v0.11.1
- Adiciona suporte à coleção `cyphers` no importador privado de JSON.
- Cria Items nativos do tipo `cypher` em um compêndio próprio e preserva página, tags, efeito e explicação nos flags do Toolkit.
- O Assistente de Oportunidades passa a usar a explicação específica importada como sugestão narrativa, quando disponível.

## v0.12.0
- Substitui a abertura permanente do Assistente de Oportunidades por um botão discreto junto ao campo de chat, visível somente para o Mestre.
- O painel agora pode ser fechado completamente e reaberto pelo botão do chat, mantendo posição, contextos, guardados e histórico.
- Aceita uma tradução narrativa em `explanationPtBr`, sem traduzir nomes, efeitos mecânicos ou o conteúdo dos Items.

## v0.12.1
- Corrige a inserção do botão do Assistente de Oportunidades no chat do Foundry VTT 13.
- Localiza o formulário de mensagem na interface completa e tenta novamente após o sidebar terminar de renderizar.

## v0.12.2
- Torna o botão do Assistente independente da estrutura HTML interna do sidebar.
- Anexa o acesso diretamente à interface do Foundry e o posiciona junto ao campo de mensagem, com fallback visível mesmo quando o chat não pode ser localizado.

## v0.13.0
- Adiciona ao painel Wounds & Resources um sorteio de PCs presentes na cena.
- O clique comum ignora tokens ocultos e derrotados, evita peso duplicado por ator, seleciona e marca o resultado como alvo do GM e centraliza a câmera.
- Shift + clique permite escolher os participantes antes do sorteio.
- Publica o resultado no chat geral para todos os jogadores.

## v0.14.0
- Compacta o painel Wounds & Resources e posiciona XP, Pools e hindrance ao lado do nome do ator.
- Transforma os três indicadores de wounds em botões: clique adiciona e Shift + clique remove a severidade correspondente.
- Remove a linha redundante de alvo e a barra inferior de aplicação e cura.
- Ajusta automaticamente a altura do painel e mantém apenas o redimensionamento horizontal.

## v0.15.0
- Move o acesso ao Assistente de Oportunidades do chat para o cabeçalho de Wounds & Resources, ao lado do sorteio de personagem.
- Ofertas privadas ou públicas agora permitem que o dono do personagem aceite ou recuse; aceitar adiciona o cypher automaticamente à ficha.
- Entregas diretas enviam uma confirmação aos donos do personagem e aos Mestres.
- Monitora o limite nativo `system.equipment.cypherLimit` sempre que um cypher entra na ficha.
- Ao exceder o limite, avisa personagem e Mestres e pede ao dono para descartar cyphers ou confirmar que permanecerá acima do limite.

## v0.15.1
- Aplica o limite nativo apenas a cyphers manifestos.
- Cyphers narrativos marcados com `flags.cypher-2-toolkit.randomCypher` continuam como Items distribuíveis, mas não contam para o limite e não aparecem na escolha de descarte.
- O importador só concede essa isenção quando a entrada JSON declara explicitamente `randomCypher: true`.

## v0.16.0
- Remove as explicações narrativas pré-definidas dos cartões do Assistente de Oportunidades; eles mostram apenas o efeito mecânico.
- A janela de oferta passa a pedir uma descrição narrativa livre, o Pool usado e um custo personalizado, com 1 ponto como padrão.
- Aceitar uma oferta verifica e desconta Might, Speed ou Intellect sem aplicar Edge antes de adicionar o Item.
- Entregas diretas também descontam o custo e notificam o portador; se o Pool for insuficiente, o cypher não é entregue.
- A cópia recebida na ficha registra a narrativa e o custo daquela oportunidade e omite a explicação narrativa genérica do compêndio.

## v0.17.0

- Adiciona um importador genérico de campanhas privadas nas configurações do Toolkit.
- O GM seleciona um único JSON no navegador; não é necessário instalar uma segunda pasta de módulo na hospedagem.
- Assets incorporados ao JSON são enviados pelo File Picker para a pasta de dados do mundo.
- Cria e atualiza Journals, Actors, Items, RollTables e Scenes por identificadores estáveis, sem duplicar documentos.
- Expõe `game.cypher2Toolkit.openCampaignImporter()` para macros.

### Importar uma campanha privada

Abra **Configurações do jogo → Configurar definições → Cypher 2 Toolkit → Importar campanha privada**, escolha o JSON local e clique em **Importar/Atualizar campanha**. Faça primeiro um backup do mundo. O usuário GM precisa ter permissão de upload de arquivos na hospedagem.

## v0.18.0

- Adiciona o Assistente de Combate para Foundry VTT 13.
- No início de cada rodada, publica uma declaração Fast/Normal/Last com botões controlados pelos donos dos personagens.
- Reorganiza o fluxo real do Combat Tracker por categorias, preservando os valores de iniciativa e a ordem relativa dentro de cada grupo.
- Resolve automaticamente quando todos respondem; o Mestre pode resolver com respostas pendentes, que assumem Normal.
- Permite reabrir as escolhas e retorna imediatamente à ordem normal enquanto a declaração está aberta.
- Mostra indicadores Fast e Last no Combat Tracker e publica um lembrete compacto no início de cada turno.
- Inclui configurações separadas para declarações, NPCs e lembretes.

## v0.19.0

- Adiciona integração opcional com o Combat Carousel do Carolingian UI 4.x.
- Mostra Minor, Moderate e Major Wounds como três indicadores compactos e coloridos em cada cartão de PC.
- Exibe a Hindrance quando ela for maior que zero.
- Atualiza os cartões imediatamente após wounds, alterações de capacidade, Items ou mudanças no combate.
- Acompanha reconstruções e clones produzidos pelo carousel sem modificar arquivos do Carolingian UI.
- Permite escolher a visibilidade entre todos, Mestre e donos, ou somente Mestre.
- Mantém a barra de recurso/Health configurada no Carolingian funcionando separadamente.

## v0.20.0

- Torna opcional a descrição narrativa ao oferecer uma Combat Opportunity.
- Entrega oportunidades como Abilities na categoria `Combat Opportunities` e migra automaticamente as cópias antigas que ainda estavam em Equipment.
- O primeiro uso registra a oportunidade como conhecida; usos posteriores pedem confirmação e custam 1 XP.
- Remove da ficha os controles visuais Subtle/Manifest e adiciona aos cyphers um botão para publicar o Item e seu efeito no chat.
- Remove todos os atalhos de wounds do Token HUD; o painel Wounds & Resources permanece como controle central.
- Substitui o cartão Fast/Normal/Last do chat por popups sincronizados para jogadores e Mestre.
- Torna a integração do Carolingian resiliente à criação tardia, substituição e clonagem dos cartões do Combat Carousel.

## v0.20.1

- Substitui a declaração coletiva por uma pergunta individual e direta para cada personagem; clicar em Fast, Normal ou Last confirma imediatamente a escolha.
- Mantém para o Mestre uma janela separada apenas para acompanhar as respostas e resolver as pendentes como Normal.
- Corrige atualizações assíncronas concorrentes que podiam repetir personagens várias vezes no painel Wounds & Resources.
- Remove integralmente a integração de wounds com o Combat Carousel do Carolingian UI, preservando o carousel original sem indicadores adicionais.

## v0.20.2

- Serializa as respostas de declaração no cliente coordenador para impedir que confirmações simultâneas se sobrescrevam.
- Força a renderização completa do monitor do Mestre depois de cada resposta, evitando contadores e estados visuais desatualizados.
- Diferencia a notificação de envio da confirmação efetiva recebida pelo Mestre.

## v0.20.3

- Declara oficialmente o namespace de socket do módulo no manifesto com `"socket": true`.
- Corrige a entrega real das declarações Fast/Normal/Last dos jogadores ao cliente do Mestre.
- Habilita corretamente o mesmo canal já usado pelas decisões remotas de Combat Opportunities.

## v0.21.0

- Reformula o Assistente de Oportunidades como uma janela ampla com cards maiores, melhor contraste e layout responsivo em duas ou três colunas.
- Adiciona navegação separada entre Sugestões, Catálogo completo e Guardados.
- Adiciona busca instantânea por nome, contexto, efeito importado ou situação narrativa.
- Inclui uma sugestão narrativa autoral e específica em português para cada um dos 86 cyphers, evitando traduções literais do campo `explanation`.
- Permite destacar visualmente um card antes de oferecer, guardar ou consultar o Item correspondente.

## v0.21.1

- Torna os contextos filtros estritos das novas sugestões, em vez de apenas aumentarem probabilisticamente o peso de determinados cyphers.
- Quando vários contextos estão ativos, cada sugestão precisa corresponder a pelo menos um deles.
- Aumenta a tipografia dos cards, efeitos, ideias narrativas, filtros, abas e controles auxiliares.

## v0.24.0

- Remove custos de Pool, custos de XP, aceite/recusa e aprendizado permanente dos Opportunity Cyphers.
- Entrega cada oportunidade diretamente como uma Ability na categoria `Combat Opportunities`, sem contar para o Cypher Limit.
- Ao usar uma oportunidade, publica seu efeito no chat e remove automaticamente o Item da ficha.
- Migra oportunidades já entregues para o novo formato descartável.
- Adiciona distribuição automática por tipo de cena, com um cypher diferente para cada PC presente.
- Adiciona o modo `Escolha 1 de 3`, que apresenta três cards adequados a cada jogador e adiciona somente a opção escolhida.

## v0.25.0

- Adiciona um Gerenciador de Ícones nas configurações do módulo, exclusivo do Mestre.
- Organiza Opportunity Cyphers, Manifest Cyphers e Artifacts em abas separadas e inclui busca por nome.
- Localiza os ícones nativos já incluídos no Foundry e gera sugestões com base no nome e na categoria de cada Item.
- Permite trocar qualquer sugestão pelo seletor de arquivos do Foundry e aplicar as escolhas em lote.
- Preserva imagens personalizadas por padrão e pode atualizar também as cópias dos Items que já estão nas fichas.
- Guarda as associações escolhidas para que futuras importações reutilizem automaticamente os mesmos ícones.


## v0.9.1
- Aumenta fontes, espaçamento e tamanho-padrão do painel para melhorar a leitura.
- Descarta o tamanho salvo pela versão anterior uma única vez, preservando a posição escolhida.
- Permite selecionar e inspecionar NPCs, criaturas, companions, communities e vehicles.
- Mostra Health, Level, Damage e Armor para NPCs e criaturas, respeitando os campos nativos do sistema.
- Mantém os controles de wounds exclusivos para personagens de jogador.
- Permite mover, minimizar e restaurar o painel mesmo quando nenhum token está selecionado.
- Amplia os avisos privados do Mestre para recursos monitorados de NPCs e outros atores compatíveis.



