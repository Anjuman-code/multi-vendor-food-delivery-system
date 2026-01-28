import React from 'react';
import Navbar from '../components/Navbar';
import NewHeroSection from '../components/NewHeroSection';
import OrderAndDeliveryProcess from '../components/OrderAndDeliveryProcess';
import BannerSearchSection from '../components/BannerSearchSection';
import NearbyRestaurants from '../components/NearbyRestaurants';
import TopFoodCategories from '../components/TopFoodCategories';
import TrendingFoodItems from '../components/TrendingFoodItems';
import PopularRestaurants from '../components/PopularRestaurants';
import ReviewsAndRatings from '../components/ReviewsAndRatings';
import Footer from '../components/Footer';

const NewHomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main id="main-content" role="main">
        <NewHeroSection />
        <OrderAndDeliveryProcess />
        <BannerSearchSection />
        <NearbyRestaurants />
        <TopFoodCategories />
        <TrendingFoodItems />
        <PopularRestaurants />
        <ReviewsAndRatings />
      </main>
      <Footer />
    </div>
  );
};

export default NewHomePage;