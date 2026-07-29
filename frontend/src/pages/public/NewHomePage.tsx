import HowItWorksSection from '@/components/HowItWorksSection';
import JoinFoodRushSection from '@/components/JoinFoodRushSection';
import NearbyRestaurants from '@/components/NearbyRestaurants';
import NewHeroSection from '@/components/NewHeroSection';
import PopularRestaurants from '@/components/PopularRestaurants';
import ReviewsAndRatings from '@/components/ReviewsAndRatings';
import TopFoodCategories from '@/components/TopFoodCategories';
import React from 'react';

const NewHomePage: React.FC = () => {
  return (
    <>
      <NewHeroSection />
      <TopFoodCategories />
      <NearbyRestaurants />
      <PopularRestaurants />
      <HowItWorksSection />
      <ReviewsAndRatings />
      <JoinFoodRushSection />
    </>
  );
};

export default NewHomePage;
