using inven_api.Models;
using Microsoft.EntityFrameworkCore;

namespace inven_api.Data;

public class InventoryDbContext(DbContextOptions<InventoryDbContext> options) : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<InventoryTransaction> Transactions => Set<InventoryTransaction>();
    public DbSet<TransactionItem> TransactionItems => Set<TransactionItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(x => x.CategoryId);
            entity.Property(x => x.CategoryId).HasColumnName("categoryID");
            entity.Property(x => x.CategoryName).HasColumnName("categoryName");
        });
        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasKey(x => x.Sku);
            entity.Property(x => x.Sku).HasColumnName("SKU");
            entity.Property(x => x.CategoryId).HasColumnName("categoryID");
            entity.Property(x => x.ProductName).HasColumnName("productName").IsRequired();
            entity.Property(x => x.Price).HasColumnName("price").IsRequired();
            entity.Property(x => x.Cost).HasColumnName("cost").IsRequired();
            entity.HasOne(x => x.Category).WithMany(x => x.Products).HasForeignKey(x => x.CategoryId);
        });
        modelBuilder.Entity<InventoryTransaction>(entity =>
        {
            entity.ToTable("Transactions");
            entity.HasKey(x => x.TransactionId);
            entity.Property(x => x.TransactionId).HasColumnName("transactionID");
            entity.Property(x => x.Type).HasColumnName("type").IsRequired();
            entity.Property(x => x.Date).HasColumnName("date");
            entity.Property(x => x.Reason).HasColumnName("reason");
        });
        modelBuilder.Entity<TransactionItem>(entity =>
        {
            entity.ToTable("transactionItems");
            entity.HasKey(x => x.IdtransactionItemId);
            entity.Property(x => x.IdtransactionItemId).HasColumnName("idtransactionItemID");
            entity.Property(x => x.TransactionId).HasColumnName("transactionID");
            entity.Property(x => x.Sku).HasColumnName("SKU");
            entity.Property(x => x.CategoryId).HasColumnName("categoryID").IsRequired();
            entity.Property(x => x.Qty).HasColumnName("qty").IsRequired();
            entity.Property(x => x.Price).HasColumnName("price").HasColumnType("numeric(10,2)").IsRequired();
            entity.HasOne(x => x.Transaction).WithMany(x => x.Items).HasForeignKey(x => x.TransactionId);
            entity.HasOne(x => x.Product).WithMany(x => x.TransactionItems).HasForeignKey(x => x.Sku);
        });
    }
}
