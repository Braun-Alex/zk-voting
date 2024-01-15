import { useContext, useEffect } from "react";
import { AuthContext } from "../Contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';

export function withAuth(Component) {
    return (props) => {
        const { isAuthenticated } = useContext(AuthContext);
        const navigate = useNavigate();
        useEffect(() => {
            if (!isAuthenticated) {
                toast.warn("Access denied. You have been redirected to authenticate!")
                navigate("/login");
            }
        }, [isAuthenticated, navigate]);
        return <Component {...props} />;
    };
}
