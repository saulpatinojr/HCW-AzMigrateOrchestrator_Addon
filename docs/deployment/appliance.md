# Appliance edition (upstream)

The live Azure appliance edition (Entra ID sign-in, Azure Resource Graph discovery, `validateMoveResources`, Azure Resource Mover execution, and Azure Container Apps deployment) lives upstream in [`saulpatinojr/HCW-MigrateOrchestrator_App`](https://github.com/saulpatinojr/HCW-MigrateOrchestrator_App) (`docs/deployment/enterprise.md` and `infrastructure/terraform/`).

This repository (`saulpatinojr/HCW-MigrateOrchestrator_AddOn`) is the upload-only, in-memory lab edition (ADR-0008, ADR-0028) and has no cloud connectivity or execution surface by design.
