# Database schema

This API uses EF Core migrations for its SQL Server schema. The application applies pending migrations when it starts. Set the `ConnectionStrings:Inventory` value for your environment before running it.

For a new database, run the API or apply the migration explicitly from the repository root:

```powershell
dotnet tool restore
dotnet ef database update --project inven_api --startup-project inven_api --configuration Release
```

To record a later model change:

```powershell
dotnet ef migrations add DescribeChange --project inven_api --startup-project inven_api --output-dir Migrations --configuration Release
```

Databases made with the former `EnsureCreated` startup code have no EF migration history. The initial migration cannot be applied over their existing tables. Back up any data before converting one. For a disposable development database, recreate the database and let the application apply the migration. For a database with data to retain, compare its schema with `Migrations/20260929084319_InitialSchema.cs`, reconcile any differences, then baseline that database in `__EFMigrationsHistory` before starting the updated API. Do not mark the migration applied until its schema matches.
