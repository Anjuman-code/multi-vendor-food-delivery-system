import HowItWorksSection from "@/components/HowItWorksSection";
import JoinFoodRushSection from "@/components/JoinFoodRushSection";
import NearbyRestaurants from "@/components/NearbyRestaurants";
import NewHeroSection from "@/components/NewHeroSection";
import PopularRestaurants from "@/components/PopularRestaurants";
import ReviewsAndRatings from "@/components/ReviewsAndRatings";
import TopFoodCategories from "@/components/TopFoodCategories";
import TrendingFoodItems from "@/components/TrendingFoodItems";
import React from "react";

/**
 * NewHomePage — the landing page.
 *
 * Wrapped by MainLayout (navbar + footer + page transition). Section order
 * moves the visitor from "find food" (hero search → categories → restaurants)
 * to trust (how it works → reviews) to growth (join the platform).
 */
const NewHomePage: React.FC = () => {
  return (
    <>
      <NewHeroSection />
      <TopFoodCategories />
      <NearbyRestaurants />
      <PopularRestaurants />
      <TrendingFoodItems />
      <HowItWorksSection />
      <ReviewsAndRatings />
      <JoinFoodRushSection />
    </>
  );
};

export default NewHomePage;
