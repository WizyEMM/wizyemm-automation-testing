import { Page, Locator, expect, test } from "@playwright/test";
import { waitForAdminTable } from "../adminaccounts.helpers";

/** Pagination footer of the Admin Accounts table (range text, page buttons, size changer, quick jumper). */
export class AdminAccountsPagination {
  private readonly page: Page;
  private readonly root: Locator;
  private readonly tableRows: Locator;
  private readonly rangeText: Locator;
  private readonly pageNumbers: Locator;
  private readonly prevButton: Locator;
  private readonly nextButton: Locator;
  private readonly sizeChanger: Locator;
  private readonly sizeCombobox: Locator;
  private readonly quickJumperInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByRole("list").filter({
      has: page.getByRole("listitem", { name: "Next Page" }),
    });
    // Data rows have cells; the header row only has columnheaders.
    this.tableRows = page
      .getByRole("table")
      .getByRole("row")
      .filter({ has: page.getByRole("cell") });
    this.rangeText = this.root.getByText(/^\d+\s*-\s*\d+\s*of\s*\d+$/);
    this.pageNumbers = this.root.getByRole("listitem", { name: /^\d+$/ });
    this.prevButton = this.root
      .getByRole("listitem", { name: "Previous Page" })
      .getByRole("button");
    this.nextButton = this.root
      .getByRole("listitem", { name: "Next Page" })
      .getByRole("button");
    this.sizeCombobox = this.root.getByRole("combobox", { name: "Page Size" });
    // The combobox input is covered by the displayed value, so clicks go to its list item.
    this.sizeChanger = this.root
      .getByRole("listitem")
      .filter({ has: page.getByRole("combobox", { name: "Page Size" }) });
    this.quickJumperInput = this.root.getByRole("textbox");
  }

  // ---------- Scenarios ----------

  /** All rows fit on one page: rows match total, one page, arrows disabled, size changer still works. */
  async verifySinglePage(total: number, pageSizes: readonly number[]): Promise<void> {
    const [defaultSize, nextSize] = pageSizes;

    test.info().annotations.push({
      type: "note",
      description: `Only ${total} admin(s) on this instance, single-page validation only`,
    });

    await test.step("single page: rows match total, one page, arrows disabled", async () => {
      await this.verifyState(1, defaultSize, total);
      await expect(this.quickJumperInput).toHaveCount(0);
    });

    await test.step("single page: page size options and switching size keeps rows", async () => {
      await this.verifyPageSizeOptions(pageSizes);
      await this.selectPageSize(nextSize);
      await this.verifyState(1, nextSize, total);
      await this.selectPageSize(defaultSize);
      await this.verifyState(1, defaultSize, total);
    });
  }

  /** Rows span several pages: page buttons, arrows, every page size and the quick jumper. */
  async verifyMultiPage(total: number, pageSizes: readonly number[]): Promise<void> {
    const [defaultSize] = pageSizes;
    const lastPage = Math.ceil(total / defaultSize);

    await test.step("first page shows default page size", async () => {
      await this.verifyState(1, defaultSize, total);
    });

    await test.step("numbered buttons and arrows navigate between pages", async () => {
      await this.goToPage(2);
      await this.verifyState(2, defaultSize, total);
      await this.clickPrev();
      await this.verifyState(1, defaultSize, total);
      await this.clickNext();
      await this.verifyState(2, defaultSize, total);
      await this.goToPage(1);
    });

    await test.step("each page size option lists the right number of rows", async () => {
      await this.verifyPageSizeOptions(pageSizes);
      for (const size of pageSizes) {
        await this.selectPageSize(size);
        await this.verifyState(1, size, total);
      }
      await this.selectPageSize(defaultSize);
    });

    await test.step("quick jumper goes to the typed page", async () => {
      await this.jumpToPage(lastPage);
      await this.verifyState(lastPage, defaultSize, total);
    });
  }

  // ---------- Actions ----------

  /** Total admins as reported by the range text ("1 - 2 of 2"). */
  async getTotalCount(): Promise<number> {
    await waitForAdminTable(this.page);
    await expect(this.rangeText).toBeVisible();
    const match = (await this.rangeText.innerText()).match(/of\s*(\d+)/);
    expect(match, "pagination range text should contain 'of <total>'").not.toBeNull();
    return Number(match![1]);
  }

  async goToPage(pageNumber: number): Promise<void> {
    await this.pageItem(pageNumber).click();
    await waitForAdminTable(this.page);
  }

  async clickNext(): Promise<void> {
    await this.nextButton.click();
    await waitForAdminTable(this.page);
  }

  async clickPrev(): Promise<void> {
    await this.prevButton.click();
    await waitForAdminTable(this.page);
  }

  async selectPageSize(size: number): Promise<void> {
    const label = this.sizeLabel(size);
    if ((await this.sizeChanger.innerText()).includes(label)) return;

    await this.openSizeDropdown();
    // The option is the only element titled with a size other than the current one.
    await this.page.getByTitle(label).click();
    await expect(this.sizeChanger).toContainText(label);
    await waitForAdminTable(this.page);
  }

  async jumpToPage(pageNumber: number): Promise<void> {
    await expect(this.quickJumperInput).toBeVisible();
    await this.quickJumperInput.fill(String(pageNumber));
    await this.quickJumperInput.press("Enter");
    await waitForAdminTable(this.page);
  }

  // ---------- Assertions ----------

  /** Range text, row count, active page, page count and arrow states for one page. */
  async verifyState(pageNumber: number, pageSize: number, total: number): Promise<void> {
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    const start = (pageNumber - 1) * pageSize + 1;
    const end = Math.min(pageNumber * pageSize, total);

    await expect(this.rangeText).toHaveText(
      new RegExp(`^\\s*${start}\\s*-\\s*${end}\\s*of\\s*${total}\\s*$`)
    );
    await expect(this.tableRows).toHaveCount(end - start + 1);
    // Ant marks the current page only visually (no aria-current), so the class is the only signal.
    await expect(this.pageItem(pageNumber)).toHaveClass(/ant-pagination-item-active/);
    // The highest page number shown is always the last page, even when middle pages collapse.
    await expect(this.pageNumbers.last()).toHaveAccessibleName(String(lastPage));

    if (pageNumber === 1) await expect(this.prevButton).toBeDisabled();
    else await expect(this.prevButton).toBeEnabled();

    if (pageNumber === lastPage) await expect(this.nextButton).toBeDisabled();
    else await expect(this.nextButton).toBeEnabled();
  }

  async verifyPageSizeOptions(sizes: readonly number[]): Promise<void> {
    await this.openSizeDropdown();
    for (const size of sizes) {
      // Options render in a popup at the end of the body; .last() skips the displayed value
      // of the same title inside the pagination.
      await expect(this.page.getByTitle(this.sizeLabel(size)).last()).toBeVisible();
    }
    await this.page.keyboard.press("Escape");
    await expect(this.sizeCombobox).toHaveAttribute("aria-expanded", "false");
  }

  // ---------- Private ----------

  private pageItem(pageNumber: number): Locator {
    return this.root.getByRole("listitem", { name: String(pageNumber), exact: true });
  }

  private sizeLabel(size: number): string {
    return `${size} / page`;
  }

  private async openSizeDropdown(): Promise<void> {
    await this.sizeChanger.click();
    await expect(this.sizeCombobox).toHaveAttribute("aria-expanded", "true");
  }
}
