function Button({
    children,
    type = "button",
    variant = "create",
    size = "md",
    onClick,
}) {
    const variants = {
        create: "bg-blue-600 hover:bg-blue-700 text-white",
        update: "bg-yellow-500 hover:bg-red-600 text-white",
        delete: "bg-red-500 hover:bg-red-600 text-white"
    };

    const sizes = {
        del: "px-4 py-2 rounded-xl",
        sm: "px-4 py-2 rounded-full",
        md: "px-6 py-3 rounded-xl",
        pill: "px-5 py-3 rounded-full",
    };

    return (
        <button
            type={type}
            onClick={onClick}
            className={`${variants[variant]} ${sizes[size]} font-semibold shadow-md transition`}
        >
            {children}
        </button>
    );
}

export default Button;