using System.Diagnostics;
using inven_api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Inventory API",
        Version = "v1",
        Description = "Manage categories, products, and inventory transactions."
    });
    var xmlPath = Path.Combine(AppContext.BaseDirectory, "inven_api.xml");
    options.IncludeXmlComments(xmlPath);
});
builder.Services.AddDbContext<InventoryDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Inventory")
        ?? throw new InvalidOperationException("Connection string 'Inventory' is not configured.")));

var app = builder.Build();
app.UseSwagger();
app.UseSwaggerUI(options => options.SwaggerEndpoint("/swagger/v1/swagger.json", "Inventory API v1"));
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
    db.Database.EnsureCreated();
    db.Database.ExecuteSqlRaw("""
        IF OBJECT_ID(N'transactionItems', N'U') IS NOT NULL AND COL_LENGTH(N'transactionItems', N'qty') IS NULL
            ALTER TABLE transactionItems ADD qty int NOT NULL CONSTRAINT DF_transactionItems_qty DEFAULT (1);
        IF OBJECT_ID(N'transactionItems', N'U') IS NOT NULL AND COL_LENGTH(N'transactionItems', N'price') IS NULL
            ALTER TABLE transactionItems ADD price numeric(10,2) NOT NULL CONSTRAINT DF_transactionItems_price DEFAULT (0);
        """);
}

app.MapControllers();
if (app.Environment.IsDevelopment())
{
    app.Lifetime.ApplicationStarted.Register(() =>
    {
        var address = app.Urls.FirstOrDefault(url => url.StartsWith("http://localhost:", StringComparison.OrdinalIgnoreCase));
        if (address is null)
            return;

        try
        {
            Process.Start(new ProcessStartInfo($"{address.TrimEnd('/')}/swagger") { UseShellExecute = true });
        }
        catch (Exception exception)
        {
            app.Logger.LogWarning(exception, "Could not open Swagger UI in the browser.");
        }
    });
}
app.Run();
