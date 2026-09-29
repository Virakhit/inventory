using System.ComponentModel.DataAnnotations;
using inven_api.Data;
using inven_api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace inven_api.Controllers;

[ApiController]
[Route("api/stock")]
public class StockController(InventoryDbContext db) : ControllerBase
{
    /// <summary>Adjust stock and record the movement atomically.</summary>
    [HttpPatch("adjust")]
    public async Task<ActionResult<StockAdjustmentResult>> Adjust(StockAdjustmentInput input)
    {
        if (input.ProductId == Guid.Empty || input.Quantity == 0 || input.Quantity == int.MinValue ||
            string.IsNullOrWhiteSpace(input.Reason))
            return BadRequest("Provide productId, a nonzero quantity, and a reason.");

        await using var transaction = await db.Database.BeginTransactionAsync();
        var product = await db.Products.AsNoTracking().SingleOrDefaultAsync(x => x.Sku == input.ProductId);
        if (product is null) return NotFound("Product does not exist.");

        var changed = await db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE products SET qty = qty + {input.Quantity}
            WHERE SKU = {input.ProductId} AND qty + CAST({input.Quantity} AS bigint) >= 0
              AND qty + CAST({input.Quantity} AS bigint) <= 2147483647
            """);
        if (changed != 1) return Conflict("Insufficient stock or stock quantity exceeds the allowed range.");

        db.Transactions.Add(new InventoryTransaction
        {
            TransactionId = Guid.NewGuid(), Type = input.Quantity > 0 ? "IN" : "OUT",
            Date = DateTime.UtcNow, Reason = input.Reason.Trim(),
            Items = [new TransactionItem
            {
                IdtransactionItemId = Guid.NewGuid(), Sku = input.ProductId,
                CategoryId = product.CategoryId?.ToString() ?? "uncategorized",
                Qty = Math.Abs(input.Quantity), Price = 0
            }]
        });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        var quantity = await db.Products.AsNoTracking().Where(x => x.Sku == input.ProductId).Select(x => x.Qty).SingleAsync();
        return Ok(new StockAdjustmentResult(input.ProductId, quantity));
    }
}

public record StockAdjustmentInput(Guid ProductId, int Quantity, [Required] string Reason);
public record StockAdjustmentResult(Guid ProductId, int Quantity);
