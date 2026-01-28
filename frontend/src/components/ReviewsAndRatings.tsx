import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import { Star, Quote } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/pagination';

// Mock data for reviews
const mockReviews = [
  {
    id: 1,
    name: "Sarah Johnson",
    rating: 5,
    comment: "The food arrived hot and fresh, exactly as described. The delivery driver was incredibly friendly and punctual. Will definitely order again!",
    date: "2023-10-15",
    avatar: "https://randomuser.me/api/portraits/women/32.jpg"
  },
  {
    id: 2,
    name: "Michael Chen",
    rating: 4,
    comment: "Great selection of restaurants and easy ordering process. My Thai curry was delicious and authentic. Only complaint is it took a bit longer than estimated.",
    date: "2023-10-18",
    avatar: "https://randomuser.me/api/portraits/men/44.jpg"
  },
  {
    id: 3,
    name: "Emma Rodriguez",
    rating: 5,
    comment: "Absolutely love this service! The variety of cuisines available is impressive. Customer service helped resolve an issue with my order quickly and professionally.",
    date: "2023-10-20",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg"
  },
  {
    id: 4,
    name: "David Kim",
    rating: 5,
    comment: "As someone who works long hours, this food delivery service has been a lifesaver. The quality is consistently excellent and the app is very user-friendly.",
    date: "2023-10-22",
    avatar: "https://randomuser.me/api/portraits/men/22.jpg"
  }
];

const ReviewsAndRatings: React.FC = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 to-orange-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            What Our Customers Say
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Join thousands of satisfied customers enjoying delicious meals delivered to their door
          </p>
        </div>
        
        <Swiper
          modules={[Pagination, Autoplay]}
          spaceBetween={30}
          slidesPerView={1}
          breakpoints={{
            640: {
              slidesPerView: 2,
            },
            1024: {
              slidesPerView: 3,
            },
          }}
          pagination={{ clickable: true }}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          loop={true}
          className="reviews-swiper"
        >
          {mockReviews.map((review) => (
            <SwiperSlide key={review.id}>
              <div className="bg-white rounded-2xl shadow-lg p-6 h-full flex flex-col">
                <div className="flex items-center mb-4">
                  <Quote className="w-6 h-6 text-orange-500 mr-2" />
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                </div>
                
                <p className="text-gray-600 italic flex-grow mb-6">
                  "{review.comment}"
                </p>
                
                <div className="flex items-center mt-auto pt-4 border-t border-gray-100">
                  <img 
                    src={review.avatar} 
                    alt={review.name} 
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <h4 className="font-bold text-gray-800">{review.name}</h4>
                    <p className="text-sm text-gray-500">{review.date}</p>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        
        {/* Stats section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-4xl font-bold text-orange-500 mb-2">4.8/5</div>
            <div className="text-gray-600">Average Rating</div>
            <div className="flex justify-center mt-2">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-5 h-5 ${i < 5 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                />
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-4xl font-bold text-orange-500 mb-2">10,000+</div>
            <div className="text-gray-600">Happy Customers</div>
            <div className="mt-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 w-4/5"></div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-4xl font-bold text-orange-500 mb-2">500+</div>
            <div className="text-gray-600">Partner Restaurants</div>
            <div className="mt-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReviewsAndRatings;