export const restaurantInfo = {
  name: 'Savory',
  address: '452 Culinary Heights, Upper Manhattan, NY 10022',
  openingHours: '11:00 AM',
  closingHours: '12:00 PM',
  phone: '+1 (212) 555-8942',
  email: 'concierge@savory.com',
  cuisine: 'Molecular Gastronomy & Modern Italian',
  facilities: ['Parking', 'WiFi', 'Indoor Seating', 'Outdoor Terrace', 'VIP Lounge'],
  parking: 'Valet parking available',
  wifi: 'Complimentary high-speed WiFi',
  paymentMethods: ['Credit Cards', 'Apple Pay', 'Google Pay', 'Cash']
};

export const menuData = [
  {
    category: '🍕 Pizza',
    items: [
      { name: 'Truffle & Wild Mushroom', price: '$28', description: 'Chanterelle, shiitake, mozzarella, white truffle oil.' },
      { name: 'Prosciutto Di Parma', price: '$26', description: 'San Marzano tomato, buffalo mozzarella, prosciutto.' }
    ]
  },
  {
    category: '🍔 Burgers',
    items: [
      { name: 'The Wagyu Gold Standard', price: '$34', description: 'A5 Wagyu, white cheddar, truffle aioli, gold leaf.' },
      { name: 'Black Truffle Crispy Chicken', price: '$22', description: 'Buttermilk fried chicken, black truffle glaze.' }
    ]
  },
  {
    category: '🥗 Salads',
    items: [
      { name: 'Organic Kale & Quinoa', price: '$18', description: 'Baby kale, toasted quinoa, roasted beets, lemon-tahini dressing.' },
      { name: 'Heirloom Burrata', price: '$22', description: 'Heirloom tomatoes, balsamic glaze, fresh basil.' }
    ]
  },
  {
    category: '🍝 Pasta',
    items: [
      { name: 'Lobster Tagliolini', price: '$38', description: 'Hand-rolled pasta, Maine lobster, saffron cream.' },
      { name: 'Wild Boar Pappardelle', price: '$29', description: 'Slow-braised wild boar ragu, aged Pecorino.' }
    ]
  },
  {
    category: '🥤 Drinks',
    items: [
      { name: 'Hibiscus Rose Elixir', price: '$12', description: 'Cold-steeped hibiscus, rosewater infusion.' },
      { name: 'Smoked Rosemary Old Fashioned', price: '$19', description: 'Premium bourbon, Angostura, smoked rosemary.' }
    ]
  },
  {
    category: '🍰 Desserts',
    items: [
      { name: 'Decadent Chocolate Sphere', price: '$18', description: 'Melted chocolate dome, praline mousse.' },
      { name: 'Saffron Tres Leches', price: '$16', description: 'Sponge cake, Kashmiri saffron, crushed pistachios.' }
    ]
  }
];
