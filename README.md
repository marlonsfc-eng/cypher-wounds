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

O importador aceita JSON com até três coleções:

- `abilities`: criadas como Items do tipo `ability`;
- `types`: criados como Journal Entries;
- `foci`: criados como Journal Entries.

Os compêndios são criados no mundo:

- `Cypher 2 — Abilities`;
- `Cypher 2 — Types`;
- `Cypher 2 — Foci`.

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
