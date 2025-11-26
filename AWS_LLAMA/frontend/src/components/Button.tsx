import React from 'react';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary'; }
const Button: React.FC<ButtonProps> = ({ children, className = '', ...props }) => (
    <button className={`px-4 py-2 rounded-lg font-medium bg-teal-600 text-white ${className}`} {...props}>{children}</button>
);
export default Button;