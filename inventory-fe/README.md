# Inventory frontend

Next.js frontend for the ASP.NET inventory API in `../inven_api`.

## Run locally

1. Start the API: `dotnet run --project ../inven_api --launch-profile http` (requires its SQL Server connection string).
2. In this folder run `npm install` and `npm run dev`.
3. Open <http://localhost:3000>.

The frontend proxies `/api/*` to `http://localhost:5126` by default. Set `INVENTORY_API_URL` in `.env.local` if the API uses another origin. The backend stores product price and cost as strings; the frontend sends them in that format. Transaction items have no quantity field in the current API, so each selected product creates one item.
