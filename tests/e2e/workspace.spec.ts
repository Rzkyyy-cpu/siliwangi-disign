import { test, expect } from "@playwright/test";
import path from "node:path";

const fixture = path.resolve("tests/fixtures/sample.pdf");

test("signing workspace loads and validates required metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Dokumen resmi,")).toBeVisible();
  await page.getByRole("button", { name: "Sign Dokumen", exact: true }).click();
  await page.locator('input[type="file"]').first().setInputFiles(fixture);
  await page.getByPlaceholder("Nama lengkap").fill("Ayu Siliwangi");
  await page.getByPlaceholder("Contoh: Ketua Program Studi").fill("Ketua");
  await page.getByPlaceholder("Nama institusi").fill("Universitas Siliwangi");
  await page.getByPlaceholder("Minimal 8 karakter").fill("password-uts");
  await expect(page.getByRole("button", { name: /Tandatangani dokumen/ })).toBeEnabled();
});
