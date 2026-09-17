# Casos mínimos para `validateCatalogSnapshot`

- snapshot vazio → zero findings;
- dois itens ativos com o mesmo código normalizado → `duplicate-active-code`;
- unidade sem `parentId` → `unit-without-parent`;
- unidade com `parentId` inexistente → `unit-invalid-parent`;
- item não-unidade com `parentId` → `non-unit-with-parent`;
- empreendimento vendido com unidade não vendida → `sold-development-with-unsold-units`;
- empreendimento vendido com todas as unidades vendidas → sem finding desse tipo;
- item soft-deleted não participa das verificações de código/pai.

Transições esperadas:

- `draft -> published|sold`;
- `published -> paused|sold`;
- `paused -> published|sold`;
- `sold` sem saída.
