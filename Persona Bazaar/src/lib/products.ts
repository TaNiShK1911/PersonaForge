export type Category = { slug: string; name: string; image: string; tagline: string };

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  description: string;
  priceCents: number;
  compareAtCents?: number;
  categorySlug: string;
  images: string[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  rating: number;
  reviewCount: number;
  isNew?: boolean;
  isTrending?: boolean;
  stock: number;
  tags: string[];
};

export const CATEGORIES: Category[] = [
  {
    slug: "women",
    name: "Women",
    tagline: "Soft tailoring, structured ease.",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80",
  },
  {
    slug: "men",
    name: "Men",
    tagline: "Quiet craft for daily wear.",
    image:
      "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1400&q=80",
  },
  {
    slug: "accessories",
    name: "Accessories",
    tagline: "Finishing notes, considered.",
    image:
      "https://images.unsplash.com/photo-1591348278863-a8fb3887e2aa?auto=format&fit=crop&w=1400&q=80",
  },
  {
    slug: "home",
    name: "Home",
    tagline: "Objects with intention.",
    image:
      "https://images.unsplash.com/photo-1556228724-4b4e94c2b8b1?auto=format&fit=crop&w=1400&q=80",
  },
];

const img = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const make = (
  i: number,
  p: Omit<Product, "id" | "slug"> & { slug?: string },
): Product => ({
  id: String(i + 1).padStart(3, "0"),
  slug: p.slug ?? p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  ...p,
});

const SIZES_APPAREL = ["XS", "S", "M", "L", "XL"];
const SIZES_ONE = ["One size"];
const SIZES_SHOE = ["7", "8", "9", "10", "11", "12"];

const C = {
  ivory: { name: "Ivory", hex: "#f3eee4" },
  ink: { name: "Ink", hex: "#1a1a2e" },
  coral: { name: "Coral", hex: "#e07a5f" },
  sage: { name: "Sage", hex: "#9aa78a" },
  camel: { name: "Camel", hex: "#b48a60" },
  stone: { name: "Stone", hex: "#a39e94" },
  noir: { name: "Noir", hex: "#0f0f12" },
  rose: { name: "Rose", hex: "#d6a3a3" },
};

export const PRODUCTS: Product[] = [
  // Women (8)
  make(0, {
    name: "Linen Overshirt",
    brand: "Maison Bazaar",
    description:
      "A relaxed overshirt cut from heavyweight Belgian linen with mother-of-pearl buttons and a softly rounded collar. Wears beautifully open over a tank, buttoned with denim.",
    priceCents: 18900,
    compareAtCents: 22000,
    categorySlug: "women",
    images: [img("photo-1551489186-cf8726f514f8"), img("photo-1539109136881-3be0616acf4b"), img("photo-1495121605193-b116b5b09a55")],
    sizes: SIZES_APPAREL,
    colors: [C.ivory, C.sage, C.camel],
    rating: 4.7, reviewCount: 128, isNew: true, isTrending: true, stock: 12, tags: ["new", "linen"],
  }),
  make(1, {
    name: "Pleated Midi Skirt",
    brand: "Atelier Noir",
    description:
      "Sun-pleated tencel skirt with a high waistband and concealed side zip. Fluid drape that catches movement.",
    priceCents: 14500,
    categorySlug: "women",
    images: [img("photo-1485518882345-15568b007407"), img("photo-1496747611176-843222e1e57c")],
    sizes: SIZES_APPAREL,
    colors: [C.ink, C.ivory, C.rose],
    rating: 4.6, reviewCount: 64, isTrending: true, stock: 6, tags: ["bestseller"],
  }),
  make(2, {
    name: "Silk Camisole",
    brand: "Maison Bazaar",
    description: "19-momme silk camisole with adjustable straps and a bias-cut hem.",
    priceCents: 12500,
    categorySlug: "women",
    images: [img("photo-1564257631407-4deb1f99d992"), img("photo-1490481651871-ab68de25d43d")],
    sizes: SIZES_APPAREL,
    colors: [C.ivory, C.noir, C.rose],
    rating: 4.8, reviewCount: 211, stock: 22, tags: ["silk"],
  }),
  make(3, {
    name: "Wide-Leg Trouser",
    brand: "Atelier Noir",
    description: "Cropped wide-leg trouser in dry wool crepe with pressed front pleats.",
    priceCents: 22500, compareAtCents: 26000,
    categorySlug: "women",
    images: [img("photo-1594633312681-425c7b97ccd1"), img("photo-1551803091-e20673f15770")],
    sizes: SIZES_APPAREL, colors: [C.ink, C.camel], rating: 4.5, reviewCount: 88, stock: 9, tags: ["sale"],
  }),
  make(4, {
    name: "Knit Cardigan",
    brand: "North Coast",
    description: "Boxy alpaca-blend cardigan with horn buttons and ribbed cuffs.",
    priceCents: 19500,
    categorySlug: "women",
    images: [img("photo-1434389677669-e08b4cac3105"), img("photo-1515886657613-9f3515b0c78f")],
    sizes: SIZES_APPAREL, colors: [C.ivory, C.sage, C.coral], rating: 4.7, reviewCount: 142, isNew: true, stock: 14, tags: ["new"],
  }),
  make(5, {
    name: "Poplin Shirt Dress",
    brand: "Maison Bazaar",
    description: "Long shirt dress in crisp cotton poplin with a self-tie belt.",
    priceCents: 16500,
    categorySlug: "women",
    images: [img("photo-1496217590455-aa63a8350eea"), img("photo-1469334031218-e382a71b716b")],
    sizes: SIZES_APPAREL, colors: [C.ivory, C.ink], rating: 4.6, reviewCount: 73, stock: 11, tags: [],
  }),
  make(6, {
    name: "Cashmere Crewneck",
    brand: "North Coast",
    description: "Grade-A Mongolian cashmere knit in a relaxed crewneck silhouette.",
    priceCents: 24500,
    categorySlug: "women",
    images: [img("photo-1576566588028-4147f3842f27"), img("photo-1503342217505-b0a15ec3261c")],
    sizes: SIZES_APPAREL, colors: [C.camel, C.ivory, C.noir], rating: 4.9, reviewCount: 305, isTrending: true, stock: 7, tags: ["cashmere", "bestseller"],
  }),
  make(7, {
    name: "Tailored Blazer",
    brand: "Atelier Noir",
    description: "Single-breasted blazer with peak lapels and natural shoulder construction.",
    priceCents: 32500,
    categorySlug: "women",
    images: [img("photo-1591047139829-d91aecb6caea"), img("photo-1542295669297-4d352b042bca")],
    sizes: SIZES_APPAREL, colors: [C.ink, C.camel], rating: 4.8, reviewCount: 96, stock: 5, tags: [],
  }),

  // Men (8)
  make(8, {
    name: "Oxford Shirt",
    brand: "North Coast",
    description: "Heavyweight Japanese oxford with a button-down collar and curved hem.",
    priceCents: 14500,
    categorySlug: "men",
    images: [img("photo-1602810318383-e386cc2a3ccf"), img("photo-1603252109303-2751441dd157")],
    sizes: SIZES_APPAREL, colors: [C.ivory, C.ink, C.sage], rating: 4.7, reviewCount: 184, isTrending: true, stock: 20, tags: ["bestseller"],
  }),
  make(9, {
    name: "Selvedge Denim",
    brand: "Maison Bazaar",
    description: "14oz selvedge denim cut in a tapered straight leg, finished with copper rivets.",
    priceCents: 21500,
    categorySlug: "men",
    images: [img("photo-1542272604-787c3835535d"), img("photo-1582418702059-97ebd0d2b95d")],
    sizes: SIZES_APPAREL, colors: [C.ink], rating: 4.8, reviewCount: 267, stock: 16, tags: ["denim"],
  }),
  make(10, {
    name: "Merino Polo",
    brand: "North Coast",
    description: "Fine-gauge merino polo with a knit collar and three-button placket.",
    priceCents: 16500,
    categorySlug: "men",
    images: [img("photo-1620799140408-edc6dcb6d633"), img("photo-1622445275576-721325763afe")],
    sizes: SIZES_APPAREL, colors: [C.noir, C.ivory, C.sage], rating: 4.6, reviewCount: 91, isNew: true, stock: 12, tags: ["new"],
  }),
  make(11, {
    name: "Pleated Chinos",
    brand: "Atelier Noir",
    description: "Garment-dyed cotton chinos with a single front pleat and tapered ankle.",
    priceCents: 17500, compareAtCents: 19500,
    categorySlug: "men",
    images: [img("photo-1473966968600-fa801b869a1a"), img("photo-1594633312681-425c7b97ccd1")],
    sizes: SIZES_APPAREL, colors: [C.camel, C.ink, C.stone], rating: 4.5, reviewCount: 58, stock: 8, tags: ["sale"],
  }),
  make(12, {
    name: "Wool Overcoat",
    brand: "Atelier Noir",
    description: "Knee-length overcoat in Italian wool melton with raglan sleeves.",
    priceCents: 48500,
    categorySlug: "men",
    images: [img("photo-1539533018447-63fcce2678e3"), img("photo-1591047139829-d91aecb6caea")],
    sizes: SIZES_APPAREL, colors: [C.ink, C.camel], rating: 4.9, reviewCount: 142, isTrending: true, stock: 4, tags: ["outerwear"],
  }),
  make(13, {
    name: "Crewneck Sweater",
    brand: "North Coast",
    description: "Lambswool crewneck knit in Scotland with a fully-fashioned shoulder.",
    priceCents: 18500,
    categorySlug: "men",
    images: [img("photo-1620012253295-c15cc3e65df4"), img("photo-1434389677669-e08b4cac3105")],
    sizes: SIZES_APPAREL, colors: [C.sage, C.ivory, C.noir], rating: 4.7, reviewCount: 118, stock: 13, tags: [],
  }),
  make(14, {
    name: "Leather Sneaker",
    brand: "Maison Bazaar",
    description: "Italian-made low-top sneaker in vegetable-tanned leather with a cup sole.",
    priceCents: 26500,
    categorySlug: "men",
    images: [img("photo-1542291026-7eec264c27ff"), img("photo-1600185365926-3a2ce3cdb9eb")],
    sizes: SIZES_SHOE, colors: [C.ivory, C.noir], rating: 4.8, reviewCount: 232, isNew: true, stock: 18, tags: ["footwear"],
  }),
  make(15, {
    name: "Tee, Heavyweight",
    brand: "North Coast",
    description: "8oz combed cotton tee with a tubular body and ribbed collar.",
    priceCents: 5500,
    categorySlug: "men",
    images: [img("photo-1521572163474-6864f9cf17ab"), img("photo-1583743814966-8936f5b7be1a")],
    sizes: SIZES_APPAREL, colors: [C.ivory, C.noir, C.coral, C.sage], rating: 4.6, reviewCount: 412, isTrending: true, stock: 50, tags: ["basics"],
  }),

  // Accessories (4)
  make(16, {
    name: "Leather Tote",
    brand: "Maison Bazaar",
    description: "Unlined vegetable-tanned tote with hand-rolled handles and an antique brass clasp.",
    priceCents: 32500,
    categorySlug: "accessories",
    images: [img("photo-1584917865442-de89df76afd3"), img("photo-1591348278863-a8fb3887e2aa")],
    sizes: SIZES_ONE, colors: [C.camel, C.noir], rating: 4.9, reviewCount: 168, isTrending: true, stock: 6, tags: ["leather"],
  }),
  make(17, {
    name: "Silk Scarf",
    brand: "Atelier Noir",
    description: "Hand-rolled silk twill scarf printed with an original archive motif.",
    priceCents: 9500,
    categorySlug: "accessories",
    images: [img("photo-1601924638867-3a6de6b7a500"), img("photo-1583394838336-acd977736f90")],
    sizes: SIZES_ONE, colors: [C.coral, C.sage, C.rose], rating: 4.7, reviewCount: 84, isNew: true, stock: 22, tags: ["silk", "new"],
  }),
  make(18, {
    name: "Wool Felt Hat",
    brand: "North Coast",
    description: "Rabbit felt wide-brim hat with a grosgrain band.",
    priceCents: 13500,
    categorySlug: "accessories",
    images: [img("photo-1572307480813-ceb0e59d8325"), img("photo-1521369909029-2afed882baee")],
    sizes: SIZES_ONE, colors: [C.camel, C.ink], rating: 4.5, reviewCount: 41, stock: 9, tags: [],
  }),
  make(19, {
    name: "Leather Belt",
    brand: "Maison Bazaar",
    description: "Bridle leather belt with a solid brass buckle, made to soften with wear.",
    priceCents: 8500,
    categorySlug: "accessories",
    images: [img("photo-1624222247344-550fb60583dc"), img("photo-1611923134239-b9be5816e23c")],
    sizes: ["32", "34", "36", "38"], colors: [C.camel, C.noir], rating: 4.8, reviewCount: 156, stock: 14, tags: [],
  }),

  // Home (4)
  make(20, {
    name: "Stoneware Bowl Set",
    brand: "Maison Bazaar",
    description: "Set of four hand-thrown stoneware bowls, glazed in a soft satin finish.",
    priceCents: 11500,
    categorySlug: "home",
    images: [img("photo-1556228724-4b4e94c2b8b1"), img("photo-1556228852-80b6e5eeff06")],
    sizes: SIZES_ONE, colors: [C.ivory, C.sage], rating: 4.8, reviewCount: 73, isNew: true, stock: 11, tags: ["new", "ceramic"],
  }),
  make(21, {
    name: "Linen Throw",
    brand: "North Coast",
    description: "Stonewashed European linen throw with hand-knotted fringe.",
    priceCents: 18500,
    categorySlug: "home",
    images: [img("photo-1540574163026-643ea20ade25"), img("photo-1493663284031-b7e3aefcae8e")],
    sizes: SIZES_ONE, colors: [C.ivory, C.stone, C.coral], rating: 4.7, reviewCount: 92, isTrending: true, stock: 7, tags: ["linen"],
  }),
  make(22, {
    name: "Soy Candle, No. 04",
    brand: "Atelier Noir",
    description: "Hand-poured soy candle with notes of fig leaf, cedar, and white tea. 60-hour burn.",
    priceCents: 4800,
    categorySlug: "home",
    images: [img("photo-1602874801006-e26c4ef9fb3a"), img("photo-1603006905003-be475563bc59")],
    sizes: SIZES_ONE, colors: [C.ivory], rating: 4.6, reviewCount: 218, stock: 40, tags: ["bestseller"],
  }),
  make(23, {
    name: "Bouclé Cushion",
    brand: "Maison Bazaar",
    description: "Wool-bouclé cushion with a feather inner. Made in Portugal.",
    priceCents: 9800,
    categorySlug: "home",
    images: [img("photo-1631679706909-1844bbd07221"), img("photo-1586023492125-27b2c045efd7")],
    sizes: SIZES_ONE, colors: [C.ivory, C.camel, C.sage], rating: 4.7, reviewCount: 56, stock: 15, tags: [],
  }),
  make(24, {
    name: "Blue Ceramic Nesting Bowls",
    brand: "Atelier Noir",
    description: "Handcrafted set of nested ceramic bowls in deep blue. Perfect for serving or display.",
    priceCents: 8500,
    categorySlug: "home",
    images: ["/images/media__1782325676348.jpg"],
    sizes: SIZES_ONE, colors: [C.ink], rating: 4.8, reviewCount: 42, isNew: true, stock: 10, tags: ["ceramic", "new"],
  }),
  make(25, {
    name: "Wooden Room Divider",
    brand: "Maison Bazaar",
    description: "Versatile wooden bookshelf and room divider with rotating panels. Adds structure to any open space.",
    priceCents: 45000,
    categorySlug: "home",
    images: ["/images/media__1782325676408.jpg"],
    sizes: SIZES_ONE, colors: [C.camel], rating: 4.9, reviewCount: 28, isTrending: true, stock: 5, tags: ["furniture"],
  }),
  make(26, {
    name: "Latte Love Candle",
    brand: "North Coast",
    description: "Coffee-scented soy candle designed like a latte. Warm, inviting, and long-lasting.",
    priceCents: 3500,
    categorySlug: "home",
    images: ["/images/media__1782325731776.jpg"],
    sizes: SIZES_ONE, colors: [C.camel], rating: 4.7, reviewCount: 115, stock: 20, tags: ["candle"],
  }),
];

export const getProduct = (id: string) =>
  PRODUCTS.find((p) => p.id === id || p.slug === id) ?? null;

export const productsByCategory = (slug: string) =>
  PRODUCTS.filter((p) => p.categorySlug === slug);

export const newArrivals = () => PRODUCTS.filter((p) => p.isNew).slice(0, 8);
export const trending = () => PRODUCTS.filter((p) => p.isTrending).slice(0, 6);

export const searchProducts = (q: string) => {
  const s = q.trim().toLowerCase();
  if (!s) return [] as Product[];
  return PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(s) ||
      p.brand.toLowerCase().includes(s) ||
      p.tags.some((t) => t.includes(s)) ||
      p.categorySlug.includes(s),
  );
};

export const relatedProducts = (p: Product) =>
  PRODUCTS.filter((x) => x.categorySlug === p.categorySlug && x.id !== p.id).slice(0, 4);

export const alsoBought = (p: Product) =>
  PRODUCTS.filter((x) => x.id !== p.id && (x.brand === p.brand || x.tags.some((t) => p.tags.includes(t)))).slice(0, 4);

export const recommendByIds = (ids: string[]) =>
  ids.map((id) => getProduct(id)).filter(Boolean) as Product[];
