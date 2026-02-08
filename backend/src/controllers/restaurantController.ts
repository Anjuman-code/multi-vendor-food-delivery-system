import { Request, Response } from "express";
import mongoose from "mongoose";
import Restaurant from "../models/Restaurant";

/** Safely extract an error message from an unknown caught value */
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown error";

// ────────────────────────────────────────────────────────────────
// Controllers
// ────────────────────────────────────────────────────────────────

/** GET /api/restaurants – all active & approved restaurants */
export const getAllRestaurants = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const restaurants = await Restaurant.find({
      isActive: true,
      approvalStatus: "approved",
    })
      .select("-__v")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants,
    });
  } catch (error: unknown) {
    console.error("Error fetching restaurants:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching restaurants",
      error: getErrorMessage(error),
    });
  }
};

/** GET /api/restaurants/:id */
export const getRestaurantById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select("-__v");

    if (!restaurant) {
      res.status(404).json({ success: false, message: "Restaurant not found" });
      return;
    }

    if (!restaurant.isActive || restaurant.approvalStatus !== "approved") {
      res.status(404).json({ success: false, message: "Restaurant not found" });
      return;
    }

    res.status(200).json({ success: true, data: restaurant });
  } catch (error: unknown) {
    console.error("Error fetching restaurant:", error);

    if (error instanceof mongoose.Error.CastError) {
      res
        .status(400)
        .json({ success: false, message: "Invalid restaurant ID format" });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Server error while fetching restaurant",
      error: getErrorMessage(error),
    });
  }
};

/** POST /api/restaurants */
export const createRestaurant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const restaurant = new Restaurant(req.body);
    await restaurant.save();

    res.status(201).json({
      success: true,
      message: "Restaurant created successfully",
      data: restaurant,
    });
  } catch (error: unknown) {
    console.error("Error creating restaurant:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(error.errors).map((e) => e.message);
      res
        .status(400)
        .json({ success: false, message: "Validation error", errors });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Server error while creating restaurant",
      error: getErrorMessage(error),
    });
  }
};

/** PUT /api/restaurants/:id */
export const updateRestaurant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    ).select("-__v");

    if (!restaurant) {
      res.status(404).json({ success: false, message: "Restaurant not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Restaurant updated successfully",
      data: restaurant,
    });
  } catch (error: unknown) {
    console.error("Error updating restaurant:", error);

    if (error instanceof mongoose.Error.CastError) {
      res
        .status(400)
        .json({ success: false, message: "Invalid restaurant ID format" });
      return;
    }

    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(error.errors).map((e) => e.message);
      res
        .status(400)
        .json({ success: false, message: "Validation error", errors });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Server error while updating restaurant",
      error: getErrorMessage(error),
    });
  }
};

/** DELETE /api/restaurants/:id */
export const deleteRestaurant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);

    if (!restaurant) {
      res.status(404).json({ success: false, message: "Restaurant not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Restaurant deleted successfully",
      data: restaurant,
    });
  } catch (error: unknown) {
    console.error("Error deleting restaurant:", error);

    if (error instanceof mongoose.Error.CastError) {
      res
        .status(400)
        .json({ success: false, message: "Invalid restaurant ID format" });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Server error while deleting restaurant",
      error: getErrorMessage(error),
    });
  }
};

/** GET /api/restaurants/featured – top rated restaurants */
export const getFeaturedRestaurants = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const restaurants = await Restaurant.find({
      isActive: true,
      approvalStatus: "approved",
    })
      .select("-__v")
      .sort({ "rating.average": -1, "rating.count": -1, createdAt: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants,
    });
  } catch (error: unknown) {
    console.error("Error fetching featured restaurants:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching featured restaurants",
      error: getErrorMessage(error),
    });
  }
};
