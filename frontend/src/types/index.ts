export interface MenuItem {
  id: string;
  category: string;
  name: string;
  price: string;
  rating: number;
  reviews: number;
  description: string;
  image: string;
  tags: string[];
  prepTime: string;
  calories: string;
}

export interface ReservationData {
  name: string;
  email: string;
  date: string;
  time: string;
  guests: number;
  dietary: string;
  notes?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  image: string;
  quote: string;
  rating: number;
}

export interface SpecialOffer {
  id: string;
  title: string;
  discount: string;
  description: string;
  badge: string;
  image: string;
  code: string;
}
