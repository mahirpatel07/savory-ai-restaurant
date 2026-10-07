import { MenuItem, Testimonial, SpecialOffer } from '../types';

export const categories = [
  { id: 'ai', name: 'AI Chef Recommendations' },
  { id: 'pizza', name: 'Artisanal Pizza' },
  { id: 'burger', name: 'Gourmet Burgers' },
  { id: 'pasta', name: 'Handcrafted Pasta' },
  { id: 'chinese', name: 'Imperial Chinese' },
  { id: 'indian', name: 'Royal Indian' },
  { id: 'south-indian', name: 'Deccan Delights' },
  { id: 'desserts', name: 'Decadent Desserts' },
  { id: 'drinks', name: 'Artisanal Drinks' },
  { id: 'coffee', name: 'Reserve Coffee' }
];

export const menuItems: MenuItem[] = [
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
    description: 'Buttermilk fried chicken breast, black truffle dynamic glaze, cabbage slaw, and pickles on a toasted bun.',
    image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80',
    tags: ['Crispy', 'Premium'],
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
    description: 'Super-crisp fermented rice crepe drizzled with pure cow ghee and edible gold dust, served with sambar and coconut chutneys.',
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
    tags: ['Sweet', 'Best Seller'],
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
    tags: ['Alcohol', 'Smoked'],
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
    tags: ['Mocktail', 'Organic'],
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
    description: 'A double shot of espresso poured over Sicilian pistachio gelato, topped with roasted pistachio crumbs.',
    image: 'https://images.unsplash.com/photo-1594911774802-8822a707cbb3?auto=format&fit=crop&w=600&q=80',
    tags: ['Dessert Coffee', 'Vegetarian'],
    prepTime: '5 mins',
    calories: '260 kcal'
  }
];

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    name: 'Sophia Laurent',
    role: 'Gastronomy Columnist',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
    quote: 'An absolute masterpiece of sensory delight. The AI Sommelier recommendations paired the Truffle & Wild Mushroom Pizza flawlessly. Simply extraordinary.',
    rating: 5
  },
  {
    id: 't2',
    name: 'Marcus Vance',
    role: 'Food Tech Investor',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    quote: 'Savory brings molecular gastronomy into the digital age. The interface is Stripe-smooth and the Geisha Latté tasted like pure technology.',
    rating: 5
  },
  {
    id: 't3',
    name: 'Elena Rostova',
    role: 'Michelin Guide Reviewer',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    quote: 'From the tableside smoked cocktails to the gold-roasted ghee crepes, the attention to detail is staggering. Chef Jean-Pierre is a genius.',
    rating: 5
  }
];

export const specialOffers: SpecialOffer[] = [
  {
    id: 'o1',
    title: 'The Saffron & Gold Experience',
    discount: '15% OFF',
    description: 'Relish a curated 5-course saffron and gold leaf tasting menu tailored by our AI Sommelier.',
    badge: 'Limited Curation',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80',
    code: 'GOLDEN15'
  },
  {
    id: 'o2',
    title: 'Truffle & Barrel Pairings',
    discount: 'COMPLIMENTARY PAIRING',
    description: 'Secure a tableside reservation this week and receive a complimentary smoked rosemary Old Fashioned.',
    badge: 'Chef Special',
    image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=500&q=80',
    code: 'TRUFFLESMOKE'
  }
];

export const chefData = {
  name: 'Chef Jean-Pierre',
  title: 'Director of Culinary Laboratories',
  image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=600&q=80',
  description: 'With over 25 years of research in molecular structures and Michelin-starred kitchens, Chef Jean-Pierre merges organic ingredients with computational food science to deliver customized gastronomic art.',
  experienceYears: 25,
  michelinStars: 3,
  awardsCount: 18
};
