.PHONY: install build test rules goldens lab package clean docker
install: ; npm ci
build: ; npm run build
test: ; npm test
rules: ; npm run rules:validate
goldens: ; npm run goldens:update
lab: build ; npm run lab:api
docker: ; docker compose up --build
package: ; bash scripts/package-repository.sh
clean: ; npm run clean && rm -rf .local hcw-azmigrateorchestrator-addon.zip
