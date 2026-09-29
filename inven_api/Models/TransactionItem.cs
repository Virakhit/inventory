namespace inven_api.Models;

public class TransactionItem
{
    public Guid IdtransactionItemId { get; set; }
    public Guid TransactionId { get; set; }
    public Guid Sku { get; set; }
    public required string CategoryId { get; set; }
    public int Qty { get; set; }
    public decimal Price { get; set; }
    public InventoryTransaction Transaction { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
