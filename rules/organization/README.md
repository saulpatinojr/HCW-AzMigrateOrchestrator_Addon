# Organizational rule overlays

Files in this directory are loaded **after** `rules/azure/` and may override vendor rules for the
same `resourceType` by carrying a higher `precedence` (overlays default to 100; vendor rules use 10).
Overlays are how an organization records exceptions ("we never use Azure Resource Mover for VMs with
PCI scope") without editing the vendor-derived corpus. They are part of the trusted rule set and are
never editable by public demo users (requirement §11).

`example.overlay.json.disabled` shows the shape. Rename it to `*.json` to activate it.
