using System.ComponentModel.DataAnnotations;
using inven_api.Data;
using inven_api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace inven_api.Controllers;

[ApiController]
[Route("api/transactions")]
public class TransactionController(InventoryDbContext db) : ControllerBase
{
    /// <summary>List transactions with their items.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TransactionDto>>> List() =>
        Ok((await db.Transactions.AsNoTracking().Include(x => x.Items).ToListAsync()).Select(ToDto));

    /// <summary>Get a transaction and its items by ID.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TransactionDto>> Get(Guid id)
    {
        var transaction = await db.Transactions.AsNoTracking().Include(x => x.Items)
            .SingleOrDefaultAsync(x => x.TransactionId == id);
        return transaction is null ? NotFound() : Ok(ToDto(transaction));
    }

    /// <summary>Create a transaction with one or more product items.</summary>
    [HttpPost]
    public async Task<ActionResult<TransactionDto>> Create(TransactionInput input)
    {
        var items = input.Items ?? [];
        if (items.Count == 0) return BadRequest("At least one item is required.");
        var type = input.Type?.ToUpperInvariant();
        if (type is not ("IN" or "OUT")) return BadRequest("Type must be IN or OUT.");
        if (string.IsNullOrWhiteSpace(input.Reason)) return BadRequest("Reason is required.");
        if (items.Any(x => x.Sku == Guid.Empty || string.IsNullOrWhiteSpace(x.CategoryId)))
            return BadRequest("Each item requires SKU and categoryID.");
        if (items.Any(x => x.Qty <= 0 || x.Price < 0 || x.Price > 99999999.99m || x.Price != decimal.Round(x.Price, 2)))
            return BadRequest("Each item requires a positive qty and a price between 0 and 99999999.99 with at most two decimal places.");
        var skus = items.Select(x => x.Sku).Distinct().ToArray();
        if (await db.Products.CountAsync(x => skus.Contains(x.Sku)) != skus.Length)
            return BadRequest("One or more products do not exist.");

        await using var stockChange = await db.Database.BeginTransactionAsync();
        foreach (var group in items.GroupBy(x => x.Sku))
        {
            var quantity = group.Sum(x => (long)x.Qty);
            if (quantity > int.MaxValue) return BadRequest("Quantity exceeds the allowed range.");
            var delta = type == "IN" ? (int)quantity : -(int)quantity;
            var changed = await db.Database.ExecuteSqlInterpolatedAsync($"""
                UPDATE products SET qty = qty + {delta}
                WHERE SKU = {group.Key} AND qty + CAST({delta} AS bigint) >= 0
                  AND qty + CAST({delta} AS bigint) <= 2147483647
                """);
            if (changed != 1) return Conflict("Insufficient stock or stock quantity exceeds the allowed range.");
        }

        var transaction = new InventoryTransaction
        {
            TransactionId = Guid.NewGuid(), Type = type, Date = DateTime.UtcNow, Reason = input.Reason.Trim(),
            Items = items.ConvertAll(x => new TransactionItem
            {
                IdtransactionItemId = Guid.NewGuid(), Sku = x.Sku, CategoryId = x.CategoryId,
                Qty = x.Qty, Price = x.Price
            })
        };
        db.Transactions.Add(transaction);
        await db.SaveChangesAsync();
        await stockChange.CommitAsync();
        return CreatedAtAction(nameof(Get), new { id = transaction.TransactionId }, ToDto(transaction));
    }

    /// <summary>Historical stock movements cannot be deleted.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        return await db.Transactions.AnyAsync(x => x.TransactionId == id)
            ? Conflict("Stock history cannot be deleted.") : NotFound();
    }

    private static TransactionDto ToDto(InventoryTransaction x) => new(x.TransactionId, x.Type, x.Date, x.Reason,
        [.. x.Items.Select(i => new TransactionItemDto(i.IdtransactionItemId, i.TransactionId, i.Sku, i.CategoryId, i.Qty, i.Price))]);
}

public record TransactionItemInput(Guid Sku, [Required] string CategoryId, int Qty, decimal Price);
public record TransactionInput([Required, MinLength(1)] string Type, DateTime Date, string? Reason,
    [Required] List<TransactionItemInput> Items);
public record TransactionItemDto(Guid IdtransactionItemId, Guid TransactionId, Guid Sku, string CategoryId, int Qty, decimal Price);
public record TransactionDto(Guid TransactionId, string Type, DateTime Date, string? Reason, List<TransactionItemDto> Items);
