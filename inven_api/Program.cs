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
    scope.ServiceProvider.GetRequiredService<InventoryDbContext>().Database.EnsureCreated();

app.MapControllers();
app.Run();
