/**
 * Explore service – aggregates data for home page discovery sections.
 */
import mongoose from "mongoose";
import MenuCategory from "../models/MenuCategory";
import MenuItem from "../models/MenuItem";
import Order from "../models/Order";
import Restaurant from "../models/Restaurant";

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
  deliveryTime?: { min: number; max: number };
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
  deliveryTime?: { min: number; max: number };
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

export interface MenuItemByCategory {
  _id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image?: string;
  categoryId: string;
  categoryName: string;
  restaurantId: string;
  restaurantName: string;
  isAvailable: boolean;
  dietaryTags: string[];
  preparationTime: number;
  rating?: number;
  reviewCount?: number;
  isPopular: boolean;
}

export const fetchMenuItemsByCategory = async (
  categoryName: string,
  limit: number = 50,
  offset: number = 0,
): Promise<MenuItemByCategory[]> => {
  const safeLimit = clampLimit(limit);

  const items = await MenuItem.aggregate([
    {
      $lookup: {
        from: "menucategories",
        localField: "categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $match: {
        isAvailable: true,
        $or: [
          { "category.name": { $regex: new RegExp(`^${categoryName}$`, "i") } },
          { "category.name": { $regex: new RegExp(`^${categoryName}`, "i") } },
        ],
      },
    },
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
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        price: 1,
        originalPrice: 1,
        image: 1,
        categoryId: "$category._id",
        categoryName: "$category.name",
        restaurantId: "$restaurant._id",
        restaurantName: "$restaurant.name",
        isAvailable: 1,
        dietaryTags: 1,
        preparationTime: 1,
        rating: "$restaurant.rating.average",
        reviewCount: "$restaurant.rating.count",
        isPopular: 1,
      },
    },
    { $sort: { isPopular: -1, name: 1 } },
    { $skip: offset },
    { $limit: safeLimit },
  ]);

  return items.map((item) => ({
    _id: item._id.toString(),
    name: item.name,
    description: item.description || "",
    price: item.price,
    originalPrice: item.originalPrice,
    image: item.image,
    categoryId: item.categoryId?.toString() || "",
    categoryName: item.categoryName || "",
    restaurantId: item.restaurantId?.toString() || "",
    restaurantName: item.restaurantName || "",
    isAvailable: item.isAvailable,
    dietaryTags: item.dietaryTags || [],
    preparationTime: item.preparationTime || 30,
    rating: item.rating || 0,
    reviewCount: item.reviewCount || 0,
    isPopular: item.isPopular || false,
  }));
};

export interface ExploreMenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image?: string;
  categoryId: string;
  categoryName: string;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  isAvailable: boolean;
  stockStatus: string;
  dietaryTags: string[];
  preparationTime: number;
  rating: number;
  reviewCount: number;
  isPopular: boolean;
  isFeatured: boolean;
  spiceLevel: string;
  isOpen: boolean;
  isTemporarilyClosed: boolean;
  deliveryTime: { min: number; max: number };
  deliveryFee: number;
  variants: Array<{ _id?: string; name: string; price: number }>;
  addons: Array<{ _id?: string; name: string; price: number; isRequired?: boolean }>;
}

export interface ExploreCategoriesResult {
  name: string;
  itemCount: number;
  restaurantCount: number;
  image?: string;
  icon?: string;
}

export interface ExploreMenuItemsResult {
  items: ExploreMenuItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  priceRange: { min: number; max: number };
}

export const isRestaurantOpenNow = (
  restaurant: {
    isActive?: boolean;
    isTemporarilyClosed?: boolean;
    operatingHours?: Array<{
      day: string;
      openTime: string;
      closeTime: string;
      isOpen: boolean;
    }>;
  },
  now: Date = new Date(),
): boolean => {
  if (!restaurant.isActive || restaurant.isTemporarilyClosed) {
    return false;
  }
  if (!restaurant.operatingHours || restaurant.operatingHours.length === 0) {
    return true;
  }

  // Bangladesh timezone (UTC+6)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const bdDate = new Date(utc + 6 * 3600000);

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayName = days[bdDate.getDay()];
  const todaySchedule = restaurant.operatingHours.find(
    (h) => h.day.toLowerCase() === dayName.toLowerCase(),
  );

  if (!todaySchedule || !todaySchedule.isOpen) {
    return false;
  }

  const curHour = String(bdDate.getHours()).padStart(2, "0");
  const curMin = String(bdDate.getMinutes()).padStart(2, "0");
  const currentTime = `${curHour}:${curMin}`;

  return (
    currentTime >= todaySchedule.openTime && currentTime <= todaySchedule.closeTime
  );
};

export const fetchExploreCategories = async (): Promise<ExploreCategoriesResult[]> => {
  const categories = await MenuCategory.aggregate<ExploreCategoriesResult>([
    { $match: { isActive: true, deletedAt: null } },
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
        "restaurant.deletedAt": null,
      },
    },
    {
      $lookup: {
        from: "menuitems",
        localField: "_id",
        foreignField: "categoryId",
        as: "items",
      },
    },
    { $unwind: "$items" },
    {
      $match: {
        "items.isAvailable": true,
        "items.deletedAt": null,
        "items.stockStatus": { $ne: "hidden" },
      },
    },
    {
      $group: {
        _id: { $toLower: "$name" },
        name: { $first: "$name" },
        itemCount: { $sum: 1 },
        restaurantIds: { $addToSet: "$restaurantId" },
        image: { $first: "$image" },
        itemImage: { $first: "$items.image" },
        icon: { $first: "$icon" },
      },
    },
    { $match: { itemCount: { $gt: 0 } } },
    {
      $project: {
        _id: 0,
        name: 1,
        itemCount: 1,
        restaurantCount: { $size: "$restaurantIds" },
        image: { $ifNull: ["$image", "$itemImage"] },
        icon: 1,
      },
    },
    { $sort: { name: 1 } },
  ]);

  return categories;
};

export interface ExploreSearchOptions {
  search?: string;
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  openNow?: boolean;
  dietaryTags?: string[];
  restaurantIds?: string[];
  cuisines?: string[];
  sort?: "popular" | "price_asc" | "price_desc" | "rating" | "newest";
  page?: number;
  limit?: number;
}

export const searchExploreMenuItems = async (
  opts: ExploreSearchOptions,
): Promise<ExploreMenuItemsResult> => {
  const page = Math.max(1, opts.page || 1);
  const limit = Math.max(1, Math.min(opts.limit || 20, 50));
  const skip = (page - 1) * limit;

  // Base match for active and available menu items
  const matchCriteria: Record<string, unknown>[] = [
    { isAvailable: true, deletedAt: null, stockStatus: { $ne: "hidden" } },
  ];

  if (typeof opts.minPrice === "number") {
    matchCriteria.push({ price: { $gte: opts.minPrice } });
  }
  if (typeof opts.maxPrice === "number") {
    matchCriteria.push({ price: { $lte: opts.maxPrice } });
  }

  if (opts.dietaryTags && opts.dietaryTags.length > 0) {
    matchCriteria.push({
      dietaryTags: {
        $in: opts.dietaryTags.map((tag) => new RegExp(`^${tag}$`, "i")),
      },
    });
  }

  if (opts.restaurantIds && opts.restaurantIds.length > 0) {
    const validIds = opts.restaurantIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (validIds.length > 0) {
      matchCriteria.push({ restaurantId: { $in: validIds } });
    }
  }

  // Pipeline assembly
  const pipeline: mongoose.PipelineStage[] = [
    { $match: matchCriteria.length === 1 ? matchCriteria[0] : { $and: matchCriteria } },
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
        "restaurant.deletedAt": null,
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
  ];

  // Secondary match for restaurant / category / search criteria
  const postLookupMatch: Record<string, unknown>[] = [];

  if (opts.search) {
    const term = opts.search.trim();
    const regex = new RegExp(term, "i");
    postLookupMatch.push({
      $or: [
        { name: { $regex: regex } },
        { description: { $regex: regex } },
        { "restaurant.name": { $regex: regex } },
        { "category.name": { $regex: regex } },
        { "restaurant.cuisineType": { $regex: regex } },
      ],
    });
  }

  if (opts.categories && opts.categories.length > 0) {
    const catRegexes = opts.categories.map((c) => new RegExp(`^${c.trim()}$`, "i"));
    postLookupMatch.push({
      "category.name": { $in: catRegexes },
    });
  }

  if (typeof opts.minRating === "number") {
    postLookupMatch.push({
      "restaurant.rating.average": { $gte: opts.minRating },
    });
  }

  if (opts.cuisines && opts.cuisines.length > 0) {
    const cuisineRegexes = opts.cuisines.map((c) => new RegExp(`^${c.trim()}$`, "i"));
    postLookupMatch.push({
      "restaurant.cuisineType": { $in: cuisineRegexes },
    });
  }

  if (opts.openNow) {
    postLookupMatch.push({
      "restaurant.isTemporarilyClosed": false,
    });
  }

  if (postLookupMatch.length > 0) {
    pipeline.push({
      $match:
        postLookupMatch.length === 1 ? postLookupMatch[0] : { $and: postLookupMatch },
    });
  }

  // Sort definition
  let sortStage: Record<string, 1 | -1> = {
    isPopular: -1,
    "restaurant.rating.average": -1,
    name: 1,
  };
  if (opts.sort === "price_asc") {
    sortStage = { price: 1, name: 1 };
  } else if (opts.sort === "price_desc") {
    sortStage = { price: -1, name: 1 };
  } else if (opts.sort === "rating") {
    sortStage = {
      "restaurant.rating.average": -1,
      "restaurant.rating.count": -1,
      name: 1,
    };
  } else if (opts.sort === "newest") {
    sortStage = { createdAt: -1 };
  }

  pipeline.push({
    $facet: {
      totalCount: [{ $count: "count" }],
      priceStats: [
        {
          $group: {
            _id: null,
            minPrice: { $min: "$price" },
            maxPrice: { $max: "$price" },
          },
        },
      ],
      data: [
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            name: 1,
            description: 1,
            price: 1,
            originalPrice: 1,
            image: 1,
            categoryId: "$category._id",
            categoryName: "$category.name",
            restaurantId: "$restaurant._id",
            restaurantName: "$restaurant.name",
            restaurantSlug: "$restaurant.slug",
            isAvailable: 1,
            stockStatus: 1,
            dietaryTags: 1,
            preparationTime: 1,
            rating: "$restaurant.rating.average",
            reviewCount: "$restaurant.rating.count",
            isPopular: 1,
            isFeatured: 1,
            spiceLevel: 1,
            deliveryTime: "$restaurant.deliveryTime",
            deliveryFee: "$restaurant.deliveryFee",
            operatingHours: "$restaurant.operatingHours",
            isTemporarilyClosed: "$restaurant.isTemporarilyClosed",
            isActive: "$restaurant.isActive",
            variants: 1,
            addons: 1,
          },
        },
      ],
    },
  });

  interface FacetResult {
    totalCount: { count: number }[];
    priceStats: { _id: null; minPrice: number; maxPrice: number }[];
    data: Array<{
      _id: mongoose.Types.ObjectId;
      name: string;
      description?: string;
      price: number;
      originalPrice?: number;
      image?: string;
      categoryId?: mongoose.Types.ObjectId;
      categoryName?: string;
      restaurantId: mongoose.Types.ObjectId;
      restaurantName: string;
      restaurantSlug: string;
      isAvailable: boolean;
      stockStatus: string;
      dietaryTags?: string[];
      preparationTime?: number;
      rating?: number;
      reviewCount?: number;
      isPopular?: boolean;
      isFeatured?: boolean;
      spiceLevel?: string;
      deliveryTime?: { min: number; max: number };
      deliveryFee?: number;
      operatingHours?: Array<{
        day: string;
        openTime: string;
        closeTime: string;
        isOpen: boolean;
      }>;
      isTemporarilyClosed?: boolean;
      isActive?: boolean;
      variants?: Array<{ _id?: mongoose.Types.ObjectId; name: string; price: number }>;
      addons?: Array<{
        _id?: mongoose.Types.ObjectId;
        name: string;
        price: number;
        isRequired?: boolean;
      }>;
    }>;
  }

  const [aggregateResult] = await MenuItem.aggregate<FacetResult>(pipeline);

  const total = aggregateResult?.totalCount?.[0]?.count || 0;
  const rawItems = aggregateResult?.data || [];
  const priceMin = aggregateResult?.priceStats?.[0]?.minPrice ?? 0;
  const priceMax = aggregateResult?.priceStats?.[0]?.maxPrice ?? 1000;

  const now = new Date();
  let items: ExploreMenuItem[] = rawItems.map((item) => {
    const isOpen = isRestaurantOpenNow(
      {
        isActive: item.isActive,
        isTemporarilyClosed: item.isTemporarilyClosed,
        operatingHours: item.operatingHours,
      },
      now,
    );

    return {
      _id: item._id.toString(),
      name: item.name,
      description: item.description || "",
      price: item.price,
      originalPrice: item.originalPrice,
      image: item.image,
      categoryId: item.categoryId?.toString() || "",
      categoryName: item.categoryName || "Uncategorized",
      restaurantId: item.restaurantId.toString(),
      restaurantName: item.restaurantName || "Restaurant",
      restaurantSlug: item.restaurantSlug || "",
      isAvailable: item.isAvailable,
      stockStatus: item.stockStatus || "available",
      dietaryTags: item.dietaryTags || [],
      preparationTime: item.preparationTime || 20,
      rating: item.rating ?? 0,
      reviewCount: item.reviewCount ?? 0,
      isPopular: item.isPopular ?? false,
      isFeatured: item.isFeatured ?? false,
      spiceLevel: item.spiceLevel || "none",
      isOpen,
      isTemporarilyClosed: item.isTemporarilyClosed ?? false,
      deliveryTime: item.deliveryTime || { min: 20, max: 45 },
      deliveryFee: item.deliveryFee ?? 0,
      variants: (item.variants || []).map((v) => ({
        _id: v._id?.toString(),
        name: v.name,
        price: v.price,
      })),
      addons: (item.addons || []).map((a) => ({
        _id: a._id?.toString(),
        name: a.name,
        price: a.price,
        isRequired: a.isRequired,
      })),
    };
  });

  if (opts.openNow) {
    items = items.filter((item) => item.isOpen);
  }

  const totalPages = Math.ceil(total / limit);

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasMore: page * limit < total,
    priceRange: { min: priceMin, max: priceMax },
  };
};
