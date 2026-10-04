#!/usr/bin/env python3
import argparse, json, sys
from pathlib import Path

WRITE_VERBS = {'write','create','update','delete','remove','merge','push','apply','deploy','execute','edit','patch','mutate'}

def main():
    p = argparse.ArgumentParser(description='Audit a GitHub Copilot MCP JSON source file for basic review-safety signals.')
    p.add_argument('path')
    args = p.parse_args()
    path = Path(args.path)
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
    except Exception as exc:
        print(f'ERROR: invalid JSON: {exc}', file=sys.stderr)
        return 2
    servers = data.get('mcpServers')
    if not isinstance(servers, dict):
        print('ERROR: mcpServers object is required', file=sys.stderr)
        return 2
    warnings = []
    for name, cfg in sorted(servers.items()):
        if not isinstance(cfg, dict):
            warnings.append(f'{name}: server config is not an object')
            continue
        tools = cfg.get('tools', [])
        if tools == ['*'] or tools == '*':
            warnings.append(f'{name}: wildcard tool allowlist')
        if isinstance(tools, list):
            for tool in tools:
                low = str(tool).lower()
                parts = {part for part in low.replace('-', '_').split('_') if part}
                if parts.intersection(WRITE_VERBS) and not low.endswith(('_get','_list','_read','_search','_fetch','_query','_details','_definitions')):
                    warnings.append(f'{name}: review tool name looks write-capable: {tool}')
        argsv = cfg.get('args', [])
        if isinstance(argsv, list):
            joined = ' '.join(str(x).lower() for x in argsv)
            if 'github-mcp-server' in joined and '--read-only' not in joined:
                warnings.append(f'{name}: GitHub MCP server command is not explicitly read-only')
            if '@sha256:' not in joined and ('docker run' in joined or any('docker' == str(x).lower() for x in argsv)):
                warnings.append(f'{name}: container image may not be digest-pinned')
    print(json.dumps({'servers': len(servers), 'warnings': warnings}, indent=2))
    return 1 if warnings else 0

if __name__ == '__main__':
    raise SystemExit(main())
