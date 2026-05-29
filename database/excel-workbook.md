# Excel Workbook Database

The application now uses `backend/data/biteafruit.xlsx` as the database.

Each original database table is represented by one worksheet:

- `users`
- `customer_profiles`
- `subscription_plans`
- `subscriptions`
- `health_logs`
- `deliveries`
- `payments`
- `invoices`
- `inventory`
- `whatsapp_messages`
- `notifications`
- `support_tickets`

## How It Works

- The backend creates the workbook automatically on startup.
- `python seed.py` recreates the workbook with demo data.
- List-style fields such as fruits, add-ons, allergies, and delivery days are stored as JSON text in Excel cells.
- Dates are stored as ISO strings so they remain readable and portable.

## Editing Data Manually

You can open `backend/data/biteafruit.xlsx` in Excel and edit rows directly. Keep these rules:

- Do not rename worksheet names or header columns.
- Keep `id` values unique within each sheet.
- Save and close Excel before running API writes, because Excel may lock the file.
- Use exact role values: `admin`, `customer`, `delivery_partner`.
- Use exact statuses such as `active`, `paused`, `pending`, `paid`, `delivered`.

## Production Note

Excel is convenient for small business operations and manual review, but it is not ideal for heavy concurrent traffic. If traffic grows, migrate the same sheets to a server database.
