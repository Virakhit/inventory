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
        Ok(await db.Products.AsNoTracking().Select(x => new ProductDto(x.Sku, x.CategoryId, x.ProductName, x.Price, x.Cost)).ToListAsync());

    /// <summary>Get a product by SKU.</summary>
    [HttpGet("{sku:guid}")]
    public async Task<ActionResult<ProductDto>> Get(Guid sku)
    {
        var product = await db.Products.FindAsync(sku);
        return product is null ? NotFound() : Ok(ToDto(product));
    }

    /// <summary>Create a product.</summary>
    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(ProductInput input)
    {
        if (input.CategoryId is Guid categoryId && !await db.Categories.AnyAsync(x => x.CategoryId == categoryId))
            return BadRequest("Category does not exist.");
        var product = new Product { Sku = Guid.NewGuid(), CategoryId = input.CategoryId, ProductName = input.ProductName, Price = input.Price, Cost = input.Cost };
        db.Products.Add(product);
        await db.SaveChangesAsync();
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

    private static ProductDto ToDto(Product x) => new(x.Sku, x.CategoryId, x.ProductName, x.Price, x.Cost);
}

public record ProductInput(Guid? CategoryId, [Required, MinLength(1)] string ProductName,
    [Required] string Price, [Required] string Cost);
public record ProductDto(Guid Sku, Guid? CategoryId, string ProductName, string Price, string Cost);
