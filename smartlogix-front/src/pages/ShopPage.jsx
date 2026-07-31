import { useEffect, useMemo, useState } from "react";
import {
  FiBox,
  FiBookOpen,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiCpu,
  FiFilter,
  FiGrid,
  FiHardDrive,
  FiHeart,
  FiHeadphones,
  FiLogIn,
  FiLogOut,
  FiMenu,
  FiMinus,
  FiMonitor,
  FiPackage,
  FiPlus,
  FiPrinter,
  FiSearch,
  FiShield,
  FiShoppingCart,
  FiTrash2,
  FiTruck,
  FiUser,
  FiWifi,
} from "react-icons/fi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo-smartlogix.png";
import { clearLogin } from "../services/authService";
import {
  addCustomerFavorite,
  loadCustomerFavorites,
  loadCustomerProfile,
  removeCustomerFavorite,
} from "../services/customerAccountService";
import { getPublicCatalogProducts } from "../services/inventoryService";
import { getRoleFromToken, getUsernameFromToken } from "../utils/authTokenUtils";
import { productMatchesSearch } from "../utils/inventoryLocationUtils";

const CART_STORAGE_KEY = "smartlogix-store-cart";

const STOCK_FILTERS = [
  { label: "Disponibles", value: "available" },
  { label: "Todos", value: "all" },
  { label: "Stock bajo", value: "low" },
];

const SORT_OPTIONS = [
  { label: "Relevancia", value: "relevance" },
  { label: "Menor precio", value: "price-asc" },
  { label: "Mayor precio", value: "price-desc" },
  { label: "Mas stock", value: "stock-desc" },
];

const CATEGORY_META = {
  Almacenamiento: { icon: FiHardDrive, description: "SSD, discos y respaldos" },
  Componentes: { icon: FiCpu, description: "Arma o mejora tu PC" },
  Gaming: { icon: FiHeadphones, description: "Equipamiento para jugar" },
  Monitores: { icon: FiMonitor, description: "Trabajo, estudio y gaming" },
  Notebooks: { icon: FiBookOpen, description: "Movilidad y rendimiento" },
  Oficina: { icon: FiPrinter, description: "Productividad para tu espacio" },
  Perifericos: { icon: FiGrid, description: "Control, audio y video" },
  Redes: { icon: FiWifi, description: "Conectividad para todos" },
};

const HERO_IMAGE = "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1800&q=88";
const BUSINESS_IMAGE = "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=84";

function loadSavedCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
    return Array.isArray(savedCart) ? savedCart : [];
  } catch {
    return [];
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CL", {
    currency: "CLP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(value) || 0);
}

function discountPercentage(product) {
  const original = Number(product.originalPrice || 0);
  const sale = Number(product.salePrice || 0);
  if (original <= sale || original <= 0) return 0;
  return Math.round(((original - sale) / original) * 100);
}

function ShopPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("available");
  const [sortBy, setSortBy] = useState("relevance");
  const [cart, setCart] = useState(loadSavedCart);
  const [checkoutError, setCheckoutError] = useState("");
  const [customerProfile, setCustomerProfile] = useState(null);
  const [favoriteSkus, setFavoriteSkus] = useState([]);
  const [favoriteBusySku, setFavoriteBusySku] = useState(null);
  const [favoriteNotice, setFavoriteNotice] = useState(null);
  const [session, setSession] = useState(() => ({
    role: getRoleFromToken(),
    username: getUsernameFromToken(),
  }));
  const { role, username } = session;

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const data = await getPublicCatalogProducts();
        setItems(Array.isArray(data) ? data : []);
        setError("");
      } catch (catalogError) {
        console.error(catalogError);
        setError("No se pudo cargar el catalogo.");
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  useEffect(() => {
    if (role !== "ROLE_CUSTOMER") {
      setCustomerProfile(null);
      setFavoriteSkus([]);
      return;
    }

    Promise.all([loadCustomerProfile(), loadCustomerFavorites()])
      .then(([profile, favoriteData]) => {
        setCustomerProfile(profile);
        setFavoriteSkus((favoriteData || []).map((favorite) => favorite.sku));
      })
      .catch((profileError) => console.error("No se pudo precargar el perfil:", profileError));
  }, [role]);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!location.state?.openCart) return;
    const timeoutId = window.setTimeout(() => scrollTo("carrito"), 150);
    return () => window.clearTimeout(timeoutId);
  }, [location.state]);

  const products = useMemo(
    () => items.map((item) => ({
      ...item,
      availableUnits: Number(item.availableQuantity || 0),
      price: Number(item.salePrice || 0),
    })),
    [items]
  );

  const categories = useMemo(
    () => Array.from(new Set(products.map((item) => item.category || "Otros")))
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right)),
    [products]
  );

  const offerProducts = useMemo(
    () => products.filter((product) => discountPercentage(product) > 0).slice(0, 8),
    [products]
  );
  const featuredProducts = useMemo(
    () => products.filter((product) => product.featured).slice(0, 8),
    [products]
  );
  const fastProducts = useMemo(
    () => products.filter((product) => product.fastShipping).slice(0, 8),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const cleanQuery = query.trim();
    return products
      .filter((product) => productMatchesSearch(product, cleanQuery)
        || product.brand?.toLowerCase().includes(cleanQuery.toLowerCase()))
      .filter((product) => categoryFilter === "all" || product.category === categoryFilter)
      .filter((product) => {
        if (stockFilter === "all") return true;
        if (stockFilter === "low") return product.lowStock;
        return product.availableUnits > 0;
      })
      .sort((left, right) => {
        if (sortBy === "price-asc") return left.price - right.price;
        if (sortBy === "price-desc") return right.price - left.price;
        if (sortBy === "stock-desc") return right.availableUnits - left.availableUnits;
        if (cleanQuery) {
          const leftStarts = left.productName?.toLowerCase().startsWith(cleanQuery.toLowerCase()) ? 1 : 0;
          const rightStarts = right.productName?.toLowerCase().startsWith(cleanQuery.toLowerCase()) ? 1 : 0;
          if (leftStarts !== rightStarts) return rightStarts - leftStarts;
        }
        return Number(right.featured) - Number(left.featured)
          || left.productName.localeCompare(right.productName);
      });
  }, [categoryFilter, products, query, sortBy, stockFilter]);

  const cartProducts = useMemo(
    () => cart
      .map((cartItem) => {
        const product = products.find((item) => item.sku === cartItem.sku);
        if (!product) return null;
        return {
          ...product,
          cartQuantity: cartItem.quantity,
          lineTotal: product.price * cartItem.quantity,
        };
      })
      .filter(Boolean),
    [cart, products]
  );

  const subtotal = cartProducts.reduce((total, product) => total + product.lineTotal, 0);
  const cartUnits = cartProducts.reduce((total, product) => total + product.cartQuantity, 0);

  function scrollTo(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectCategory(category) {
    setCategoryFilter(category);
    scrollTo("catalogo");
  }

  function addToCart(product) {
    if (product.availableUnits <= 0) return;
    setCheckoutError("");
    setCart((current) => {
      const existing = current.find((item) => item.sku === product.sku);
      if (!existing) return [...current, { sku: product.sku, quantity: 1 }];
      return current.map((item) => item.sku === product.sku
        ? { ...item, quantity: Math.min(item.quantity + 1, product.availableUnits) }
        : item);
    });
  }

  function updateCartQuantity(sku, quantity) {
    const product = products.find((item) => item.sku === sku);
    const maxQuantity = product?.availableUnits || 0;
    const nextQuantity = Math.max(1, Math.min(Number(quantity) || 1, maxQuantity || 1));
    setCart((current) => current.map((item) => item.sku === sku
      ? { ...item, quantity: nextQuantity }
      : item));
  }

  function removeFromCart(sku) {
    setCart((current) => current.filter((item) => item.sku !== sku));
  }

  function showFavoriteNotice(text, tone = "success") {
    setFavoriteNotice({ text, tone });
    window.setTimeout(() => setFavoriteNotice(null), 3000);
  }

  async function toggleFavorite(product) {
    if (role !== "ROLE_CUSTOMER") {
      navigate("/shop/login", {
        state: { returnTo: `/shop/product/${encodeURIComponent(product.sku)}` },
      });
      return;
    }

    const isFavorite = favoriteSkus.includes(product.sku);
    try {
      setFavoriteBusySku(product.sku);
      if (isFavorite) {
        await removeCustomerFavorite(product.sku);
        setFavoriteSkus((current) => current.filter((sku) => sku !== product.sku));
        showFavoriteNotice("Producto eliminado de tus favoritos.");
      } else {
        await addCustomerFavorite(product.sku);
        setFavoriteSkus((current) => [...new Set([...current, product.sku])]);
        showFavoriteNotice("Producto guardado en tus favoritos.");
      }
    } catch (favoriteError) {
      console.error(favoriteError);
      showFavoriteNotice(
        favoriteError.response?.data?.message || "No se pudo actualizar favoritos.",
        "error"
      );
    } finally {
      setFavoriteBusySku(null);
    }
  }

  function handleCheckout() {
    if (cartProducts.length === 0) {
      setCheckoutError("Agrega al menos un producto al carrito.");
      return;
    }
    navigate("/shop/cart");
  }

  function handleLogout() {
    clearLogin();
    setSession({ role: null, username: null });
    setCustomerProfile(null);
    setFavoriteSkus([]);
    navigate("/shop");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <StoreHeader
        cartUnits={cartUnits}
        categories={categories}
        onCategory={selectCategory}
        onLogout={handleLogout}
        onQueryChange={setQuery}
        onSearch={() => scrollTo("catalogo")}
        onShowCart={() => navigate("/shop/cart")}
        profile={customerProfile}
        query={query}
        role={role}
        username={username}
      />

      {favoriteNotice && (
        <div className={`fixed right-4 top-24 z-50 max-w-sm rounded-md border px-4 py-3 text-sm font-black shadow-2xl ${
          favoriteNotice.tone === "error"
            ? "border-red-400/30 bg-slate-900 text-red-200"
            : "border-emerald-400/30 bg-slate-900 text-emerald-200"
        }`}>
          {favoriteNotice.text}
        </div>
      )}

      <main>
        <CampaignHero onCategory={selectCategory} onShop={() => scrollTo("ofertas")} />
        <TrustStrip />

        <section className="mx-auto max-w-[1500px] px-4 py-10 lg:px-6">
          <SectionHeading
            eyebrow="Explora SmartLogix"
            title="Compra por categoria"
            description="Encuentra rapidamente el equipo que necesitas."
          />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            {categories.map((category) => (
              <CategoryButton key={category} category={category} onClick={() => selectCategory(category)} />
            ))}
          </div>
        </section>

        <ProductSection
          id="ofertas"
          eyebrow="Precios por tiempo limitado"
          title="Ofertas destacadas"
          description="Descuentos calculados desde el precio normal registrado en inventario."
          products={offerProducts}
          favoriteBusySku={favoriteBusySku}
          favoriteSkus={favoriteSkus}
          onAdd={addToCart}
          onFavorite={toggleFavorite}
          onSeeAll={() => { setSortBy("price-asc"); scrollTo("catalogo"); }}
        />

        <ProductSection
          dark
          eyebrow="Seleccion SmartLogix"
          title="Productos recomendados"
          description="Equipos destacados por rendimiento, disponibilidad y demanda."
          products={featuredProducts}
          favoriteBusySku={favoriteBusySku}
          favoriteSkus={favoriteSkus}
          onAdd={addToCart}
          onFavorite={toggleFavorite}
          onSeeAll={() => scrollTo("catalogo")}
        />

        <BusinessBand />

        <ProductSection
          eyebrow="Listos para salir"
          title="Envio rapido"
          description="Productos preparados para despacho prioritario o retiro."
          products={fastProducts}
          favoriteBusySku={favoriteBusySku}
          favoriteSkus={favoriteSkus}
          onAdd={addToCart}
          onFavorite={toggleFavorite}
          onSeeAll={() => scrollTo("catalogo")}
        />

        <section id="catalogo" className="scroll-mt-36 border-t border-white/10 bg-slate-950 py-12">
          <div className="mx-auto max-w-[1500px] px-4 lg:px-6">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                eyebrow="Catalogo completo"
                title={categoryFilter === "all" ? "Todos los productos" : categoryFilter}
                description={`${filteredProducts.length} productos encontrados con stock conectado a bodega.`}
              />
              {(query || categoryFilter !== "all" || stockFilter !== "available") && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setCategoryFilter("all"); setStockFilter("available"); }}
                  className="h-10 rounded-md border border-white/15 px-4 text-sm font-black text-slate-300 hover:bg-white/5"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid items-start gap-6 xl:grid-cols-[230px_minmax(0,1fr)_380px]">
              <CatalogSidebar
                categories={categories}
                categoryFilter={categoryFilter}
                onCategoryChange={setCategoryFilter}
                onSortChange={setSortBy}
                onStockChange={setStockFilter}
                sortBy={sortBy}
                stockFilter={stockFilter}
              />

              <section className="min-w-0">
                {error && <Message tone="error">{error}</Message>}
                {loading && <Message>Cargando catalogo...</Message>}
                {!loading && filteredProducts.length === 0 && (
                  <div className="rounded-md border border-dashed border-white/15 p-10 text-center font-bold text-slate-400">
                    No hay productos para esos filtros.
                  </div>
                )}
                {!loading && filteredProducts.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.sku}
                        favoriteBusy={favoriteBusySku === product.sku}
                        isFavorite={favoriteSkus.includes(product.sku)}
                        onAdd={addToCart}
                        onFavorite={toggleFavorite}
                        product={product}
                      />
                    ))}
                  </div>
                )}
              </section>

              <CartPanel
                cartProducts={cartProducts}
                checkoutError={checkoutError}
                onCheckout={handleCheckout}
                onQuantityChange={updateCartQuantity}
                onRemove={removeFromCart}
                subtotal={subtotal}
              />
            </div>
          </div>
        </section>

        <BrandStrip />
      </main>

      <StoreFooter />
    </div>
  );
}

function StoreHeader({ cartUnits, categories, onCategory, onLogout, onQueryChange, onSearch, onShowCart, profile, query, role, username }) {
  const isCustomer = role === "ROLE_CUSTOMER";
  const isStaff = role && !isCustomer;

  function submitSearch(event) {
    event.preventDefault();
    onSearch();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-indigo-950 shadow-2xl">
      <div className="border-b border-white/10 bg-slate-950/90">
        <div className="mx-auto flex h-8 max-w-[1500px] items-center justify-between gap-4 px-4 text-[11px] font-black uppercase text-slate-400 lg:px-6">
          <span className="flex items-center gap-2"><FiTruck className="text-emerald-300" /> Despacho a todo Chile</span>
          <div className="hidden items-center gap-6 sm:flex">
            <span>Retiro sin costo</span>
            <span>Compra protegida</span>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1500px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 md:grid-cols-[210px_minmax(280px,1fr)_auto] md:gap-4 md:py-4 lg:px-6">
        <Link to="/shop" className="flex min-w-0 items-center gap-3">
          <img src={logo} alt="SmartLogix" className="h-8 w-auto" />
          <span className="hidden border-l border-white/15 pl-3 text-xs font-black uppercase text-sky-300 xl:block">Tienda</span>
        </Link>

        <form onSubmit={submitSearch} className="relative order-3 col-span-2 md:order-none md:col-span-1">
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Busca productos, marcas o SKU..."
            className="h-12 w-full rounded-md border border-white/10 bg-slate-950 pl-11 pr-14 text-sm font-bold outline-none placeholder:text-slate-600 focus:border-sky-400"
          />
          <button type="submit" title="Buscar" className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-md bg-sky-500 hover:bg-sky-400">
            <FiSearch />
          </button>
        </form>

        <div className="flex shrink-0 items-center justify-end gap-2">
          {isStaff && (
            <Link to="/dashboard" className="hidden h-11 items-center rounded-md border border-white/15 px-3 text-xs font-black hover:bg-white/10 lg:flex">Panel</Link>
          )}
          {!role ? (
            <Link to="/shop/login" className="flex h-11 items-center gap-2 rounded-md border border-white/15 px-3 text-xs font-black hover:bg-white/10">
              <FiLogIn /> <span className="hidden sm:inline">Ingresar</span>
            </Link>
          ) : isCustomer ? (
            <Link to="/shop/account" className="flex h-11 items-center gap-2 rounded-md border border-white/15 px-2 hover:bg-white/10">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName || username} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-200"><FiUser /></span>
              )}
              <span className="hidden max-w-28 truncate text-xs font-black xl:block">{profile?.displayName || username}</span>
            </Link>
          ) : (
            <span className="hidden text-xs font-black lg:block">{username}</span>
          )}

          <button type="button" onClick={onShowCart} title="Ver carrito" className="relative flex h-11 w-11 items-center justify-center rounded-md bg-sky-500 hover:bg-sky-400">
            <FiShoppingCart />
            {cartUnits > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-emerald-400 px-1 text-center text-[10px] font-black leading-5 text-slate-950">{cartUnits}</span>}
          </button>

          {role && (
            <button type="button" onClick={onLogout} title="Cerrar sesion" className="flex h-11 w-11 items-center justify-center rounded-md border border-white/15 text-slate-300 hover:bg-white/10">
              <FiLogOut />
            </button>
          )}
        </div>
      </div>

      <nav className="border-t border-white/10 bg-indigo-950">
        <div className="mx-auto flex max-w-[1500px] items-center gap-1 overflow-x-auto px-4 py-2 lg:px-6">
          <button type="button" onClick={() => onCategory("all")} className="flex h-9 shrink-0 items-center gap-2 rounded-md bg-sky-500 px-3 text-xs font-black">
            <FiMenu /> Categorias
          </button>
          {categories.map((category) => (
            <button key={category} type="button" onClick={() => onCategory(category)} className="h-9 shrink-0 rounded-md px-3 text-xs font-black text-slate-300 hover:bg-white/10 hover:text-white">
              {category}
            </button>
          ))}
          <button type="button" onClick={() => document.getElementById("ofertas")?.scrollIntoView({ behavior: "smooth" })} className="ml-auto h-9 shrink-0 rounded-md px-3 text-xs font-black text-amber-300 hover:bg-white/10">
            Ofertas
          </button>
        </div>
      </nav>
    </header>
  );
}

function CampaignHero({ onCategory, onShop }) {
  return (
    <section className="relative min-h-[390px] overflow-hidden bg-slate-900" style={{ backgroundImage: `url(${HERO_IMAGE})`, backgroundPosition: "center", backgroundSize: "cover" }}>
      <div className="absolute inset-0 bg-slate-950/75" />
      <div className="relative mx-auto flex min-h-[390px] max-w-[1500px] items-center px-4 py-12 lg:px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase text-emerald-300">Smart Week Tecnologia</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">Tecnologia para trabajar, jugar y crear</h1>
          <p className="mt-4 max-w-xl text-base font-semibold text-slate-300 sm:text-lg">Notebooks, componentes y perifericos con stock conectado a nuestras bodegas.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={onShop} className="flex h-12 items-center gap-2 rounded-md bg-sky-500 px-5 text-sm font-black hover:bg-sky-400">
              Ver ofertas <FiChevronRight />
            </button>
            <button type="button" onClick={() => onCategory("Notebooks")} className="h-12 rounded-md border border-white/25 bg-slate-950/50 px-5 text-sm font-black hover:bg-white/10">
              Explorar notebooks
            </button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-xs font-black uppercase text-slate-300">
            <span className="flex items-center gap-2"><FiCheck className="text-emerald-300" /> Stock actualizado</span>
            <span className="flex items-center gap-2"><FiShield className="text-sky-300" /> Compra segura</span>
            <span className="flex items-center gap-2"><FiTruck className="text-amber-300" /> Despacho y retiro</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const benefits = [
    { icon: FiTruck, title: "Despacho nacional", text: "Cobertura de Arica a Punta Arenas" },
    { icon: FiClock, title: "Envio rapido", text: "Productos listos para preparar" },
    { icon: FiShield, title: "Compra protegida", text: "Cuenta privada y pedidos seguros" },
    { icon: FiPackage, title: "Retiro disponible", text: "Consulta stock antes de comprar" },
  ];
  return (
    <section className="border-b border-white/10 bg-slate-900">
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        {benefits.map(({ icon: Icon, text, title }) => (
          <div key={title} className="flex min-h-24 items-center gap-3 border-white/10 p-4 lg:border-r lg:last:border-r-0">
            <Icon className="shrink-0 text-sky-300" size={22} />
            <div className="min-w-0"><p className="break-words text-sm font-black">{title}</p><p className="mt-1 break-words text-xs font-semibold text-slate-500">{text}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHeading({ description, eyebrow, title }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-sky-300">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black sm:text-3xl">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">{description}</p>}
    </div>
  );
}

function CategoryButton({ category, onClick }) {
  const meta = CATEGORY_META[category] || { icon: FiBox, description: "Ver productos" };
  const Icon = meta.icon;
  return (
    <button type="button" onClick={onClick} className="group min-h-32 rounded-md border border-white/10 bg-slate-900 p-4 text-left transition hover:border-sky-400/50 hover:bg-slate-800">
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-500/15 text-sky-300 transition group-hover:bg-sky-500 group-hover:text-white"><Icon size={20} /></span>
      <span className="mt-4 block text-sm font-black">{category}</span>
            <span className="mt-1 block text-[11px] font-semibold text-slate-500">{meta.description}</span>
    </button>
  );
}

function ProductSection({ dark = false, description, eyebrow, favoriteBusySku, favoriteSkus, id, onAdd, onFavorite, onSeeAll, products, title }) {
  if (!products.length) return null;
  return (
    <section id={id} className={`scroll-mt-36 border-y border-white/10 py-11 ${dark ? "bg-slate-950" : "bg-slate-900/70"}`}>
      <div className="mx-auto max-w-[1500px] px-4 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading description={description} eyebrow={eyebrow} title={title} />
          <button type="button" onClick={onSeeAll} className="flex h-10 items-center gap-2 rounded-md border border-white/15 px-4 text-sm font-black text-slate-300 hover:bg-white/5">
            Ver todos <FiChevronRight />
          </button>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <ProductCard
              key={product.sku}
              favoriteBusy={favoriteBusySku === product.sku}
              isFavorite={favoriteSkus.includes(product.sku)}
              onAdd={onAdd}
              onFavorite={onFavorite}
              product={product}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ favoriteBusy, isFavorite, onAdd, onFavorite, product }) {
  const isAvailable = product.availableUnits > 0;
  const discount = discountPercentage(product);
  return (
    <article className="group flex min-h-[470px] flex-col overflow-hidden rounded-md border border-white/10 bg-slate-900 shadow-xl transition hover:border-sky-400/45">
      <div className="relative h-52 overflow-hidden bg-white">
        <Link to={`/shop/product/${encodeURIComponent(product.sku)}`} className="block h-full">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.productName} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl font-black text-slate-300">{String(product.productName || "P").charAt(0)}</div>
          )}
        </Link>
        <div className="absolute left-3 top-3 flex flex-col items-start gap-2">
          {discount > 0 && <span className="rounded-md bg-red-500 px-2.5 py-1 text-xs font-black text-white">-{discount}%</span>}
          {product.fastShipping && <span className="rounded-md bg-emerald-500 px-2.5 py-1 text-[10px] font-black uppercase text-slate-950">Envio rapido</span>}
        </div>
        <button
          type="button"
          disabled={favoriteBusy}
          onClick={() => onFavorite(product)}
          title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-md border shadow-lg transition ${
            isFavorite
              ? "border-red-400/40 bg-red-500 text-white"
              : "border-slate-200 bg-white/95 text-slate-600 hover:text-red-500"
          }`}
        >
          <FiHeart fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-black uppercase text-sky-300">{product.brand || "SmartLogix"}</p>
        <h3 className="mt-2 line-clamp-2 min-h-12 text-base font-black leading-6">
          <Link to={`/shop/product/${encodeURIComponent(product.sku)}`} className="hover:text-sky-300">{product.productName}</Link>
        </h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-xs font-semibold leading-5 text-slate-500">{product.shortDescription || product.sku}</p>

        <div className="mt-4 flex min-h-5 items-center gap-2 text-[10px] font-black uppercase">
          {product.freeShipping && <span className="text-emerald-300">Despacho gratis</span>}
          {product.storePickup && <span className="text-amber-300">Retiro</span>}
        </div>

        <div className="mt-auto pt-4">
          {discount > 0 ? (
            <p className="text-xs font-bold text-slate-500 line-through">{formatCurrency(product.originalPrice)}</p>
          ) : <div className="h-4" />}
          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-black text-white">{formatCurrency(product.price)}</p>
              <p className="mt-1 text-[10px] font-bold uppercase text-slate-600">Precio internet</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${isAvailable ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
              {isAvailable ? "En stock" : "Agotado"}
            </span>
          </div>
          <button type="button" disabled={!isAvailable} onClick={() => onAdd(product)} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-sky-500 text-sm font-black hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500">
            <FiShoppingCart /> Agregar al carrito
          </button>
        </div>
      </div>
    </article>
  );
}

function BusinessBand() {
  return (
    <section className="relative min-h-72 overflow-hidden bg-slate-900" style={{ backgroundImage: `url(${BUSINESS_IMAGE})`, backgroundPosition: "center", backgroundSize: "cover" }}>
      <div className="absolute inset-0 bg-indigo-950/85" />
      <div className="relative mx-auto flex min-h-72 max-w-[1500px] items-center px-4 py-10 lg:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase text-emerald-300">SmartLogix Empresas</p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">Tecnologia para tu negocio</h2>
          <p className="mt-3 max-w-xl font-semibold text-slate-300">Equipamiento, inventario y despacho coordinado para oficinas, emprendimientos y equipos de trabajo.</p>
          <a href="mailto:ventas@smartlogix.cl" className="mt-6 flex h-11 w-fit items-center gap-2 rounded-md bg-emerald-500 px-5 text-sm font-black text-slate-950 hover:bg-emerald-400">Cotizar empresa <FiChevronRight /></a>
        </div>
      </div>
    </section>
  );
}

function CatalogSidebar({ categories, categoryFilter, onCategoryChange, onSortChange, onStockChange, sortBy, stockFilter }) {
  return (
    <aside className="rounded-md border border-white/10 bg-slate-900 p-4 xl:sticky xl:top-36">
      <div className="flex items-center gap-2 border-b border-white/10 pb-4"><FiFilter className="text-sky-300" /><h3 className="font-black">Filtrar catalogo</h3></div>
      <FilterGroup label="Categoria">
        <select value={categoryFilter} onChange={(event) => onCategoryChange(event.target.value)} className="h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm font-bold outline-none focus:border-sky-400">
          <option value="all">Todas las categorias</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </FilterGroup>
      <FilterGroup label="Disponibilidad">
        <select value={stockFilter} onChange={(event) => onStockChange(event.target.value)} className="h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm font-bold outline-none focus:border-sky-400">
          {STOCK_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </FilterGroup>
      <FilterGroup label="Ordenar por">
        <select value={sortBy} onChange={(event) => onSortChange(event.target.value)} className="h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm font-bold outline-none focus:border-sky-400">
          {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </FilterGroup>
      <div className="mt-5 border-t border-white/10 pt-4 text-xs font-semibold text-slate-500">
        <p className="flex items-center gap-2"><FiCheck className="text-emerald-300" /> Precio protegido</p>
        <p className="mt-3 flex items-center gap-2"><FiPackage className="text-amber-300" /> Disponibilidad actualizada</p>
      </div>
    </aside>
  );
}

function FilterGroup({ children, label }) {
  return <label className="mt-5 block"><span className="mb-2 block text-[11px] font-black uppercase text-slate-500">{label}</span>{children}</label>;
}

function Message({ children, tone = "default" }) {
  return <div className={`mb-4 rounded-md border p-4 text-sm font-bold ${tone === "error" ? "border-red-400/30 bg-red-500/10 text-red-200" : "border-white/10 bg-slate-900 text-slate-300"}`}>{children}</div>;
}

function CartPanel({ cartProducts, checkoutError, onCheckout, onQuantityChange, onRemove, subtotal }) {
  return (
    <aside id="carrito" className="scroll-mt-36 xl:sticky xl:top-36">
      <div className="rounded-md border border-white/10 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><p className="text-xs font-black uppercase text-sky-300">Tu compra</p><h2 className="mt-1 text-2xl font-black">Carrito</h2></div>
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-sky-500/15 text-sky-300"><FiShoppingCart size={22} /></div>
        </div>

        <div className="mb-5 max-h-[350px] space-y-3 overflow-y-auto pr-1">
          {cartProducts.length === 0 && <div className="rounded-md border border-dashed border-white/15 p-6 text-center font-bold text-slate-500">Tu carrito esta vacio.</div>}
          {cartProducts.map((product) => <CartLine key={product.sku} onQuantityChange={onQuantityChange} onRemove={onRemove} product={product} />)}
        </div>

        <div className="mb-5 border-y border-white/10 py-4">
          <div className="flex items-center justify-between text-sm font-bold text-slate-400"><span>Subtotal</span><span className="text-white">{formatCurrency(subtotal)}</span></div>
          <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500"><span>Entrega</span><span>Se elige en checkout</span></div>
        </div>

        {checkoutError && <Message tone="error">{checkoutError}</Message>}

        <button type="button" onClick={onCheckout} disabled={cartProducts.length === 0} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-500 text-sm font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-60">
          <FiShoppingCart /> Ver carrito completo
        </button>
        <p className="mt-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase text-slate-600"><FiShield /> Compra protegida</p>
      </div>
    </aside>
  );
}

function CartLine({ onQuantityChange, onRemove, product }) {
  return (
    <article className="rounded-md border border-white/10 bg-slate-950 p-3">
      <div className="flex gap-3">
        {product.imageUrl ? <img src={product.imageUrl} alt={product.productName} className="h-14 w-14 shrink-0 rounded-md bg-white object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-slate-800 font-black">P</div>}
        <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-black">{product.productName}</p><p className="mt-1 text-xs font-bold text-slate-500">{product.sku}</p><p className="mt-2 text-sm font-black text-sky-200">{formatCurrency(product.lineTotal)}</p></div>
        <button type="button" onClick={() => onRemove(product.sku)} title="Quitar producto" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-300 hover:bg-red-500/10"><FiTrash2 /></button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center rounded-md border border-white/10">
          <QuantityButton onClick={() => onQuantityChange(product.sku, product.cartQuantity - 1)}><FiMinus /></QuantityButton>
          <input min="1" max={product.availableUnits} type="number" value={product.cartQuantity} onChange={(event) => onQuantityChange(product.sku, event.target.value)} className="h-9 w-12 bg-transparent text-center text-sm font-black outline-none" />
          <QuantityButton onClick={() => onQuantityChange(product.sku, product.cartQuantity + 1)}><FiPlus /></QuantityButton>
        </div>
        <p className="text-[10px] font-bold uppercase text-slate-600">Max {product.availableUnits}</p>
      </div>
    </article>
  );
}

function QuantityButton({ children, onClick }) {
  return <button type="button" onClick={onClick} className="flex h-9 w-9 items-center justify-center text-slate-400 hover:text-white">{children}</button>;
}

function BrandStrip() {
  const brands = ["LENOVO", "ASUS", "SAMSUNG", "LOGITECH", "KINGSTON", "HYPERX", "TP-LINK", "EPSON"];
  return (
    <section className="border-t border-white/10 bg-slate-900 py-10">
      <div className="mx-auto max-w-[1500px] px-4 text-center lg:px-6">
        <p className="text-xs font-black uppercase text-slate-500">Marcas disponibles</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {brands.map((brand) => <div key={brand} className="flex h-14 items-center justify-center border-y border-white/10 text-sm font-black text-slate-400">{brand}</div>)}
        </div>
      </div>
    </section>
  );
}

function StoreFooter() {
  return (
    <footer className="border-t border-white/10 bg-indigo-950">
      <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <div><img src={logo} alt="SmartLogix" className="h-8 w-auto" /><p className="mt-4 max-w-xs text-sm font-semibold text-slate-400">Tecnologia, inventario y despacho conectados en una sola experiencia.</p></div>
        <FooterColumn title="Tienda" links={["Notebooks", "Componentes", "Perifericos", "Ofertas"]} />
        <FooterColumn title="Ayuda" links={["Mis compras", "Despachos", "Garantias", "Contacto"]} />
        <div><p className="font-black">Atencion</p><p className="mt-4 text-sm font-semibold text-slate-400">Lunes a viernes<br />09:00 a 18:00 hrs.</p><p className="mt-3 text-sm font-black text-sky-300">ventas@smartlogix.cl</p></div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs font-semibold text-slate-600">SmartLogix Commerce | Proyecto demostrativo</div>
    </footer>
  );
}

function FooterColumn({ links, title }) {
  return <div><p className="font-black">{title}</p><div className="mt-4 space-y-2">{links.map((link) => <p key={link} className="text-sm font-semibold text-slate-400">{link}</p>)}</div></div>;
}

export default ShopPage;
