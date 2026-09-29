namespace inven_api.Models;

public class Product
{
    public Guid Sku { get; set; }
    public Guid? CategoryId { get; set; }
    public required string ProductName { get; set; }
    public required string Price { get; set; }
    public required string Cost { get; set; }
    public int Qty { get; set; }
    public Category? Category { get; set; }
    public ICollection<TransactionItem> TransactionItems { get; set; } = [];
}
