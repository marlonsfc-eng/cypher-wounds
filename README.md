# Cypher 2 Toolkit

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
- botão na ficha e no HUD do token;
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


## v0.9.1
- Aumenta fontes, espaçamento e tamanho-padrão do painel para melhorar a leitura.
- Descarta o tamanho salvo pela versão anterior uma única vez, preservando a posição escolhida.
- Permite selecionar e inspecionar NPCs, criaturas, companions, communities e vehicles.
- Mostra Health, Level, Damage e Armor para NPCs e criaturas, respeitando os campos nativos do sistema.
- Mantém os controles de wounds exclusivos para personagens de jogador.
- Permite mover, minimizar e restaurar o painel mesmo quando nenhum token está selecionado.
- Amplia os avisos privados do Mestre para recursos monitorados de NPCs e outros atores compatíveis.



