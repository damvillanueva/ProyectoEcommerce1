function PageContainer({ children }) {
    return (
        <div className="mx-auto max-w-[2500px] px-3 py-3 sm:px-6 sm:py-6">
            {children}
        </div>
    );
}

export default PageContainer;
