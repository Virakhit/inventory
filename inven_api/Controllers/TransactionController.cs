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
        if (items.Any(x => x.Sku == Guid.Empty || string.IsNullOrWhiteSpace(x.CategoryId)))
            return BadRequest("Each item requires SKU and categoryID.");
        var skus = items.Select(x => x.Sku).Distinct().ToArray();
        if (await db.Products.CountAsync(x => skus.Contains(x.Sku)) != skus.Length)
            return BadRequest("One or more products do not exist.");

        var transaction = new InventoryTransaction
        {
            TransactionId = Guid.NewGuid(), Type = input.Type, Date = input.Date, Reason = input.Reason,
            Items = items.Select(x => new TransactionItem
            {
                IdtransactionItemId = Guid.NewGuid(), Sku = x.Sku, CategoryId = x.CategoryId
            }).ToList()
        };
        db.Transactions.Add(transaction);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = transaction.TransactionId }, ToDto(transaction));
    }

    /// <summary>Delete a transaction and its items.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var transaction = await db.Transactions.Include(x => x.Items).SingleOrDefaultAsync(x => x.TransactionId == id);
        if (transaction is null) return NotFound();
        db.TransactionItems.RemoveRange(transaction.Items);
        db.Transactions.Remove(transaction);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static TransactionDto ToDto(InventoryTransaction x) => new(x.TransactionId, x.Type, x.Date, x.Reason,
        x.Items.Select(i => new TransactionItemDto(i.IdtransactionItemId, i.TransactionId, i.Sku, i.CategoryId)).ToList());
}

public record TransactionItemInput(Guid Sku, [Required] string CategoryId);
public record TransactionInput([Required, MinLength(1)] string Type, DateTime Date, string? Reason,
    [Required] List<TransactionItemInput> Items);
public record TransactionItemDto(Guid IdtransactionItemId, Guid TransactionId, Guid Sku, string CategoryId);
public record TransactionDto(Guid TransactionId, string Type, DateTime Date, string? Reason, List<TransactionItemDto> Items);
