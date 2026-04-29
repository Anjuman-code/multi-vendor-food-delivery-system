/**
 * Explore service – aggregates data for home page discovery sections.
 */
import mongoose from "mongoose";
import MenuCategory from "../models/MenuCategory";
import MenuItem from "../models/MenuItem";
import Restaurant from "../models/Restaurant";
import Order from "../models/Order";

const MAX_LIMIT = 20;

const clampLimit = (limit: number) =>
  Math.max(1, Math.min(Math.floor(limit), MAX_LIMIT));

export interface TopCategorySummary {
  name: string;
  restaurantCount: number;
  image?: string;
  tags: string[];
}

interface CategoryAggregate {
  name: string;
  categoryIds: mongoose.Types.ObjectId[];
  restaurantCount: number;
  cuisineSets?: string[][];
}

interface CategoryImageAggregate {
  _id: mongoose.Types.ObjectId;
  image?: string;
}

export interface TrendingMenuItemSummary {
  _id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  restaurantId: string;
  restaurantName: string;
  rating?: number;
  orderCount?: number;
}

interface TrendingItemAggregate {
  _id: mongoose.Types.ObjectId;
  name: string;
  price: number;
  image?: string;
  category?: string;
  restaurantId: mongoose.Types.ObjectId;
  restaurantName: string;
  rating?: number;
  orderCount?: number;
}

export interface PopularRestaurantSummary {
  _id: string;
  name: string;
  description?: string;
  cuisineType?: string[];
  rating?: {
    average?: number;
    count?: number;
  };
  deliveryTime?: string;
  address?: {
    city?: string;
    state?: string;
  };
  images?: {
    coverPhoto?: string;
  };
  menuHighlights: string[];
}

interface PopularRestaurantRecord {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  cuisineType?: string[];
  rating?: {
    average?: number;
    count?: number;
  };
  deliveryTime?: string;
  address?: {
    city?: string;
    state?: string;
  };
  images?: {
    coverPhoto?: string;
  };
}

interface MenuHighlightAggregate {
  _id: mongoose.Types.ObjectId;
  items: string[];
}

const mapTrendingItems = (items: TrendingItemAggregate[]) =>
  items.map((item) => ({
    _id: item._id.toString(),
    name: item.name,
    price: item.price,
    image: item.image,
    category: item.category,
    restaurantId: item.restaurantId.toString(),
    restaurantName: item.restaurantName,
    rating: item.rating ?? 0,
    orderCount: item.orderCount,
  }));

export const fetchTopCategories = async (
  limit: number,
): Promise<TopCategorySummary[]> => {
  const safeLimit = clampLimit(limit);

  const categories = await MenuCategory.aggregate<CategoryAggregate>([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: "restaurants",
        localField: "restaurantId",
        foreignField: "_id",
        as: "restaurant",
      },
    },
    { $unwind: "$restaurant" },
    {
      $match: {
        "restaurant.isActive": true,
        "restaurant.approvalStatus": "approved",
      },
    },
    { $addFields: { nameLower: { $toLower: "$name" } } },
    {
      $group: {
        _id: "$nameLower",
        name: { $first: "$name" },
        categoryIds: { $addToSet: "$_id" },
        restaurantIds: { $addToSet: "$restaurantId" },
        cuisineSets: { $addToSet: "$restaurant.cuisineType" },
      },
    },
    {
      $project: {
        _id: 0,
        name: 1,
        categoryIds: 1,
        restaurantCount: { $size: "$restaurantIds" },
        cuisineSets: 1,
      },
    },
    { $sort: { restaurantCount: -1, name: 1 } },
    { $limit: safeLimit },
  ]);

  if (categories.length === 0) return [];

  const categoryIds = categories.flatMap((category) => category.categoryIds);
  const images = await MenuItem.aggregate<CategoryImageAggregate>([
    {
      $match: {
        categoryId: { $in: categoryIds },
        isAvailable: true,
        image: { $exists: true, $ne: "" },
      },
    },
    { $sort: { updatedAt: -1 } },
    { $group: { _id: "$categoryId", image: { $first: "$image" } } },
  ]);

  const imageByCategoryId = new Map(
    images
      .filter((entry) => Boolean(entry.image))
      .map((entry) => [entry._id.toString(), entry.image as string]),
  );

  return categories.map((category) => {
    const image = category.categoryIds
      .map((id) => imageByCategoryId.get(id.toString()))
      .find(Boolean);
    const flattenedTags = (category.cuisineSets ?? [])
      .flat()
      .filter(Boolean)
      .map((tag) => tag.toLowerCase());
    const tags = Array.from(new Set(flattenedTags)).slice(0, 6);

    return {
      name: category.name,
      restaurantCount: category.restaurantCount,
      image,
      tags,
    };
  });
};

export const fetchTrendingItems = async (
  limit: number,
): Promise<TrendingMenuItemSummary[]> => {
  const safeLimit = clampLimit(limit);

  const itemsFromOrders = await Order.aggregate<TrendingItemAggregate>([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.menuItemId",
        orderCount: { $sum: "$items.quantity" },
      },
    },
    { $sort: { orderCount: -1 } },
    {
      $lookup: {
        from: "menuitems",
        localField: "_id",
        foreignField: "_id",
        as: "item",
      },
    },
    { $unwind: "$item" },
    { $match: { "item.isAvailable": true } },
    {
      $lookup: {
        from: "menucategories",
        localField: "item.categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "restaurants",
        localField: "item.restaurantId",
        foreignField: "_id",
        as: "restaurant",
      },
    },
    { $unwind: "$restaurant" },
    {
      $match: {
        "restaurant.isActive": true,
        "restaurant.approvalStatus": "approved",
      },
    },
    {
      $project: {
        _id: "$item._id",
        name: "$item.name",
        price: "$item.price",
        image: "$item.image",
        category: "$category.name",
        restaurantId: "$restaurant._id",
        restaurantName: "$restaurant.name",
        rating: "$restaurant.rating.average",
        orderCount: 1,
      },
    },
    { $sort: { orderCount: -1 } },
    { $limit: safeLimit },
  ]);

  if (itemsFromOrders.length > 0) {
    return mapTrendingItems(itemsFromOrders);
  }

  const fallbackItems = await MenuItem.aggregate<TrendingItemAggregate>([
    { $match: { isAvailable: true } },
    {
      $lookup: {
        from: "restaurants",
        localField: "restaurantId",
        foreignField: "_id",
        as: "restaurant",
      },
    },
    { $unwind: "$restaurant" },
    {
      $match: {
        "restaurant.isActive": true,
        "restaurant.approvalStatus": "approved",
      },
    },
    {
      $lookup: {
        from: "menucategories",
        localField: "categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    { $sort: { updatedAt: -1 } },
    { $limit: safeLimit },
    {
      $project: {
        _id: "$_id",
        name: "$name",
        price: "$price",
        image: "$image",
        category: "$category.name",
        restaurantId: "$restaurant._id",
        restaurantName: "$restaurant.name",
        rating: "$restaurant.rating.average",
      },
    },
  ]);

  return mapTrendingItems(fallbackItems);
};

export const fetchPopularRestaurants = async (
  limit: number,
): Promise<PopularRestaurantSummary[]> => {
  const safeLimit = clampLimit(limit);

  const restaurants = await Restaurant.find({
    isActive: true,
    approvalStatus: "approved",
  })
    .select("name description cuisineType rating deliveryTime address images")
    .sort({ "rating.average": -1, "rating.count": -1, createdAt: -1 })
    .limit(safeLimit)
    .lean<PopularRestaurantRecord[]>();

  if (restaurants.length === 0) return [];

  const restaurantIds = restaurants.map((restaurant) => restaurant._id);
  const menuHighlights = await MenuItem.aggregate<MenuHighlightAggregate>([
    {
      $match: {
        restaurantId: { $in: restaurantIds },
        isAvailable: true,
      },
    },
    { $sort: { updatedAt: -1 } },
    {
      $group: {
        _id: "$restaurantId",
        items: { $push: "$name" },
      },
    },
    {
      $project: {
        items: { $slice: ["$items", 3] },
      },
    },
  ]);

  const highlightsByRestaurant = new Map(
    menuHighlights.map((entry) => [entry._id.toString(), entry.items]),
  );

  return restaurants.map((restaurant) => ({
    _id: restaurant._id.toString(),
    name: restaurant.name,
    description: restaurant.description,
    cuisineType: restaurant.cuisineType,
    rating: restaurant.rating,
    deliveryTime: restaurant.deliveryTime,
    address: restaurant.address,
    images: restaurant.images,
    menuHighlights: highlightsByRestaurant.get(restaurant._id.toString()) || [],
  }));
};
