#!/usr/bin/env python3
import argparse, json, sys

def main():
    p = argparse.ArgumentParser(description='Evaluate deterministic review-finding disposition inputs.')
    p.add_argument('--fix-closes', choices=['yes','no','unknown'], required=True)
    p.add_argument('--disputed', action='store_true')
    p.add_argument('--obsolete', action='store_true')
    p.add_argument('--new-head', action='store_true')
    args = p.parse_args()
    if args.obsolete:
        state, action = 'OBSOLETE', 'acknowledge and resolve the thread'
    elif args.disputed:
        state, action = 'DISPUTED', 'reply with evidence and a counter-proposal; do not infer a defect from suspicion'
    elif args.fix_closes == 'yes':
        state, action = 'FIXED', 'acknowledge and resolve; continue with current-head gates'
    elif args.fix_closes == 'no':
        state, action = 'NOT_FIXED', 'explain the remaining failure path, correct when authorized, then request re-review'
    else:
        state, action = 'EVIDENCE_GAP', 'request only the evidence needed to decide closure'
    print(json.dumps({'state': state, 'action': action, 'head_changed': args.new_head}, indent=2))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
