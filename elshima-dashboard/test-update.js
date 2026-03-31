const axios = require('axios');

async function testUpdate() {
  try {
    const payload = {
      "nameAr": "إدناء هاجر",
      "basePrice": 680,
      "categoryId": "b1c1711f-c3bc-4146-81a4-3ac3a42b0a23",
      "isActive": true,
      "isFeatured": false,
      "colors": [
        {
          "colorId": "c4ba0b5c-0c15-4507-a2df-4d861c5da7f9",
          "colorName": "بيج",
          "isDefault": true,
          "images": [],
          "variants": [
            {
              "sizeId": "22222222-2222-2222-2222-222222222002",
              "sizeName": "M",
              "availableQuantity": 20
            }
          ],
          "sizes": [
            {
              "sizeId": "22222222-2222-2222-2222-222222222002",
              "sizeName": "M",
              "availableQuantity": 20
            }
          ]
        }
      ],
      "displayImages": null
    };
    console.log("Sending PUT request with payload...");
    const res = await axios.put('https://elshimaa-1.runasp.net/api/products/fbc10842-0a2f-4dde-973a-d7f47b3108da', payload);
    console.log("Success:", res.data);
  } catch (err) {
    if (err.response) {
      console.log("Server responded with status:", err.response.status);
      console.log("Response data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.log("Error:", err.message);
    }
  }
}

testUpdate();
