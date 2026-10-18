#!/usr/bin/env python3
"""Apply the source trigger-entry fix to the two existing Pages bundles.

The deployed internal bundle contains bulk actions not yet present in main.
Keep those bytes intact instead of replacing the live application with an
older build. Inputs are hash-locked and each replacement must occur once.
Usage: python3 scripts/patch-pipeline-trigger-entrypoints.py ../harpia-published
"""

import hashlib
import json
from pathlib import Path
import sys


BUILDS = [
    {
        "file": "index-DuJgOasb.js",
        "sha256": "0cbfd94e020f01558976216ef2e819f7525eab47ac82658843bf3195e2666df8",
        "css": "X", "stage": "V", "triggers": "Ne", "leads": "Ee",
        "automation": "O", "mode": 'O&&R==="triggers"', "open": "on",
    },
    {
        "file": "index-CHNbIMwl.js",
        "sha256": "c6fce198ea0adadb396918d56f6f7c38fcc933955b9158682dd09e12026c5e32",
        "css": "Q", "stage": "oe", "triggers": "Ce", "leads": "ke",
        "automation": "I", "mode": "I", "open": "Me",
    },
]


def patch(build, source):
    x, stage, count, leads, automation, mode, opener = (
        build[k] for k in ("css", "stage", "triggers", "leads", "automation", "mode", "open")
    )
    title_children = (
        f's.jsx("strong",{{children:{stage}.name}}),'
        f's.jsx("span",{{children:{automation}?`${{{count}.length}} gatilho${{{count}.length===1?"":"s"}}`:'
        f'`${{{leads}.length}} lead${{{leads}.length===1?"":"s"}}`}})'
    )
    header_old = f'className:{x}.columnHeader,children:[s.jsxs("div",{{children:[{title_children}]}})'
    header_new = (
        f'className:{x}.columnHeader,children:[s.jsx("div",{{children:{mode}&&a?'
        's.jsxs("button",{type:"button",'
        f'"aria-label":`Adicionar gatilho em ${{{stage}.name}}`,'
        'style:{display:"flex",alignItems:"center",gap:"inherit",border:0,padding:0,'
        'background:"transparent",color:"inherit",font:"inherit",textAlign:"left",cursor:"pointer"},'
        f'onClick:event=>{{event.stopPropagation();{opener}({stage}.id)}},children:[{title_children}]}}):'
        f's.jsxs(s.Fragment,{{children:[{title_children}]}})}})'
    )
    empty_children = (
        'children:[s.jsx("strong",{children:"Sem gatilhos nesta etapa"}),'
        's.jsx("span",{children:"Adicione o primeiro gatilho aqui."})]'
    )
    empty_old = f's.jsxs("div",{{className:{x}.stageTriggerEmpty,{empty_children}}})'
    empty_new = (
        f's.jsxs(a?"button":"div",{{className:{x}.stageTriggerEmpty,'
        f'...a?{{type:"button","aria-label":`Adicionar o primeiro gatilho em ${{{stage}.name}}`,'
        'style:{cursor:"pointer",font:"inherit"},'
        f'onClick:event=>{{event.stopPropagation();{opener}({stage}.id)}}}}:{{}},{empty_children}}})'
    )
    body_old = f'className:{x}.stageAutomationBody,children:'
    body_new = (
        f'className:{x}.stageAutomationBody,'
        f'onClick:event=>{{a&&event.target===event.currentTarget&&{opener}({stage}.id)}},children:'
    )
    for before, after in [(header_old, header_new), (empty_old, empty_new), (body_old, body_new)]:
        if source.count(before) != 1:
            raise ValueError(f'{build["file"]}: expected exactly one match: {before[:100]}')
        source = source.replace(before, after, 1)
    return source.encode()


def main():
    root = Path(sys.argv[1]).resolve()
    outputs = []
    # Validate all inputs before writing anything.
    for build in BUILDS:
        data = (root / "assets" / build["file"]).read_bytes()
        if hashlib.sha256(data).hexdigest() != build["sha256"]:
            raise ValueError(f'Unexpected base bundle: {build["file"]}')
        result = patch(build, data.decode())
        digest = hashlib.sha256(result).hexdigest()[:12]
        outputs.append((build["file"], f"index-pipeline-triggers-{digest}.js", result))
    changed = []
    for old, new, result in outputs:
        (root / "assets" / new).write_bytes(result)
        for html in root.rglob("*.html"):
            before = html.read_bytes()
            after = before.replace(f"/assets/{old}".encode(), f"/assets/{new}".encode())
            if after != before:
                html.write_bytes(after)
                changed.append(str(html.relative_to(root)))
    print(json.dumps({"bundles": [{"old": old, "new": new, "bytes": len(data)} for old, new, data in outputs], "entrypoints": sorted(set(changed))}, indent=2))


if __name__ == "__main__":
    main()
