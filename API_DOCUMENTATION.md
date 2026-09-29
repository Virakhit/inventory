# เอกสาร Inventory API

API สำหรับจัดการหมวดหมู่ สินค้า และรายการเคลื่อนไหวสต็อก ตัวอย่างนี้ใช้ Base URL `http://localhost:5126` ตามโปรไฟล์ `http` ของโครงการ (โปรไฟล์ `https` ใช้ `https://localhost:7217`)

- Swagger UI: `http://localhost:5126/swagger`
- OpenAPI JSON: `http://localhost:5126/swagger/v1/swagger.json`
- Header สำหรับคำขอที่มี JSON body: `Content-Type: application/json`
- Header ที่แนะนำเมื่อต้องการ JSON response: `Accept: application/json`
- โค้ดปัจจุบันไม่ได้กำหนดการยืนยันตัวตน จึงไม่มี `Authorization` header ที่จำเป็น
- `{id}` และ `{sku}` ใน URL เป็น UUID/GUID ตัวอย่าง UUID ด้านล่างใช้แทนค่าจริงที่ API ส่งกลับ

## สรุป endpoint

| Method | URL | รายละเอียด | สำเร็จ | ข้อผิดพลาดที่รองรับ |
| --- | --- | --- | --- | --- |
| GET | `/api/categories` | ดูหมวดหมู่ทั้งหมด | 200 | — |
| GET | `/api/categories/{id}` | ดูหมวดหมู่ | 200 | 404 |
| POST | `/api/categories` | สร้างหมวดหมู่ | 201 | 400 |
| PUT | `/api/categories/{id}` | แก้ไขหมวดหมู่ | 204 | 400, 404 |
| DELETE | `/api/categories/{id}` | ลบหมวดหมู่ | 204 | 404, 409 |
| GET | `/api/products` | ดูสินค้าทั้งหมด | 200 | — |
| GET | `/api/products/{sku}` | ดูสินค้า | 200 | 404 |
| POST | `/api/products` | สร้างสินค้า | 201 | 400 |
| PUT | `/api/products/{sku}` | แก้ไขสินค้า | 204 | 400, 404 |
| DELETE | `/api/products/{sku}` | ลบสินค้า | 204 | 404, 409 |
| GET | `/api/transactions` | ดูรายการเคลื่อนไหวทั้งหมด | 200 | — |
| GET | `/api/transactions/{id}` | ดูรายการเคลื่อนไหว | 200 | 404 |
| POST | `/api/transactions` | สร้างรายการเคลื่อนไหว | 201 | 400 |
| DELETE | `/api/transactions/{id}` | ลบรายการเคลื่อนไหวและรายการสินค้า | 204 | 404 |

`GET` และ `DELETE` ไม่มี request body ส่วน `POST` และ `PUT` ส่ง JSON body ตามตัวอย่างด้านล่าง รหัส `204 No Content` และ `404 Not Found` ที่ controller ส่งตรงไม่มี response body รหัส `201 Created` มี `Location` header ชี้ไปยังรายการที่สร้าง

## หมวดหมู่ (Categories)

### GET `/api/categories`

**Response `200 OK`** (ถ้าไม่มีข้อมูลจะได้ `[]`)

```json
[
  { "categoryId": "11111111-1111-1111-1111-111111111111", "categoryName": "เครื่องเขียน" }
]
```

### GET `/api/categories/{id}`

**Response `200 OK`**

```json
{ "categoryId": "11111111-1111-1111-1111-111111111111", "categoryName": "เครื่องเขียน" }
```

**Error `404 Not Found`:** ไม่พบหมวดหมู่; ไม่มี body

### POST `/api/categories`

**Request body**

```json
{ "categoryName": "เครื่องเขียน" }
```

**Response `201 Created`** พร้อม `Location: /api/categories/11111111-1111-1111-1111-111111111111`

```json
{ "categoryId": "11111111-1111-1111-1111-111111111111", "categoryName": "เครื่องเขียน" }
```

### PUT `/api/categories/{id}`

**Request body**

```json
{ "categoryName": "อุปกรณ์สำนักงาน" }
```

**Response `204 No Content`:** แก้ไขสำเร็จ; ไม่มี body  
**Error `404 Not Found`:** ไม่พบหมวดหมู่; ไม่มี body

`categoryName` เป็น string ที่รับ `null` ได้ และโค้ดไม่ได้กำหนดความยาวขั้นต่ำ

### DELETE `/api/categories/{id}`

**Response `204 No Content`:** ลบสำเร็จ; ไม่มี body  
**Error `404 Not Found`:** ไม่พบหมวดหมู่; ไม่มี body  
**Error `409 Conflict`:** หมวดหมู่ยังถูกใช้โดยสินค้า

```json
"Category is used by products."
```

## สินค้า (Products)

### GET `/api/products`

**Response `200 OK`** (ถ้าไม่มีข้อมูลจะได้ `[]`)

```json
[
  { "sku": "22222222-2222-2222-2222-222222222222", "categoryId": "11111111-1111-1111-1111-111111111111", "productName": "สมุด", "price": "75.00", "cost": "50.00" }
]
```

### GET `/api/products/{sku}`

**Response `200 OK`**

```json
{ "sku": "22222222-2222-2222-2222-222222222222", "categoryId": "11111111-1111-1111-1111-111111111111", "productName": "สมุด", "price": "75.00", "cost": "50.00" }
```

**Error `404 Not Found`:** ไม่พบสินค้า; ไม่มี body

### POST `/api/products`

**Request body**

```json
{ "categoryId": "11111111-1111-1111-1111-111111111111", "productName": "สมุด", "price": "75.00", "cost": "50.00" }
```

**Response `201 Created`** พร้อม `Location: /api/products/22222222-2222-2222-2222-222222222222`

```json
{ "sku": "22222222-2222-2222-2222-222222222222", "categoryId": "11111111-1111-1111-1111-111111111111", "productName": "สมุด", "price": "75.00", "cost": "50.00" }
```

**Error `400 Bad Request`:** ถ้า `categoryId` ระบุหมวดหมู่ที่ไม่มีอยู่

```json
"Category does not exist."
```

### PUT `/api/products/{sku}`

**Request body** (ส่งข้อมูลสินค้าใหม่ครบทุกฟิลด์)

```json
{ "categoryId": null, "productName": "สมุดปกแข็ง", "price": "90.00", "cost": "55.00" }
```

**Response `204 No Content`:** แก้ไขสำเร็จ; ไม่มี body  
**Error `404 Not Found`:** ไม่พบสินค้า; ไม่มี body  
**Error `400 Bad Request`:** `categoryId` ไม่มีอยู่; body คือ `"Category does not exist."`

`categoryId` รับ `null` ได้ ส่วน `productName` ต้องมีอย่างน้อย 1 ตัวอักษร `price` และ `cost` เป็น **string** ที่จำเป็น ไม่ใช่ JSON number; โค้ดยังไม่ตรวจรูปแบบตัวเลขหรือค่าติดลบ

### DELETE `/api/products/{sku}`

**Response `204 No Content`:** ลบสำเร็จ; ไม่มี body  
**Error `404 Not Found`:** ไม่พบสินค้า; ไม่มี body  
**Error `409 Conflict`:** สินค้ายังถูกใช้ในรายการเคลื่อนไหว

```json
"Product is used by transactions."
```

## รายการเคลื่อนไหวสต็อก (Transactions)

### GET `/api/transactions`

**Response `200 OK`** (ถ้าไม่มีข้อมูลจะได้ `[]`)

```json
[
  {
    "transactionId": "33333333-3333-3333-3333-333333333333",
    "type": "IN",
    "date": "2026-09-29T00:00:00Z",
    "reason": "รับสินค้าเข้า",
    "items": [
      {
        "idtransactionItemId": "44444444-4444-4444-4444-444444444444",
        "transactionId": "33333333-3333-3333-3333-333333333333",
        "sku": "22222222-2222-2222-2222-222222222222",
        "categoryId": "11111111-1111-1111-1111-111111111111"
      }
    ]
  }
]
```

### GET `/api/transactions/{id}`

**Response `200 OK`:** object รูปแบบเดียวกับสมาชิกหนึ่งรายการใน response ของ `GET /api/transactions`  
**Error `404 Not Found`:** ไม่พบรายการ; ไม่มี body

### POST `/api/transactions`

**Request body** (`items` ต้องมีอย่างน้อยหนึ่งรายการ)

```json
{
  "type": "IN",
  "date": "2026-09-29T00:00:00Z",
  "reason": "รับสินค้าเข้า",
  "items": [
    { "sku": "22222222-2222-2222-2222-222222222222", "categoryId": "11111111-1111-1111-1111-111111111111" }
  ]
}
```

**Response `201 Created`** พร้อม `Location: /api/transactions/33333333-3333-3333-3333-333333333333`

```json
{
  "transactionId": "33333333-3333-3333-3333-333333333333",
  "type": "IN",
  "date": "2026-09-29T00:00:00Z",
  "reason": "รับสินค้าเข้า",
  "items": [
    {
      "idtransactionItemId": "44444444-4444-4444-4444-444444444444",
      "transactionId": "33333333-3333-3333-3333-333333333333",
      "sku": "22222222-2222-2222-2222-222222222222",
      "categoryId": "11111111-1111-1111-1111-111111111111"
    }
  ]
}
```

**Error `400 Bad Request`** ตัวอย่างเมื่อ `sku` ไม่พบ:

```json
"One or more products do not exist."
```

ข้อความ `400` อื่นที่ controller ส่งได้คือ `"At least one item is required."` เมื่อ `items` ว่าง และ `"Each item requires SKU and categoryID."` เมื่อ `sku` เป็น GUID ว่างหรือ `categoryId` เป็นข้อความว่าง

`type` เป็น string ที่จำเป็นและต้องมีอย่างน้อยหนึ่งตัวอักษร โค้ดไม่ได้จำกัดค่าเฉพาะ `IN`/`OUT` แม้ตัวอย่างใช้ `IN`; `date` เป็นวันที่เวลาแบบ ISO 8601; `reason` รับ `null` ได้ `items[].categoryId` เป็น **string** ที่จำเป็น และโค้ดไม่ได้ตรวจว่าเป็น GUID หรือว่าตรงกับหมวดหมู่ของสินค้า

### DELETE `/api/transactions/{id}`

**Response `204 No Content`:** ลบรายการพร้อม items สำเร็จ; ไม่มี body  
**Error `404 Not Found`:** ไม่พบรายการ; ไม่มี body

## รูปแบบ error จากการตรวจข้อมูล

เมื่อส่ง JSON ที่ไม่ผ่าน data annotations หรือแปลงชนิดข้อมูลไม่ได้ `[ApiController]` จะตอบ `400 Bad Request` แบบ `ValidationProblemDetails` โดยชื่อฟิลด์และข้อความอาจต่างกันตามข้อมูลที่ส่ง ตัวอย่างเมื่อสร้างสินค้าโดยไม่ส่ง `productName`:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "ProductName": ["The ProductName field is required."]
  }
}
```

กรณีที่ controller ตอบ error ด้วยข้อความ string เช่น `"Category does not exist."` เป็น JSON string และกรณี `404` จาก `NotFound()` ไม่มี body ตัวอย่าง `400` ข้างต้นเป็นรูปแบบทั่วไปของ ASP.NET Core; ค่า `type`, key และข้อความจริงขึ้นอยู่กับ runtime และรูปแบบ input
