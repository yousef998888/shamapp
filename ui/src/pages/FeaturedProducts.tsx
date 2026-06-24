import { Star, Heart } from "lucide-react";

export function FeaturedProducts() {
  // بيانات تجريبية
  const products = [
    {
      id: 1,
      name: "instax mini Evo Instant Digital Camera, Black",
      price: 175.45,
      oldPrice: 219.99,
      discount: 21,
      rating: 3.5,
      store: "Grogin",
      available: 89,
      image:
        "https://klbtheme.com/bevesi/wp-content/uploads/2024/04/1-17-300x300.jpg", // ضع صورة منتج من اختيارك
    },
    {
      id: 2,
      name: "Apple AirPods Pro (2nd Generation)",
      price: 249.99,
      oldPrice: 299.99,
      discount: 17,
      rating: 4.5,
      store: "Apple Store",
      available: 42,
      image:
        "https://klbtheme.com/bevesi/wp-content/uploads/2024/04/1-17-300x300.jpg",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      {products.map((product) => (
        <div
          key={product.id}
          className="border rounded-xl p-4 shadow-sm hover:shadow-lg transition duration-300 bg-white relative"
        >
          {/* أيقونة المفضلة */}
          <button className="absolute top-3 right-3 text-gray-400 hover:text-red-500">
            <Heart className="h-5 w-5" />
          </button>

          {/* صورة المنتج */}
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-48 object-contain mb-4"
          />

          {/* الأسعار */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-600 font-bold text-lg">
              ${product.price}
            </span>
            <span className="text-gray-400 line-through text-sm">
              ${product.oldPrice}
            </span>
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">
              {product.discount}%
            </span>
          </div>

          {/* اسم المنتج */}
          <h3 className="text-sm font-medium text-gray-800 mb-2">
            {product.name}
          </h3>

          {/* التقييم */}
          <div className="flex items-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(product.rating)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
            <span className="text-gray-600 text-sm">{product.rating}</span>
          </div>

          {/* اسم المتجر */}
          <p className="text-sm text-gray-500 mb-2">
            Store: <span className="font-semibold">{product.store}</span>
          </p>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-red-500 h-2 rounded-full"
              style={{ width: `${product.available}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            Available only:{" "}
            <span className="font-semibold">{product.available}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
