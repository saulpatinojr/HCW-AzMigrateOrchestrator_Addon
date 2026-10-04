import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

const sample = resolve("samples/resources-csv/sample-resources.csv");

test("explorer: upload → questionnaire → results → detail → bundle → delete", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("never connects to an Azure tenant")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(sample);
  await expect(page.getByText(/29 data rows/)).toBeVisible();
  await page.getByLabel("Destination region").fill("westus3");
  await page.getByRole("button", { name: "Run assessment" }).click();
  await expect(page.getByRole("heading", { name: "4. Summary" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Need validation")).toBeVisible();
  await page.getByRole("row", { name: /stcontosobillingprod/ }).click();
  await expect(page.getByRole("dialog")).toContainText("azure-storage-mover");
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("tab", { name: "terraform/state-impact/README.md" }).click();
  await expect(page.locator("pre")).toContainText("removed.tf");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download output bundle/ }).click();
  expect((await download).suggestedFilename()).toMatch(/^assessment-[0-9a-f]{8}\.zip$/);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete my data now" }).click();
  await expect(page.getByRole("heading", { name: "4. Summary" })).toBeHidden();
});

test("explorer never asks for credentials and shows the partner panel", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Powered by")).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});
