import GradientText from "@/components/public/GradientText";
import { Button } from "@/components/ui/button";
import { Coffee, Home, Search } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-red-50 px-4 py-12">
    <div className="w-full max-w-md text-center">
      <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-brand-100 to-red-100">
        <Coffee className="h-12 w-12 text-brand-500" />
      </div>

      <h1 className="mb-4 text-6xl font-bold">
        <GradientText>404</GradientText>
      </h1>
      <h2 className="mb-4 text-2xl font-semibold text-gray-700">Page Not Found</h2>
      <p className="mb-8 text-gray-600">
        Oops! The page you're looking for doesn't exist or has been moved. Maybe
        you took a wrong turn somewhere.
      </p>

      <div className="flex flex-col justify-center gap-4 sm:flex-row">
        <Button asChild variant="brand" size="lg" className="rounded-full">
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-full">
          <Link to="/restaurants">
            <Search className="mr-2 h-4 w-4" />
            Browse Restaurants
          </Link>
        </Button>
      </div>
    </div>
  </div>
);

export default NotFoundPage;
