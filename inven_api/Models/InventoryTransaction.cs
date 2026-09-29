namespace inven_api.Models;

public class InventoryTransaction
{
    public Guid TransactionId { get; set; }
    public required string Type { get; set; }
    public DateTime Date { get; set; }
    public string? Reason { get; set; }
    public ICollection<TransactionItem> Items { get; set; } = [];
}
