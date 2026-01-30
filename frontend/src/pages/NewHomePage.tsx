import React from "react";
import NewHeroSection from "../components/NewHeroSection";
import HowItWorksSection from "../components/HowItWorksSection";
import BannerSearchSection from "../components/BannerSearchSection";
import NearbyRestaurants from "../components/NearbyRestaurants";
import TopFoodCategories from "../components/TopFoodCategories";
import TrendingFoodItems from "../components/TrendingFoodItems";
import PopularRestaurants from "../components/PopularRestaurants";
import ReviewsAndRatings from "../components/ReviewsAndRatings";

/**
 * NewHomePage - The main landing page of the application.
 *
 * This page is wrapped by MainLayout which provides:
 * - Navbar at the top
 * - Footer at the bottom
 * - Page transition animations
 */
const NewHomePage: React.FC = () => {
  return (
    <>
      <NewHeroSection />
      <HowItWorksSection />
      <BannerSearchSection />
      <NearbyRestaurants />
      <TopFoodCategories />
      <TrendingFoodItems />
      <PopularRestaurants />
      <ReviewsAndRatings />
    </>
  );
};

export default NewHomePage;
