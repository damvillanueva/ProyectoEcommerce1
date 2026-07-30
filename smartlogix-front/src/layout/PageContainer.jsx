function PageContainer({ children }) {
  return (
    <div className="mx-auto w-full max-w-[2500px] px-0 py-0 sm:px-4 sm:py-4 2xl:px-6 2xl:py-6">
      {children}
    </div>
  );
}

export default PageContainer;
