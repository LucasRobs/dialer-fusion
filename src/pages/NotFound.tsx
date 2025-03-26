
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-secondary/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-secondary" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-foreground/70 mb-6">
          Oops! The page you're looking for doesn't exist.
        </p>
        
        <Link to="/">
          <Button className="w-full sm:w-auto">
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
