.PHONY: app install build test e2e lab package clean
app: ; bash scripts/bootstrap-app.sh
install: ; npm ci
build: ; npm run build
test: ; npm test
e2e: ; npm run e2e
lab: build ; npm run lab:api
package: ; bash scripts/package-repository.sh
clean: ; npm run clean && rm -rf .local hcw-azmigrateorchestrator-addon.zip
