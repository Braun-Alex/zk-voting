import { useContext, useEffect } from "react";
import { AuthContext } from '../Contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export function withoutAuth(Component) {
    return (props) => {
        const { isAuthenticated } = useContext(AuthContext);
        const navigate = useNavigate();
        useEffect(() => {
            if (isAuthenticated) {
                toast.warn("You are already logged in!");
                navigate("/");
            }
        }, [isAuthenticated, navigate]);
        return <Component {...props} />;
    };
}
