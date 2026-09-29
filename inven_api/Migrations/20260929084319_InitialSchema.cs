using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace inven_api.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "categories",
                columns: table => new
                {
                    categoryID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    categoryName = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.categoryID);
                });

            migrationBuilder.CreateTable(
                name: "Transactions",
                columns: table => new
                {
                    transactionID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    reason = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Transactions", x => x.transactionID);
                });

            migrationBuilder.CreateTable(
                name: "products",
                columns: table => new
                {
                    SKU = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    categoryID = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    productName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    price = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    cost = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    qty = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_products", x => x.SKU);
                    table.ForeignKey(
                        name: "FK_products_categories_categoryID",
                        column: x => x.categoryID,
                        principalTable: "categories",
                        principalColumn: "categoryID");
                });

            migrationBuilder.CreateTable(
                name: "transactionItems",
                columns: table => new
                {
                    idtransactionItemID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    transactionID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SKU = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    categoryID = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    qty = table.Column<int>(type: "int", nullable: false),
                    price = table.Column<decimal>(type: "numeric(10,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transactionItems", x => x.idtransactionItemID);
                    table.ForeignKey(
                        name: "FK_transactionItems_Transactions_transactionID",
                        column: x => x.transactionID,
                        principalTable: "Transactions",
                        principalColumn: "transactionID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_transactionItems_products_SKU",
                        column: x => x.SKU,
                        principalTable: "products",
                        principalColumn: "SKU",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_products_categoryID",
                table: "products",
                column: "categoryID");

            migrationBuilder.CreateIndex(
                name: "IX_transactionItems_SKU",
                table: "transactionItems",
                column: "SKU");

            migrationBuilder.CreateIndex(
                name: "IX_transactionItems_transactionID",
                table: "transactionItems",
                column: "transactionID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "transactionItems");

            migrationBuilder.DropTable(
                name: "Transactions");

            migrationBuilder.DropTable(
                name: "products");

            migrationBuilder.DropTable(
                name: "categories");
        }
    }
}
