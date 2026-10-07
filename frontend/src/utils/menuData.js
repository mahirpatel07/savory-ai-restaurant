export const CATEGORY_IMAGES = {
  ai: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=120&q=80',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=120&q=80',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=120&q=80',
  pasta: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=120&q=80',
  chinese: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=120&q=80',
  indian: 'https://images.unsplash.com/photo-1545247181-516773cae754?auto=format&fit=crop&w=120&q=80',
  'south-indian': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=120&q=80',
  desserts: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=120&q=80',
  drinks: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=120&q=80',
  coffee: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=120&q=80'
};

export const getCategoryImage = (category, dishes = []) => {
  if (!category) return null;
  const rawKey = String(category).toLowerCase().trim();

  // No image for 'all' or 'all categories'
  if (rawKey === 'all' || rawKey === 'all categories') {
    return null;
  }

  if (CATEGORY_IMAGES[rawKey]) {
    return CATEGORY_IMAGES[rawKey];
  }

  // Normalized matching (e.g. 'south-indian' vs 'south indian' vs 'southindian')
  const cleanKey = rawKey.replace(/[^a-z0-9]/g, '');
  for (const [catKey, imgUrl] of Object.entries(CATEGORY_IMAGES)) {
    if (catKey.replace(/[^a-z0-9]/g, '') === cleanKey) {
      return imgUrl;
    }
  }

  // Fallback to first matching dish image from database
  if (Array.isArray(dishes) && dishes.length > 0) {
    const dishMatch = dishes.find(
      d => d.category && d.category.toLowerCase().trim() === rawKey && d.image
    );
    if (dishMatch) return dishMatch.image;
  }

  return null;
};

export const categories = [
  { id: 'ai', name: 'AI Chef Recommendations', image: CATEGORY_IMAGES.ai },
  { id: 'pizza', name: 'Artisanal Pizza', image: CATEGORY_IMAGES.pizza },
  { id: 'burger', name: 'Gourmet Burgers', image: CATEGORY_IMAGES.burger },
  { id: 'pasta', name: 'Handcrafted Pasta', image: CATEGORY_IMAGES.pasta },
  { id: 'chinese', name: 'Imperial Chinese', image: CATEGORY_IMAGES.chinese },
  { id: 'indian', name: 'Royal Indian', image: CATEGORY_IMAGES.indian },
  { id: 'south-indian', name: 'Deccan Delights', image: CATEGORY_IMAGES['south-indian'] },
  { id: 'desserts', name: 'Decadent Desserts', image: CATEGORY_IMAGES.desserts },
  { id: 'drinks', name: 'Artisanal Drinks', image: CATEGORY_IMAGES.drinks },
  { id: 'coffee', name: 'Reserve Coffee', image: CATEGORY_IMAGES.coffee }
];

export const menuItems = [
  // PIZZA
  {
    id: 'p1',
    category: 'pizza',
    name: 'Truffle & Wild Mushroom',
    price: '$28',
    rating: 4.9,
    reviews: 142,
    description: 'Chanterelle, shiitake, and cremini mushrooms, fresh mozzarella, white truffle oil, and shaved black truffles on sourdough crust.',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    tags: ['Chef Special', 'Vegetarian', 'Truffle'],
    prepTime: '15 mins',
    calories: '650 kcal'
  },
  {
    id: 'p2',
    category: 'pizza',
    name: 'Prosciutto Di Parma',
    price: '$26',
    rating: 4.8,
    reviews: 98,
    description: 'San Marzano tomato base, fresh buffalo mozzarella, 24-month cured prosciutto, wild baby arugula, and extra virgin olive oil.',
    image: 'https://images.unsplash.com/photo-1555072956-7758afb20e8f?auto=format&fit=crop&w=600&q=80',
    tags: ['Best Seller', 'Pork'],
    prepTime: '12 mins',
    calories: '710 kcal'
  },
  {
    id: 'p3',
    category: 'pizza',
    name: 'Burrata & Fig Jam',
    price: '$24',
    rating: 4.9,
    reviews: 84,
    description: 'Creamy burrata cheese, sweet fig jam, caramelized onions, toasted pistachios, and balsamic glaze reduction.',
    image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=600&q=80',
    tags: ['Vegetarian', 'Sweet & Savory'],
    prepTime: '14 mins',
    calories: '680 kcal'
  },
  {
    id: 'p4',
    category: 'pizza',
    name: 'Spiced Diavola',
    price: '$23',
    rating: 4.7,
    reviews: 110,
    description: 'Spicy calabrian salami, house-made sausage, fresh mozzarella, pickled jalapeños, and hot honey drizzle.',
    image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80',
    tags: ['Spicy'],
    prepTime: '12 mins',
    calories: '780 kcal'
  },

  // BURGER
  {
    id: 'b1',
    category: 'burger',
    name: 'The Wagyu Gold Standard',
    price: '$34',
    rating: 4.9,
    reviews: 215,
    description: 'A5 Wagyu beef patty, white cheddar, caramelized onion compote, truffle aioli, and edible 24k gold leaf on a brioche bun.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    tags: ['Signature', 'Luxury'],
    prepTime: '18 mins',
    calories: '920 kcal'
  },
  {
    id: 'b2',
    category: 'burger',
    name: 'Black Truffle Crispy Chicken',
    price: '$22',
    rating: 4.8,
    reviews: 132,
    description: 'Buttermilk fried chicken breast, black truffle dynamic glaze, creamy cabbage slaw, and pickles on a toasted bun.',
    image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80',
    tags: ['Crispy', 'Spicy Opt'],
    prepTime: '15 mins',
    calories: '840 kcal'
  },

  // PASTA
  {
    id: 'pa1',
    category: 'pasta',
    name: 'Lobster Tagliolini',
    price: '$38',
    rating: 4.9,
    reviews: 167,
    description: 'Hand-rolled tagliolini, butter-poached Maine lobster claw, saffron cream sauce, cherry tomatoes, and micro-basil.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    tags: ['Premium Seafood', 'Handmade'],
    prepTime: '20 mins',
    calories: '720 kcal'
  },
  {
    id: 'pa2',
    category: 'pasta',
    name: 'Wild Boar Pappardelle',
    price: '$29',
    rating: 4.8,
    reviews: 79,
    description: 'Slow-braised wild boar ragu, wide ribbon pappardelle pasta, rosemary, and aged Pecorino Romano cheese.',
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
    tags: ['Rich Flavor', 'Traditional'],
    prepTime: '15 mins',
    calories: '690 kcal'
  },

  // CHINESE
  {
    id: 'c1',
    category: 'chinese',
    name: 'Peking Duck Splendour',
    price: '$42',
    rating: 4.9,
    reviews: 189,
    description: '24-hour slow roasted duck with crispy skin, served with paper-thin pancakes, scallions, cucumbers, and sweet hoisin sauce.',
    image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=600&q=80',
    tags: ['Chef Special', 'Traditional'],
    prepTime: '25 mins',
    calories: '890 kcal'
  },
  {
    id: 'c2',
    category: 'chinese',
    name: 'Glazed Black Cod',
    price: '$36',
    rating: 4.8,
    reviews: 104,
    description: 'Seared black cod marinated in white miso and ginger-soy glaze, served over wok-fired bok choy and jasmine rice.',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
    tags: ['Healthy', 'Seafood'],
    prepTime: '18 mins',
    calories: '540 kcal'
  },

  // INDIAN
  {
    id: 'i1',
    category: 'indian',
    name: 'Nawabi Lamb Shank Rogan Josh',
    price: '$32',
    rating: 4.9,
    reviews: 154,
    description: 'Slow-braised lamb shank in an aromatic Kashmiri spices gravy, flavored with saffron, cardamom, and ginger juliennes.',
    image: 'https://images.unsplash.com/photo-1545247181-516773cae754?auto=format&fit=crop&w=600&q=80',
    tags: ['Spicy', 'Signature'],
    prepTime: '22 mins',
    calories: '810 kcal'
  },
  {
    id: 'i2',
    category: 'indian',
    name: 'Paneer Makhani Truffle Naan',
    price: '$25',
    rating: 4.8,
    reviews: 121,
    description: 'Smoked paneer cubes cooked in a rich, buttery tomato sauce with cashew cream, served with warm truffle-infused naan bread.',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
    tags: ['Vegetarian', 'Creamy'],
    prepTime: '15 mins',
    calories: '750 kcal'
  },

  // SOUTH INDIAN
  {
    id: 's1',
    category: 'south-indian',
    name: 'Ghee Roast Gold Dosa',
    price: '$21',
    rating: 4.9,
    reviews: 145,
    description: 'Super-crisp fermented rice crepe drizzled with pure cow ghee and edible gold dust, served with sambar and fresh coconut chutneys.',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80',
    tags: ['Vegetarian', 'Gluten Free'],
    prepTime: '10 mins',
    calories: '490 kcal'
  },
  {
    id: 's2',
    category: 'south-indian',
    name: 'Malabar Prawn Curry',
    price: '$28',
    rating: 4.7,
    reviews: 93,
    description: 'Jumbo prawns simmered in a spiced coconut milk broth with raw mango, curry leaves, and mustard seeds.',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80',
    tags: ['Seafood', 'Spicy'],
    prepTime: '17 mins',
    calories: '580 kcal'
  },

  // DESSERTS
  {
    id: 'd1',
    category: 'desserts',
    name: 'Decadent Chocolate Sphere',
    price: '$18',
    rating: 4.9,
    reviews: 243,
    description: 'Dark chocolate dome melted tableside with hot salted caramel sauce, revealing hazelnut praline mousse and gold flakes.',
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80',
    tags: ['Sweet', 'Best Seller', 'Tableside Service'],
    prepTime: '10 mins',
    calories: '510 kcal'
  },
  {
    id: 'd2',
    category: 'desserts',
    name: 'Saffron Pistachio Tres Leches',
    price: '$16',
    rating: 4.8,
    reviews: 115,
    description: 'Sponge cake soaked in three milks infused with Kashmiri saffron, topped with whipped cream and crushed Iranian pistachios.',
    image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80',
    tags: ['Vegetarian', 'Sweet'],
    prepTime: '8 mins',
    calories: '450 kcal'
  },

  // DRINKS
  {
    id: 'dr1',
    category: 'drinks',
    name: 'Smoked Rosemary Old Fashioned',
    price: '$19',
    rating: 4.9,
    reviews: 167,
    description: 'Premium Kentucky bourbon, Angostura bitters, orange peel, smoked under glass tableside with dried rosemary sprigs.',
    image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=600&q=80',
    tags: ['Contains Alcohol', 'Smoked'],
    prepTime: '5 mins',
    calories: '150 kcal'
  },
  {
    id: 'dr2',
    category: 'drinks',
    name: 'Hibiscus Rose Elixir',
    price: '$12',
    rating: 4.7,
    reviews: 78,
    description: 'Mocktail made of cold-steeped organic hibiscus flower, rosewater infusion, club soda, and fresh mint leaves.',
    image: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=600&q=80',
    tags: ['Mocktail', 'Organic', 'Refreshing'],
    prepTime: '4 mins',
    calories: '90 kcal'
  },

  // COFFEE
  {
    id: 'co1',
    category: 'coffee',
    name: 'Geisha Gold Brew Latté',
    price: '$14',
    rating: 4.9,
    reviews: 134,
    description: 'Rare Geisha coffee beans brewed as espresso, blended with steamed macadamia milk and topped with 24k gold leaf art.',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
    tags: ['Premium Beans', 'Best Seller'],
    prepTime: '6 mins',
    calories: '180 kcal'
  },
  {
    id: 'co2',
    category: 'coffee',
    name: 'Affogato Al Pistacchio',
    price: '$11',
    rating: 4.8,
    reviews: 94,
    description: 'A double shot of espresso poured over artisanal Sicilian pistachio gelato, topped with roasted pistachio crumbs.',
    image: 'https://images.unsplash.com/photo-1594911774802-8822a707cbb3?auto=format&fit=crop&w=600&q=80',
    tags: ['Dessert Coffee', 'Vegetarian'],
    prepTime: '5 mins',
    calories: '260 kcal'
  }
];
