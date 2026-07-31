import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiBox,
  FiCheck,
  FiChevronRight,
  FiHeart,
  FiLogIn,
  FiLogOut,
  FiMinus,
  FiPackage,
  FiPlus,
  FiShield,
  FiShoppingCart,
  FiStar,
  FiMessageSquare,
  FiSend,
  FiTrash2,
  FiTruck,
  FiUser,
} from "react-icons/fi";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import logo from "../assets/logo-smartlogix.png";
import { clearLogin } from "../services/authService";
import {
  addCustomerFavorite,
  loadCustomerFavorites,
  loadCustomerProfile,
  removeCustomerFavorite,
} from "../services/customerAccountService";
import {
  getPublicCatalogProduct,
  getPublicCatalogProducts,
  loadProductReviews,
  saveProductReview,
  deleteProductReview,
  loadProductQuestions,
  createProductQuestion,
  deleteProductQuestion,
  answerProductQuestion,
} from "../services/inventoryService";
import { getRoleFromToken, getUsernameFromToken } from "../utils/authTokenUtils";

const CART_STORAGE_KEY = "smartlogix-store-cart";

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CL", {
    currency: "CLP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(value) || 0);
}

function discountPercentage(product) {
  const original = Number(product?.originalPrice || 0);
  const sale = Number(product?.salePrice || 0);
  if (original <= sale || original <= 0) return 0;
  return Math.round(((original - sale) / original) * 100);
}

function readCart() {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function cartUnitCount(cart) {
  return cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
}

function ProductDetailPage() {
  const { sku } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [profile, setProfile] = useState(null);
  const [favoriteSkus, setFavoriteSkus] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [cartUnits, setCartUnits] = useState(() => cartUnitCount(readCart()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", comment: "" });
  const [questionText, setQuestionText] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState({});
  const [engagementBusy, setEngagementBusy] = useState(false);
  const [confirmReviewDelete, setConfirmReviewDelete] = useState(false);
  const [confirmQuestionDeleteId, setConfirmQuestionDeleteId] = useState(null);
  const [session, setSession] = useState(() => ({
    role: getRoleFromToken(),
    username: getUsernameFromToken(),
  }));

  useEffect(() => {
    let active = true;
    window.scrollTo({ top: 0, behavior: "auto" });

    async function loadProduct() {
      try {
        setLoading(true);
        const [productData, catalogData, reviewData, questionData] = await Promise.all([
          getPublicCatalogProduct(sku),
          getPublicCatalogProducts(),
          loadProductReviews(sku),
          loadProductQuestions(sku),
        ]);
        if (!active) return;
        setProduct(productData);
        setCatalog(Array.isArray(catalogData) ? catalogData : []);
        setReviews(Array.isArray(reviewData) ? reviewData : []);
        setQuestions(Array.isArray(questionData) ? questionData : []);
        setQuantity(1);
        setError("");
      } catch (loadError) {
        console.error(loadError);
        if (!active) return;
        setError(loadError.response?.status === 404
          ? "El producto solicitado no existe."
          : "No se pudo cargar el producto.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProduct();
    return () => { active = false; };
  }, [sku]);

  useEffect(() => {
    if (session.role !== "ROLE_CUSTOMER") {
      setProfile(null);
      setFavoriteSkus([]);
      return;
    }

    Promise.all([loadCustomerProfile(), loadCustomerFavorites()])
      .then(([profileData, favoriteData]) => {
        setProfile(profileData);
        setFavoriteSkus((favoriteData || []).map((favorite) => favorite.sku));
      })
      .catch((loadError) => {
        console.error(loadError);
        if ([401, 403].includes(loadError.response?.status)) {
          clearLogin();
          setSession({ role: null, username: null });
        }
      });
  }, [session.role]);

  const relatedProducts = useMemo(
    () => catalog
      .filter((item) => item.sku !== product?.sku && item.category === product?.category)
      .slice(0, 4),
    [catalog, product]
  );

  const ownReview = reviews.find((review) => review.username === session.username) || null;
  const averageRating = reviews.length > 0
    ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
    : 0;
  const canAnswerQuestions = ["ROLE_ADMIN", "ROLE_USER", "ROLE_WAREHOUSE_MANAGER"]
    .includes(session.role);

  useEffect(() => {
    if (!ownReview) {
      setReviewForm({ rating: 5, title: "", comment: "" });
      return;
    }
    setReviewForm({
      rating: ownReview.rating,
      title: ownReview.title,
      comment: ownReview.comment,
    });
  }, [ownReview]);

  const availableUnits = Number(product?.availableQuantity || 0);
  const isFavorite = favoriteSkus.includes(product?.sku);
  const discount = discountPercentage(product);

  function storeCartQuantity(productSku, requestedQuantity, maxQuantity) {
    const currentCart = readCart();
    const existing = currentCart.find((item) => item.sku === productSku);
    const nextQuantity = Math.min(
      Number(existing?.quantity || 0) + requestedQuantity,
      maxQuantity
    );
    const nextCart = existing
      ? currentCart.map((item) => item.sku === productSku
        ? { ...item, quantity: nextQuantity }
        : item)
      : [...currentCart, { sku: productSku, quantity: Math.min(requestedQuantity, maxQuantity) }];
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextCart));
    setCartUnits(cartUnitCount(nextCart));
  }

  function addToCart(selectedProduct = product, selectedQuantity = quantity) {
    const stock = Number(selectedProduct?.availableQuantity || 0);
    if (!selectedProduct || stock <= 0) return;
    storeCartQuantity(selectedProduct.sku, selectedQuantity, stock);
    setMessage(`${selectedProduct.productName} fue agregado al carrito.`);
    window.setTimeout(() => setMessage(""), 3000);
  }

  function buyNow() {
    addToCart();
    navigate("/shop/cart");
  }

  async function toggleFavorite() {
    if (session.role !== "ROLE_CUSTOMER") {
      navigate("/shop/login", { state: { returnTo: location.pathname } });
      return;
    }

    try {
      setFavoriteBusy(true);
      if (isFavorite) {
        await removeCustomerFavorite(product.sku);
        setFavoriteSkus((current) => current.filter((value) => value !== product.sku));
        setMessage("Producto eliminado de tus favoritos.");
      } else {
        await addCustomerFavorite(product.sku);
        setFavoriteSkus((current) => [...new Set([...current, product.sku])]);
        setMessage("Producto guardado en tus favoritos.");
      }
    } catch (favoriteError) {
      console.error(favoriteError);
      setMessage(favoriteError.response?.data?.message || "No se pudo actualizar favoritos.");
    } finally {
      setFavoriteBusy(false);
      window.setTimeout(() => setMessage(""), 3000);
    }
  }

  function handleLogout() {
    clearLogin();
    setSession({ role: null, username: null });
    setProfile(null);
    setFavoriteSkus([]);
  }

  async function handleReviewSubmit(event) {
    event.preventDefault();
    if (session.role !== "ROLE_CUSTOMER") {
      navigate("/shop/login", { state: { returnTo: location.pathname } });
      return;
    }

    try {
      setEngagementBusy(true);
      const savedReview = await saveProductReview(product.sku, reviewForm);
      setReviews((current) => [
        savedReview,
        ...current.filter((review) => review.id !== savedReview.id),
      ]);
      setConfirmReviewDelete(false);
      setMessage(ownReview ? "Tu resena fue actualizada." : "Gracias por compartir tu experiencia.");
    } catch (reviewError) {
      console.error(reviewError);
      setMessage(reviewError.response?.data?.message || "No se pudo guardar la resena.");
    } finally {
      setEngagementBusy(false);
      window.setTimeout(() => setMessage(""), 3000);
    }
  }

  async function handleReviewDelete() {
    if (!ownReview) return;
    try {
      setEngagementBusy(true);
      await deleteProductReview(product.sku, ownReview.id);
      setReviews((current) => current.filter((review) => review.id !== ownReview.id));
      setConfirmReviewDelete(false);
      setMessage("Tu resena fue eliminada.");
    } catch (deleteError) {
      console.error(deleteError);
      setMessage(deleteError.response?.data?.message || "No se pudo eliminar la resena.");
    } finally {
      setEngagementBusy(false);
      window.setTimeout(() => setMessage(""), 3000);
    }
  }

  async function handleQuestionSubmit(event) {
    event.preventDefault();
    if (session.role !== "ROLE_CUSTOMER") {
      navigate("/shop/login", { state: { returnTo: location.pathname } });
      return;
    }

    try {
      setEngagementBusy(true);
      const createdQuestion = await createProductQuestion(product.sku, {
        question: questionText,
      });
      setQuestions((current) => [createdQuestion, ...current]);
      setQuestionText("");
      setMessage("Tu pregunta fue publicada.");
    } catch (questionError) {
      console.error(questionError);
      setMessage(questionError.response?.data?.message || "No se pudo publicar la pregunta.");
    } finally {
      setEngagementBusy(false);
      window.setTimeout(() => setMessage(""), 3000);
    }
  }

  async function handleQuestionDelete(questionId) {
    try {
      setEngagementBusy(true);
      await deleteProductQuestion(product.sku, questionId);
      setQuestions((current) => current.filter((question) => question.id !== questionId));
      setConfirmQuestionDeleteId(null);
      setMessage("Tu pregunta fue eliminada.");
    } catch (deleteError) {
      console.error(deleteError);
      setMessage(deleteError.response?.data?.message || "No se pudo eliminar la pregunta.");
    } finally {
      setEngagementBusy(false);
      window.setTimeout(() => setMessage(""), 3000);
    }
  }

  async function handleAnswer(questionId) {
    const answer = answerDrafts[questionId]?.trim();
    if (!answer) return;
    try {
      setEngagementBusy(true);
      const answeredQuestion = await answerProductQuestion(product.sku, questionId, { answer });
      setQuestions((current) => current.map((question) =>
        question.id === questionId ? answeredQuestion : question
      ));
      setAnswerDrafts((current) => ({ ...current, [questionId]: "" }));
      setMessage("Respuesta publicada.");
    } catch (answerError) {
      console.error(answerError);
      setMessage(answerError.response?.data?.message || "No se pudo publicar la respuesta.");
    } finally {
      setEngagementBusy(false);
      window.setTimeout(() => setMessage(""), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 font-black text-slate-300"><FiPackage /> Cargando producto...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-5 text-center text-white">
        <FiBox size={42} className="text-slate-600" />
        <h1 className="mt-5 text-3xl font-black">Producto no disponible</h1>
        <p className="mt-2 font-semibold text-slate-400">{error}</p>
        <Link to="/shop" className="mt-6 flex h-11 items-center gap-2 rounded-md bg-sky-500 px-5 font-black hover:bg-sky-400">
          <FiArrowLeft /> Volver a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <ProductHeader
        cartUnits={cartUnits}
        onLogout={handleLogout}
        onShowCart={() => navigate("/shop/cart")}
        profile={profile}
        role={session.role}
        username={session.username}
      />

      {message && (
        <div className="fixed left-4 right-4 top-24 z-50 rounded-md border border-emerald-400/30 bg-slate-900 px-4 py-3 text-sm font-black text-emerald-200 shadow-2xl sm:left-auto sm:max-w-sm">
          {message}
        </div>
      )}

      <main>
        <section className="border-b border-white/10 bg-slate-950">
          <div className="mx-auto max-w-[1500px] px-4 py-5 lg:px-6">
            <nav className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
              <Link to="/shop" className="hover:text-white">Tienda</Link>
              <FiChevronRight />
              <Link to="/shop" className="hover:text-white">{product.category}</Link>
              <FiChevronRight />
              <span className="text-slate-300">{product.sku}</span>
            </nav>
          </div>
        </section>

        <section className="bg-slate-950 py-8 lg:py-12">
          <div className="mx-auto grid max-w-[1500px] items-start gap-8 px-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(430px,0.95fr)] lg:px-6">
            <div className="relative min-h-0 min-w-0 aspect-[4/3] overflow-hidden rounded-md bg-white sm:min-h-[320px]">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.productName} className="h-full w-full object-contain p-6 sm:p-10" />
              ) : (
                <div className="flex h-full items-center justify-center text-8xl font-black text-slate-200">{product.productName.charAt(0)}</div>
              )}
              <div className="absolute left-4 top-4 flex flex-col items-start gap-2">
                {discount > 0 && <span className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-black">-{discount}%</span>}
                {product.fastShipping && <span className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-black uppercase text-slate-950">Envio rapido</span>}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-black uppercase text-sky-300">{product.brand || "SmartLogix"} | {product.category}</p>
                  <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{product.productName}</h1>
                  <p className="mt-3 text-sm font-bold text-slate-500">SKU: {product.sku}</p>
                </div>
                <button
                  type="button"
                  disabled={favoriteBusy}
                  onClick={toggleFavorite}
                  title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md border transition ${
                    isFavorite
                      ? "border-red-400/40 bg-red-500/15 text-red-300"
                      : "border-white/15 text-slate-300 hover:border-red-400/40 hover:text-red-300"
                  }`}
                >
                  <FiHeart fill={isFavorite ? "currentColor" : "none"} size={21} />
                </button>
              </div>

              <p className="mt-6 max-w-2xl text-base font-semibold leading-7 text-slate-300">
                {product.shortDescription || "Tecnologia seleccionada para tu trabajo, estudio y entretenimiento."}
              </p>

              <div className="mt-7 border-y border-white/10 py-6">
                {discount > 0 && <p className="text-base font-bold text-slate-500 line-through">{formatCurrency(product.originalPrice)}</p>}
                <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-2">
                  <p className="text-4xl font-black text-white sm:text-5xl">{formatCurrency(product.salePrice)}</p>
                  <span className="mb-1 rounded-full bg-sky-500/15 px-3 py-1 text-xs font-black uppercase text-sky-300">Precio internet</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-black ${availableUnits > 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                  <FiCheck /> {availableUnits > 0 ? `${availableUnits} unidades disponibles` : "Sin stock"}
                </span>
                {product.storePickup && <span className="rounded-md bg-amber-500/15 px-3 py-2 text-sm font-black text-amber-300">Retiro disponible</span>}
                {product.freeShipping && <span className="rounded-md bg-sky-500/15 px-3 py-2 text-sm font-black text-sky-300">Despacho gratis</span>}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <div className="flex h-12 w-full items-center justify-between rounded-md border border-white/15 bg-slate-900 sm:w-36">
                  <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} title="Disminuir cantidad" className="flex h-full w-11 items-center justify-center text-slate-300 hover:text-white"><FiMinus /></button>
                  <span className="font-black">{quantity}</span>
                  <button type="button" onClick={() => setQuantity((current) => Math.min(availableUnits, current + 1))} title="Aumentar cantidad" className="flex h-full w-11 items-center justify-center text-slate-300 hover:text-white"><FiPlus /></button>
                </div>
                <button type="button" disabled={availableUnits <= 0} onClick={() => addToCart()} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-sky-500 px-5 font-black hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500">
                  <FiShoppingCart /> Agregar al carrito
                </button>
                <button type="button" disabled={availableUnits <= 0} onClick={buyNow} className="h-12 flex-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-5 font-black text-emerald-300 hover:bg-emerald-500/20 disabled:border-white/10 disabled:text-slate-600">
                  Comprar ahora
                </button>
              </div>

              <div className="mt-7 grid grid-cols-3 divide-x divide-white/10 rounded-md border border-white/10 bg-slate-900">
                <ProductBenefit icon={FiTruck} label="Despacho nacional" />
                <ProductBenefit icon={FiPackage} label="Retiro coordinado" />
                <ProductBenefit icon={FiShield} label="Compra protegida" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-slate-900 py-10">
          <div className="mx-auto max-w-[1500px] px-4 lg:px-6">
            <p className="text-xs font-black uppercase text-sky-300">Informacion del producto</p>
            <h2 className="mt-2 text-2xl font-black">Descripcion</h2>
            <p className="mt-4 max-w-4xl font-semibold leading-7 text-slate-300">{product.shortDescription}</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ProductFact label="Marca" value={product.brand || "SmartLogix"} />
              <ProductFact label="Categoria" value={product.category} />
              <ProductFact label="Codigo" value={product.sku} />
              <ProductFact label="Disponibilidad" value={availableUnits > 0 ? "Disponible" : "Agotado"} />
            </div>
          </div>
        </section>

        <ProductReviews
          averageRating={averageRating}
          busy={engagementBusy}
          confirmDelete={confirmReviewDelete}
          form={reviewForm}
          onConfirmDelete={handleReviewDelete}
          onDelete={() => setConfirmReviewDelete(true)}
          onDeleteCancel={() => setConfirmReviewDelete(false)}
          onFormChange={setReviewForm}
          onSubmit={handleReviewSubmit}
          ownReview={ownReview}
          productPath={location.pathname}
          reviews={reviews}
          role={session.role}
        />

        <ProductQuestions
          answerDrafts={answerDrafts}
          busy={engagementBusy}
          canAnswer={canAnswerQuestions}
          confirmDeleteId={confirmQuestionDeleteId}
          onAnswer={handleAnswer}
          onAnswerChange={setAnswerDrafts}
          onDelete={setConfirmQuestionDeleteId}
          onDeleteCancel={() => setConfirmQuestionDeleteId(null)}
          onDeleteConfirm={handleQuestionDelete}
          onQuestionChange={setQuestionText}
          onSubmit={handleQuestionSubmit}
          productPath={location.pathname}
          questionText={questionText}
          questions={questions}
          role={session.role}
          username={session.username}
        />

        {relatedProducts.length > 0 && (
          <section className="bg-slate-950 py-12">
            <div className="mx-auto max-w-[1500px] px-4 lg:px-6">
              <p className="text-xs font-black uppercase text-sky-300">Tambien te puede interesar</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">Productos relacionados</h2>
              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {relatedProducts.map((related) => (
                  <RelatedProduct key={related.sku} onAdd={() => addToCart(related, 1)} product={related} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ProductHeader({ cartUnits, onLogout, onShowCart, profile, role, username }) {
  const isCustomer = role === "ROLE_CUSTOMER";
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-indigo-950 shadow-2xl">
      <div className="border-b border-white/10 bg-slate-950/90">
        <div className="mx-auto flex h-8 max-w-[1500px] items-center justify-between px-4 text-[11px] font-black uppercase text-slate-400 lg:px-6">
          <span className="flex items-center gap-2"><FiTruck className="text-emerald-300" /> Despacho a todo Chile</span>
          <span className="hidden sm:inline">Compra protegida</span>
        </div>
      </div>
      <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <Link to="/shop" className="flex items-center gap-3">
          <img src={logo} alt="SmartLogix" className="h-8 w-auto" />
          <span className="hidden border-l border-white/15 pl-3 text-xs font-black uppercase text-sky-300 sm:block">Tienda</span>
        </Link>
        <Link to="/shop" className="hidden items-center gap-2 text-sm font-black text-slate-300 hover:text-white md:flex"><FiArrowLeft /> Volver al catalogo</Link>
        <div className="flex items-center gap-2">
          {!role ? (
            <Link to="/shop/login" className="flex h-11 items-center gap-2 rounded-md border border-white/15 px-3 text-xs font-black hover:bg-white/10"><FiLogIn /> <span className="hidden sm:inline">Ingresar</span></Link>
          ) : isCustomer ? (
            <Link to="/shop/account" className="flex h-11 items-center gap-2 rounded-md border border-white/15 px-2 hover:bg-white/10">
              {profile?.avatarUrl ? <img src={profile.avatarUrl} alt={profile.displayName || username} className="h-8 w-8 rounded-full object-cover" /> : <FiUser />}
              <span className="hidden max-w-28 truncate text-xs font-black lg:block">{profile?.displayName || username}</span>
            </Link>
          ) : null}
          <button type="button" onClick={onShowCart} title="Ver carrito" className="relative flex h-11 w-11 items-center justify-center rounded-md bg-sky-500 hover:bg-sky-400">
            <FiShoppingCart />
            {cartUnits > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-emerald-400 px-1 text-center text-[10px] font-black leading-5 text-slate-950">{cartUnits}</span>}
          </button>
          {role && <button type="button" onClick={onLogout} title="Cerrar sesion" className="flex h-11 w-11 items-center justify-center rounded-md border border-white/15 text-slate-300 hover:bg-white/10"><FiLogOut /></button>}
        </div>
      </div>
    </header>
  );
}

function ProductBenefit({ icon: Icon, label }) {
  return <div className="flex min-h-24 flex-col items-center justify-center gap-2 p-3 text-center text-[11px] font-black text-slate-300"><Icon className="text-sky-300" size={20} />{label}</div>;
}

function ProductFact({ label, value }) {
  return <div className="border-l-2 border-sky-400/50 pl-4"><p className="text-[11px] font-black uppercase text-slate-500">{label}</p><p className="mt-1 font-black text-slate-200">{value}</p></div>;
}

function ProductReviews({ averageRating, busy, confirmDelete, form, onConfirmDelete, onDelete, onDeleteCancel, onFormChange, onSubmit, ownReview, productPath, reviews, role }) {
  return (
    <section id="resenas" className="border-b border-white/10 bg-slate-950 py-12">
      <div className="mx-auto max-w-[1500px] px-4 lg:px-6">
        <p className="text-xs font-black uppercase text-sky-300">Opinion de clientes</p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">Calificaciones y resenas</h2>

        <div className="mt-8 grid items-start gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-28">
            <div className="flex items-end gap-4 border-b border-white/10 pb-6">
              <p className="text-6xl font-black">{reviews.length ? averageRating.toFixed(1) : "-"}</p>
              <div className="pb-1">
                <StarDisplay rating={Math.round(averageRating)} size={20} />
                <p className="mt-2 text-sm font-bold text-slate-500">{reviews.length} opinion(es)</p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviews.filter((review) => review.rating === rating).length;
                const percentage = reviews.length ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={rating} className="grid grid-cols-[28px_1fr_24px] items-center gap-2 text-xs font-bold text-slate-500">
                    <span>{rating}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-amber-400" style={{ width: `${percentage}%` }} /></div>
                    <span>{count}</span>
                  </div>
                );
              })}
            </div>

            {role === "ROLE_CUSTOMER" ? (
              <form onSubmit={onSubmit} className="mt-7 border-t border-white/10 pt-6">
                <h3 className="font-black">{ownReview ? "Actualiza tu resena" : "Comparte tu experiencia"}</h3>
                <p className="mt-2 text-xs font-semibold text-slate-500">Solo puedes publicar una resena por producto.</p>
                <StarPicker value={form.rating} onChange={(rating) => onFormChange((current) => ({ ...current, rating }))} />
                <input
                  required
                  maxLength={100}
                  value={form.title}
                  onChange={(event) => onFormChange((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Titulo de tu resena"
                  className="mt-4 h-11 w-full rounded-md border border-white/10 bg-slate-900 px-3 text-sm font-bold outline-none placeholder:text-slate-600 focus:border-sky-400"
                />
                <textarea
                  required
                  maxLength={1200}
                  rows={4}
                  value={form.comment}
                  onChange={(event) => onFormChange((current) => ({ ...current, comment: event.target.value }))}
                  placeholder="Cuenta como fue tu experiencia con el producto"
                  className="mt-3 w-full resize-none rounded-md border border-white/10 bg-slate-900 p-3 text-sm font-semibold outline-none placeholder:text-slate-600 focus:border-sky-400"
                />
                <button disabled={busy} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-sky-500 px-4 text-sm font-black hover:bg-sky-400 disabled:opacity-60"><FiSend /> {ownReview ? "Actualizar resena" : "Publicar resena"}</button>

                {ownReview && !confirmDelete && (
                  <button type="button" onClick={onDelete} className="mt-3 flex h-10 w-full items-center justify-center gap-2 text-sm font-black text-red-300 hover:text-red-200"><FiTrash2 /> Eliminar mi resena</button>
                )}
                {ownReview && confirmDelete && (
                  <div className="mt-3 rounded-md border border-red-400/25 bg-red-500/10 p-3">
                    <p className="text-xs font-bold text-red-200">Esta accion eliminara tu resena.</p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={onDeleteCancel} className="h-9 flex-1 rounded-md border border-white/15 text-xs font-black">Cancelar</button>
                      <button type="button" disabled={busy} onClick={onConfirmDelete} className="h-9 flex-1 rounded-md bg-red-500 text-xs font-black disabled:opacity-60">Eliminar</button>
                    </div>
                  </div>
                )}
              </form>
            ) : (
              <Link to="/shop/login" state={{ returnTo: productPath }} className="mt-7 flex h-11 items-center justify-center gap-2 rounded-md border border-sky-400/30 bg-sky-500/10 text-sm font-black text-sky-300 hover:bg-sky-500/20"><FiLogIn /> Ingresa para opinar</Link>
            )}
          </aside>

          <div className="divide-y divide-white/10 border-y border-white/10">
            {reviews.length === 0 ? (
              <div className="py-12 text-center text-slate-500"><FiStar className="mx-auto" size={30} /><p className="mt-3 font-black">Este producto aun no tiene resenas.</p></div>
            ) : reviews.map((review) => (
              <article key={review.id} className="py-6 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><StarDisplay rating={review.rating} /><h3 className="mt-3 text-lg font-black">{review.title}</h3></div>
                  <p className="text-xs font-bold text-slate-500">{formatDate(review.updatedAt || review.createdAt)}</p>
                </div>
                <p className="mt-3 font-semibold leading-7 text-slate-300">{review.comment}</p>
                <p className="mt-4 text-xs font-black text-sky-300">{review.username}{ownReview?.id === review.id ? " | Tu resena" : ""}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductQuestions({ answerDrafts, busy, canAnswer, confirmDeleteId, onAnswer, onAnswerChange, onDelete, onDeleteCancel, onDeleteConfirm, onQuestionChange, onSubmit, productPath, questionText, questions, role, username }) {
  return (
    <section id="preguntas" className="border-b border-white/10 bg-slate-900 py-12">
      <div className="mx-auto max-w-[1500px] px-4 lg:px-6">
        <div className="grid items-start gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div>
            <p className="text-xs font-black uppercase text-sky-300">Comunidad SmartLogix</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">Preguntas y respuestas</h2>
            <p className="mt-3 font-semibold leading-7 text-slate-400">Aclara dudas antes de comprar y revisa respuestas del equipo.</p>

            {role === "ROLE_CUSTOMER" ? (
              <form onSubmit={onSubmit} className="mt-6">
                <textarea required maxLength={500} rows={4} value={questionText} onChange={(event) => onQuestionChange(event.target.value)} placeholder="Escribe tu pregunta sobre este producto" className="w-full resize-none rounded-md border border-white/10 bg-slate-950 p-3 text-sm font-semibold outline-none placeholder:text-slate-600 focus:border-sky-400" />
                <button disabled={busy} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-sky-500 text-sm font-black hover:bg-sky-400 disabled:opacity-60"><FiMessageSquare /> Publicar pregunta</button>
              </form>
            ) : !canAnswer && (
              <Link to="/shop/login" state={{ returnTo: productPath }} className="mt-6 flex h-11 items-center justify-center gap-2 rounded-md border border-sky-400/30 bg-sky-500/10 text-sm font-black text-sky-300 hover:bg-sky-500/20"><FiLogIn /> Ingresa para preguntar</Link>
            )}
          </div>

          <div className="space-y-3">
            {questions.length === 0 ? (
              <div className="rounded-md border border-dashed border-white/15 p-10 text-center text-slate-500"><FiMessageSquare className="mx-auto" size={30} /><p className="mt-3 font-black">Aun no hay preguntas para este producto.</p></div>
            ) : questions.map((question) => {
              const isOwn = role === "ROLE_CUSTOMER" && question.username === username;
              return (
                <article key={question.id} className="rounded-md border border-white/10 bg-slate-950 p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-500/15 font-black text-sky-300">P</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-black leading-6">{question.question}</p>
                      <p className="mt-2 text-xs font-bold text-slate-500">{question.username} | {formatDate(question.createdAt)}</p>
                    </div>
                  </div>

                  {question.answer && (
                    <div className="ml-0 mt-4 flex items-start gap-3 border-l-2 border-emerald-400/40 pl-4 sm:ml-12">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-xs font-black text-emerald-300">R</span>
                      <div><p className="font-semibold leading-6 text-slate-300">{question.answer}</p><p className="mt-2 text-xs font-black text-emerald-300">Equipo SmartLogix | {question.answeredBy}</p></div>
                    </div>
                  )}

                  {canAnswer && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <textarea rows={2} maxLength={1000} value={answerDrafts[question.id] ?? question.answer ?? ""} onChange={(event) => onAnswerChange((current) => ({ ...current, [question.id]: event.target.value }))} placeholder="Responder como equipo SmartLogix" className="w-full resize-none rounded-md border border-white/10 bg-slate-900 p-3 text-sm font-semibold outline-none placeholder:text-slate-600 focus:border-emerald-400" />
                      <button type="button" disabled={busy} onClick={() => onAnswer(question.id)} className="mt-2 flex h-9 items-center gap-2 rounded-md bg-emerald-500 px-4 text-xs font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-60"><FiSend /> {question.answer ? "Actualizar respuesta" : "Responder"}</button>
                    </div>
                  )}

                  {isOwn && confirmDeleteId !== question.id && (
                    <button type="button" onClick={() => onDelete(question.id)} className="mt-4 flex items-center gap-2 text-xs font-black text-red-300 hover:text-red-200"><FiTrash2 /> Eliminar mi pregunta</button>
                  )}
                  {isOwn && confirmDeleteId === question.id && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-400/25 bg-red-500/10 p-3">
                      <p className="text-xs font-bold text-red-200">Eliminar esta pregunta?</p>
                      <div className="flex gap-2"><button type="button" onClick={onDeleteCancel} className="h-8 rounded-md border border-white/15 px-3 text-xs font-black">Cancelar</button><button type="button" disabled={busy} onClick={() => onDeleteConfirm(question.id)} className="h-8 rounded-md bg-red-500 px-3 text-xs font-black disabled:opacity-60">Eliminar</button></div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function StarPicker({ onChange, value }) {
  return (
    <div className="mt-4 flex gap-1" aria-label="Calificacion">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button key={rating} type="button" onClick={() => onChange(rating)} title={`${rating} estrella${rating > 1 ? "s" : ""}`} className={`flex h-9 w-9 items-center justify-center rounded-md ${rating <= value ? "text-amber-300" : "text-slate-700 hover:text-amber-200"}`}><FiStar fill={rating <= value ? "currentColor" : "none"} size={22} /></button>
      ))}
    </div>
  );
}

function StarDisplay({ rating, size = 16 }) {
  return <div className="flex gap-1 text-amber-300" aria-label={`${rating} de 5 estrellas`}>{[1, 2, 3, 4, 5].map((value) => <FiStar key={value} size={size} fill={value <= rating ? "currentColor" : "none"} className={value <= rating ? "text-amber-300" : "text-slate-700"} />)}</div>;
}

function formatDate(value) {
  if (!value) return "Reciente";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(value));
}

function RelatedProduct({ onAdd, product }) {
  const available = Number(product.availableQuantity || 0) > 0;
  return (
    <article className="overflow-hidden rounded-md border border-white/10 bg-slate-900">
      <Link to={`/shop/product/${encodeURIComponent(product.sku)}`} className="block h-44 bg-white">
        {product.imageUrl ? <img src={product.imageUrl} alt={product.productName} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-5xl font-black text-slate-300">{product.productName.charAt(0)}</div>}
      </Link>
      <div className="p-4">
        <p className="text-[10px] font-black uppercase text-sky-300">{product.brand}</p>
        <Link to={`/shop/product/${encodeURIComponent(product.sku)}`} className="mt-2 block min-h-12 font-black leading-6 hover:text-sky-300">{product.productName}</Link>
        <p className="mt-3 text-xl font-black">{formatCurrency(product.salePrice)}</p>
        <button type="button" disabled={!available} onClick={onAdd} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-sky-500 text-sm font-black hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500"><FiShoppingCart /> Agregar</button>
      </div>
    </article>
  );
}

export default ProductDetailPage;
