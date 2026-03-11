import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { VendorRestaurant } from "../types/vendor";
import vendorService from "../services/vendorService";

interface VendorContextType {
  restaurants: VendorRestaurant[];
  selectedRestaurantId: string | null;
  setSelectedRestaurantId: (id: string | null) => void;
  isLoading: boolean;
  refreshRestaurants: () => Promise<void>;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

export const useVendor = () => {
  const context = useContext(VendorContext);
  if (!context) {
    throw new Error("useVendor must be used within a VendorProvider");
  }
  return context;
};

interface VendorProviderProps {
  children: ReactNode;
}

export const VendorProvider: React.FC<VendorProviderProps> = ({ children }) => {
  const [restaurants, setRestaurants] = useState<VendorRestaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRestaurants = useCallback(async () => {
    setIsLoading(true);
    const res = await vendorService.getRestaurants();
    if (res.success && res.data) {
      setRestaurants(res.data.restaurants);
      // Auto-select first restaurant if none selected
      if (!selectedRestaurantId && res.data.restaurants.length > 0) {
        setSelectedRestaurantId(res.data.restaurants[0]._id);
      }
    }
    setIsLoading(false);
  }, [selectedRestaurantId]);

  useEffect(() => {
    fetchRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: VendorContextType = {
    restaurants,
    selectedRestaurantId,
    setSelectedRestaurantId,
    isLoading,
    refreshRestaurants: fetchRestaurants,
  };

  return (
    <VendorContext.Provider value={value}>{children}</VendorContext.Provider>
  );
};
