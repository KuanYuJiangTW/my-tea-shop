export interface Product {
  id: number;
  name: string;
  nameEn: string;
  category: "烏龍茶" | "紅茶";
  origin: string;
  altitude: string;
  price: number;
  weight: string;
  description: string;
  color: string;
  featured: boolean;
  image?: string;
  image2?: string;
}

export const products: Product[] = [
  {
    id: 1,
    name: "阿里山高山烏龍茶",
    nameEn: "Ali Shan High Mountain Oolong",
    category: "烏龍茶",
    origin: "嘉義阿里山",
    altitude: "1,400m",
    price: 400,
    weight: "150g",
    description:
      "生長於阿里山雲霧繚繞的高山茶園，日夜溫差大，茶湯清澈金黃，蘭花香氣清雅，入口圓潤甘醇，回甘悠長。",
    color: "from-green-100 to-emerald-200",
    featured: true,
    image: "/images/products/01.jpg",
  },
  {
    id: 2,
    name: "蜜香紅茶",
    nameEn: "Honey Fragrance Black Tea",
    category: "紅茶",
    origin: "嘉義阿里山",
    altitude: "300m",
    price: 400,
    weight: "150g",
    description:
      "因小綠葉蟬自然叮咬而帶出天然蜜香，茶湯呈琥珀紅色，蜜甜香氣濃郁芬芳，滋味醇厚圓潤，回甘持久。",
    color: "from-amber-200 to-orange-300",
    featured: true,
    image: "/images/products/02.jpg",
    image2: "/images/products/02-2.jpg",
  },
  {
    id: 3,
    name: "阿里山金萱茶",
    nameEn: "Ali Shan Jin Xuan",
    category: "烏龍茶",
    origin: "嘉義阿里山",
    altitude: "1,200m",
    price: 350,
    weight: "150g",
    description:
      "以金萱品種製成，帶有天然奶香與花香，茶湯淡黃清澈，口感滑順柔和，香氣迷人，是初接觸台灣茶的最佳選擇。",
    color: "from-yellow-100 to-amber-200",
    featured: true,
    image: "/images/products/03.jpg",
    image2: "/images/products/03-2.jpg",
  },
  {
    id: 4,
    name: "紅烏龍茶",
    nameEn: "Red Oolong",
    category: "烏龍茶",
    origin: "台東鹿野",
    altitude: "350m",
    price: 500,
    weight: "150g",
    description:
      "重度發酵的特色烏龍，融合烏龍茶香氣與紅茶甘醇，茶湯橙紅明亮，果香蜜韻交織，風味獨特，耐人尋味。",
    color: "from-red-100 to-rose-200",
    featured: false,
  },
  {
    id: 5,
    name: "四季春",
    nameEn: "Four Seasons Spring",
    category: "烏龍茶",
    origin: "南投名間",
    altitude: "300m",
    price: 150,
    weight: "150g",
    description:
      "一年四季皆可採製，以清新花香著稱，茶湯翠綠明亮，滋味鮮爽甘甜，花香持久，是日常品飲的絕佳良伴。",
    color: "from-lime-100 to-green-200",
    featured: false,
  },
];

export const categories = ["全部", "烏龍茶", "紅茶"] as const;
