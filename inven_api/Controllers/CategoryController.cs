using System.ComponentModel.DataAnnotations;
using inven_api.Data;
using inven_api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace inven_api.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoryController(InventoryDbContext db) : ControllerBase
{
    /// <summary>List all categories.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> List() =>
        Ok(await db.Categories.AsNoTracking().Select(x => new CategoryDto(x.CategoryId, x.CategoryName)).ToListAsync());

    /// <summary>Get a category by ID.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CategoryDto>> Get(Guid id)
    {
        var category = await db.Categories.FindAsync(id);
        return category is null ? NotFound() : Ok(new CategoryDto(category.CategoryId, category.CategoryName));
    }

    /// <summary>Create a category.</summary>
    [HttpPost]
    public async Task<ActionResult<CategoryDto>> Create(CategoryInput input)
    {
        var category = new Category { CategoryId = Guid.NewGuid(), CategoryName = input.CategoryName };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = category.CategoryId }, new CategoryDto(category.CategoryId, category.CategoryName));
    }

    /// <summary>Update a category.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, CategoryInput input)
    {
        var category = await db.Categories.FindAsync(id);
        if (category is null) return NotFound();
        category.CategoryName = input.CategoryName;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Delete a category that has no products.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var category = await db.Categories.FindAsync(id);
        if (category is null) return NotFound();
        if (await db.Products.AnyAsync(x => x.CategoryId == id)) return Conflict("Category is used by products.");
        db.Categories.Remove(category);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

public record CategoryInput(string? CategoryName);
public record CategoryDto(Guid CategoryId, string? CategoryName);
