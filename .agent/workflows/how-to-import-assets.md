---
description: Guide on creating custom categories and importing assets using dynamic templates
---

# Asset Management: From Category Creation to Bulk Import

This workflow describes the end-to-end process of defining a new asset category with custom attributes and then importing assets into that category using the intelligent template system.

## Phase 1: Create Custom Category

1.  **Navigate to Categories**
    *   Go to **Master Data** > **Categories** in the sidebar.

2.  **Create or Edit Category**
    *   To create new: Click **New Root** or the **+** icon next to a parent category.
    *   To edit existing: Click on the category name in the tree.

3.  **Define Basic Info**
    *   Fill in `Code` (e.g., `DRONE`) and `Name` (e.g., `Drone & Aerial Cam`).
    *   Set `Depreciation` settings if applicable.

4.  **Define Custom Attributes (The "Brain")**
    *   Click on the **Attributes** tab.
    *   Enter the specific details you want to track for this category.
    *   *Example for Drone:* Type `Max Altitude`, press Enter. Type `Battery Life`, press Enter. Type `Camera Resolution`, press Enter.
    *   Click **Save/Update**.

    > **Note:** These attributes are now permanently saved in the database for this category.

## Phase 2: Bulk Import Assets

1.  **Open Import Tool**
    *   Go to the **Assets** page.
    *   Click the **Import** button (top right).

2.  **Download Smart Template**
    *   In the modal, look for **Select Template by Category**.
    *   Choose the category you just created (e.g., `Drone & Aerial Cam`).
    *   Click **Download Template CSV**.
    *   *The system will generate a CSV file specifically for Drones, including columns like `spec_Max Altitude` and `spec_Battery Life`.*

3.  **Fill Data**
    *   Open the CSV file (using Excel, Numbers, or Text Editor).
    *   **Required Columns:** `asset_code`, `name`.
    *   **Custom Columns:** Fill in the `spec_...` columns with your data.
    *   Save the file as `.csv` (Comma Separated Values).

4.  **Upload & Process**
    *   Back in the system, click **Select CSV File**.
    *   Upload your filled CSV.
    *   **Preview:** The system will show a preview table. Ensure rows have a green checkmark.
    *   Click **Import Assets**.

## Phase 3: Verification

1.  **Check List**
    *   The new assets should appear in the Asset List immediately.

2.  **Check Details**
    *   Click on one of the new assets (Edit/View).
    *   Go to the **Specifications** tab (or *Vehicle/Property* tab if applicable).
    *   You should see your custom data (`Max Altitude`, etc.) populated correctly.
