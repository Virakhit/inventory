using System.ComponentModel.DataAnnotations;
using inven_api.Data;
using inven_api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace inven_api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductController(InventoryDbContext db) : ControllerBase
{
    /// <summary>List all products.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductDto>>> List() =>
        Ok(await db.Products.AsNoTracking().Select(x => new ProductDto(x.Sku, x.CategoryId, x.ProductName, x.Price, x.Cost, x.Qty)).ToListAsync());

    /// <summary>Get a product by SKU.</summary>
    [HttpGet("{sku:guid}")]
    public async Task<ActionResult<ProductDto>> Get(Guid sku)
    {
        var product = await db.Products.FindAsync(sku);
        return product is null ? NotFound() : Ok(ToDto(product));
    }

    /// <summary>Products with fewer than five units in stock.</summary>
    [HttpGet("low-stock")]
    public async Task<ActionResult<IEnumerable<ProductDto>>> LowStock() =>
        Ok(await db.Products.AsNoTracking().Where(x => x.Qty < 5)
            .Select(x => new ProductDto(x.Sku, x.CategoryId, x.ProductName, x.Price, x.Cost, x.Qty)).ToListAsync());

    /// <summary>Create a product.</summary>
    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(ProductInput input)
    {
        if (input.CategoryId is Guid categoryId && !await db.Categories.AnyAsync(x => x.CategoryId == categoryId))
            return BadRequest("Category does not exist.");
        var product = new Product { Sku = Guid.NewGuid(), CategoryId = input.CategoryId, ProductName = input.ProductName, Price = input.Price, Cost = input.Cost, Qty = input.Qty };
        await using var transaction = await db.Database.BeginTransactionAsync();
        db.Products.Add(product);
        if (input.Qty > 0)
            db.Transactions.Add(new InventoryTransaction
            {
                TransactionId = Guid.NewGuid(), Type = "IN", Date = DateTime.UtcNow,
                Reason = "Initial stock", Items = [new TransactionItem
                {
                    IdtransactionItemId = Guid.NewGuid(), Sku = product.Sku,
                    CategoryId = input.CategoryId?.ToString() ?? "uncategorized", Qty = input.Qty, Price = 0
                }]
            });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return CreatedAtAction(nameof(Get), new { sku = product.Sku }, ToDto(product));
    }

    /// <summary>Update a product.</summary>
    [HttpPut("{sku:guid}")]
    public async Task<IActionResult> Update(Guid sku, ProductInput input)
    {
        var product = await db.Products.FindAsync(sku);
        if (product is null) return NotFound();
        if (input.CategoryId is Guid categoryId && !await db.Categories.AnyAsync(x => x.CategoryId == categoryId))
            return BadRequest("Category does not exist.");
        product.CategoryId = input.CategoryId;
        product.ProductName = input.ProductName;
        product.Price = input.Price;
        product.Cost = input.Cost;
        if (product.Qty != input.Qty) return BadRequest("Use PATCH /api/stock/adjust to change stock.");
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Delete a product that has no transaction items.</summary>
    [HttpDelete("{sku:guid}")]
    public async Task<IActionResult> Delete(Guid sku)
    {
        var product = await db.Products.FindAsync(sku);
        if (product is null) return NotFound();
        if (await db.TransactionItems.AnyAsync(x => x.Sku == sku)) return Conflict("Product is used by transactions.");
        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static ProductDto ToDto(Product x) => new(x.Sku, x.CategoryId, x.ProductName, x.Price, x.Cost, x.Qty);
}

public record ProductInput(Guid? CategoryId, [Required, MinLength(1)] string ProductName,
    [Required] string Price, [Required] string Cost, [Range(0, int.MaxValue)] int Qty);
public record ProductDto(Guid Sku, Guid? CategoryId, string ProductName, string Price, string Cost, int Qty);
