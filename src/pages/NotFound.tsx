import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";

const NotFound = () => {
  const navigate = useNavigate();
  useEffect(() => {
    // Redirect to Gallery if authed, else Login
    if (isAuthenticated()) {
      navigate("/", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate]);
  return null;
};

export default NotFound;
