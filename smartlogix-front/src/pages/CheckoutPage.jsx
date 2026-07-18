import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiCheck,
  FiCreditCard,
  FiHome,
  FiInfo,
  FiLock,
  FiMapPin,
  FiPackage,
  FiShield,
  FiTag,
  FiTruck,
  FiUser,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo-smartlogix.png";
import {
  createCustomerAddress,
  loadCustomerProfile,
} from "../services/customerAccountService";
import { getPublicCatalogProducts } from "../services/inventoryService";
import {
  loadShippingQuote,
  saveOrder,
  validateOrderDiscount,
} from "../services/orderService";

const CART_STORAGE_KEY = "smartlogix-store-cart";
const PICKUP_LOCATIONS = [
  "Sucursal Santiago Centro - Alameda 1234",
  "Sucursal Providencia - Nueva Providencia 2040",
  "Sucursal Las Condes - Apoquindo 4501",
];
const CHILEAN_REGIONS = [
  "Arica y Parinacota",
  "Tarapaca",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaiso",
  "Region Metropolitana",
  "O'Higgins",
  "Maule",
  "Nuble",
  "Biobio",
  "La Araucania",
  "Los Rios",
  "Los Lagos",
  "Aysen",
  "Magallanes",
];
const EMPTY_CUSTOMER = {
  addressLine2: "",
  commune: "",
  country: "Chile",
  document: "",
  email: "",
  firstName: "",
  instructions: "",
  lastName: "",
  phone: "",
  postalCode: "",
  region: "Region Metropolitana",
  street: "",
};
const EMPTY_BILLING = {
  addressLine2: "",
  commune: "",
  country: "Chile",
  document: "",
  firstName: "",
  lastName: "",
  phone: "",
  postalCode: "",
  region: "Region Metropolitana",
  street: "",
};

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
    return Array.isArray(value) ? value : [];
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

function shippingOptionNote(option, fallback) {
  if (!option) return fallback;
  if (!option.available) return option.note || "No disponible para esta comuna";
  const days = option.estimatedDaysMin === option.estimatedDaysMax
    ? `${option.estimatedDaysMin} dia habil`
    : `${option.estimatedDaysMin} a ${option.estimatedDaysMax} dias habiles`;
  return `${days}. ${option.note}`;
}

function shippingOptionPrice(option, loading) {
  if (loading) return "Calculando...";
  if (!option) return "Por calcular";
  if (!option.available) return "No disponible";
  return Number(option.amount || 0) > 0 ? formatCurrency(option.amount) : "Gratis";
}

function splitName(value = "") {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || "",
    lastName: parts.join(" "),
  };
}

function composeAddress(data) {
  return [
    data.street,
    data.addressLine2,
    data.commune,
    data.region,
    data.postalCode ? `CP ${data.postalCode}` : null,
    data.country,
  ].map((part) => part?.trim()).filter(Boolean).join(", ");
}

function isValidRut(value) {
  const clean = String(value || "").replace(/\./g, "").replace(/-/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  let sum = 0;
  let multiplier = 2;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const result = 11 - (sum % 11);
  const expected = result === 11 ? "0" : result === 10 ? "K" : String(result);
  return verifier === expected;
}

function CheckoutPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(readCart);
  const [products, setProducts] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountPreview, setDiscountPreview] = useState(null);
  const [discountChecking, setDiscountChecking] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState("DELIVERY");
  const [shippingMethod, setShippingMethod] = useState("STANDARD");
  const [shippingQuote, setShippingQuote] = useState(null);
  const [shippingQuoteError, setShippingQuoteError] = useState("");
  const [shippingQuoteLoading, setShippingQuoteLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("WEBPAY_SIMULATED");
  const [pickupLocation, setPickupLocation] = useState(PICKUP_LOCATIONS[0]);
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [billingSame, setBillingSame] = useState(true);
  const [billing, setBilling] = useState(EMPTY_BILLING);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [saveInformation, setSaveInformation] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getPublicCatalogProducts(), loadCustomerProfile()])
      .then(([catalog, profile]) => {
        if (!active) return;
        const profileAddresses = Array.isArray(profile.addresses) ? profile.addresses : [];
        const defaultAddress = profileAddresses.find((address) => address.defaultAddress)
          || profileAddresses[0];
        const profileName = splitName(defaultAddress?.recipientName || profile.displayName || profile.username);
        setProducts(Array.isArray(catalog) ? catalog : []);
        setAddresses(profileAddresses);
        setSelectedAddressId(defaultAddress?.id ? String(defaultAddress.id) : "");
        setCustomer({
          ...EMPTY_CUSTOMER,
          commune: defaultAddress?.commune || "",
          email: profile.email || "",
          firstName: profileName.firstName,
          lastName: profileName.lastName,
          phone: defaultAddress?.phone || profile.phone || "",
          region: defaultAddress?.region || EMPTY_CUSTOMER.region,
          street: defaultAddress?.street || "",
        });
      })
      .catch((loadError) => {
        console.error(loadError);
        if (active) setError("No se pudo preparar el checkout. Intenta nuevamente.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const cartProducts = useMemo(
    () => cart.map((cartItem) => {
      const product = products.find((item) => item.sku === cartItem.sku);
      if (!product) return null;
      const price = Number(product.salePrice || 0);
      return {
        ...product,
        availableUnits: Number(product.availableQuantity || 0),
        cartQuantity: cartItem.quantity,
        lineTotal: price * cartItem.quantity,
        price,
      };
    }).filter(Boolean),
    [cart, products]
  );

  const shippingLines = useMemo(
    () => cartProducts.map((product) => ({
      quantity: product.cartQuantity,
      sku: product.sku,
    })),
    [cartProducts]
  );

  useEffect(() => {
    if (fulfillmentMethod !== "DELIVERY") {
      setShippingQuote(null);
      setShippingQuoteError("");
      setShippingQuoteLoading(false);
      return undefined;
    }
    if (!customer.region.trim() || !customer.commune.trim() || shippingLines.length === 0) {
      setShippingQuote(null);
      setShippingQuoteError("");
      setShippingQuoteLoading(false);
      return undefined;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        setShippingQuoteLoading(true);
        setShippingQuoteError("");
        const quote = await loadShippingQuote({
          commune: customer.commune.trim(),
          lines: shippingLines,
          region: customer.region.trim(),
        });
        if (!active) return;
        setShippingQuote(quote);
        setShippingMethod((currentMethod) => {
          const selectedOption = quote.options?.find((option) => option.method === currentMethod);
          return selectedOption?.available ? currentMethod : "STANDARD";
        });
      } catch (quoteError) {
        console.error(quoteError);
        if (!active) return;
        setShippingQuote(null);
        setShippingQuoteError(quoteError.response?.data?.message
          || "No se pudo calcular el despacho para esta ubicacion.");
      } finally {
        if (active) setShippingQuoteLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [customer.commune, customer.region, fulfillmentMethod, shippingLines]);

  const subtotal = cartProducts.reduce((total, product) => total + product.lineTotal, 0);
  const standardShippingOption = shippingQuote?.options?.find((option) => option.method === "STANDARD");
  const expressShippingOption = shippingQuote?.options?.find((option) => option.method === "EXPRESS");
  const selectedShippingOption = shippingQuote?.options?.find((option) => option.method === shippingMethod);
  const shippingAmount = fulfillmentMethod === "PICKUP"
    ? 0
    : Number(selectedShippingOption?.amount || 0);
  const discountAmount = Number(discountPreview?.discountAmount || 0);
  const estimatedTotal = Math.max(0, subtotal - discountAmount + shippingAmount);

  function updateCustomer(event) {
    const { name, value } = event.target;
    if (name === "region" || name === "commune") {
      setShippingQuote(null);
      setShippingQuoteError("");
    }
    setCustomer((current) => ({ ...current, [name]: value }));
  }

  function updateBilling(event) {
    const { name, value } = event.target;
    setBilling((current) => ({ ...current, [name]: value }));
  }

  function selectSavedAddress(event) {
    const addressId = event.target.value;
    setSelectedAddressId(addressId);
    const address = addresses.find((item) => String(item.id) === addressId);
    if (!address) return;
    setShippingQuote(null);
    setShippingQuoteError("");
    const recipient = splitName(address.recipientName);
    setCustomer((current) => ({
      ...current,
      commune: address.commune,
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      phone: address.phone || current.phone,
      region: address.region,
      street: address.street,
    }));
  }

  function selectFulfillment(value) {
    setFulfillmentMethod(value);
    if (value === "DELIVERY" && paymentMethod === "PAY_ON_PICKUP") {
      setPaymentMethod("WEBPAY_SIMULATED");
    }
  }

  function validateCheckout() {
    if (cartProducts.length === 0) return "Tu carrito esta vacio.";
    const unavailable = cartProducts.find((product) => product.cartQuantity > product.availableUnits);
    if (unavailable) return `No hay stock suficiente para ${unavailable.productName}.`;
    if (!customer.email.trim() || !/^\S+@\S+\.\S+$/.test(customer.email)) return "Ingresa un correo valido.";
    if (!customer.firstName.trim() || !customer.lastName.trim()) return "Completa nombre y apellidos.";
    if (!isValidRut(customer.document)) return "Ingresa un RUT chileno valido.";
    if (customer.phone.replace(/\D/g, "").length < 8) return "Ingresa un telefono valido.";
    if (fulfillmentMethod === "DELIVERY") {
      if (!customer.street.trim() || !customer.commune.trim() || !customer.region.trim()) {
        return "Completa direccion, comuna y region para el despacho.";
      }
      if (shippingQuoteLoading) return "Espera mientras calculamos el costo de despacho.";
      if (shippingQuoteError || !shippingQuote) {
        return shippingQuoteError || "No fue posible cotizar el despacho.";
      }
    } else if (!pickupLocation) {
      return "Selecciona una sucursal de retiro.";
    }
    if (!paymentMethod) return "Selecciona un medio de pago.";
    if (!billingSame) {
      if (!billing.firstName.trim() || !billing.lastName.trim() || !isValidRut(billing.document)) {
        return "Completa correctamente el nombre y RUT de facturacion.";
      }
      if (!billing.street.trim() || !billing.commune.trim() || !billing.region.trim()) {
        return "Completa la direccion de facturacion.";
      }
    }
    return "";
  }

  async function saveAddressIfNeeded() {
    if (!saveInformation || fulfillmentMethod !== "DELIVERY") return;
    const exists = addresses.some((address) => address.street.trim().toLowerCase() === customer.street.trim().toLowerCase()
      && address.commune.trim().toLowerCase() === customer.commune.trim().toLowerCase());
    if (exists) return;
    try {
      await createCustomerAddress({
        commune: customer.commune.trim(),
        defaultAddress: addresses.length === 0,
        label: "Casa",
        phone: customer.phone.trim(),
        recipientName: `${customer.firstName} ${customer.lastName}`.trim(),
        region: customer.region.trim(),
        street: [customer.street, customer.addressLine2].filter(Boolean).join(", "),
      });
    } catch (addressError) {
      console.error("No se pudo guardar la direccion, pero la compra fue creada:", addressError);
    }
  }

  async function applyDiscount() {
    if (!discountCode.trim() || subtotal <= 0) return;
    try {
      setDiscountChecking(true);
      setDiscountError("");
      const preview = await validateOrderDiscount(discountCode.trim(), subtotal);
      setDiscountCode(preview.code);
      setDiscountPreview(preview);
    } catch (validationError) {
      setDiscountPreview(null);
      setDiscountError(validationError.response?.data?.message
        || "No fue posible aplicar este codigo de descuento.");
    } finally {
      setDiscountChecking(false);
    }
  }

  async function confirmOrder() {
    const validationError = validateCheckout();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const shippingAddress = fulfillmentMethod === "DELIVERY" ? composeAddress(customer) : null;
    const billingAddress = billingSame
      ? (shippingAddress || pickupLocation)
      : composeAddress(billing);

    try {
      setSubmitting(true);
      setError("");
      const response = await saveOrder({
        billingAddress,
        customerDocument: customer.document.trim(),
        customerEmail: customer.email.trim(),
        customerName: `${customer.firstName} ${customer.lastName}`.trim(),
        customerPhone: customer.phone.trim(),
        deliveryInstructions: customer.instructions.trim() || null,
        discountCode: discountPreview ? discountCode.trim() : null,
        fulfillmentMethod,
        lines: cartProducts.map((product) => ({
          quantity: product.cartQuantity,
          sku: product.sku,
        })),
        marketingOptIn,
        paymentMethod,
        pickupLocation: fulfillmentMethod === "PICKUP" ? pickupLocation : null,
        shippingAddress,
        shippingCommune: fulfillmentMethod === "DELIVERY" ? customer.commune.trim() : null,
        shippingMethod: fulfillmentMethod === "DELIVERY" ? shippingMethod : null,
        shippingRegion: fulfillmentMethod === "DELIVERY" ? customer.region.trim() : null,
      });
      await saveAddressIfNeeded();
      setCart([]);
      localStorage.setItem(CART_STORAGE_KEY, "[]");
      navigate(`/shop/order/${encodeURIComponent(response.orderNumber)}`, {
        replace: true,
        state: { newOrder: true },
      });
    } catch (checkoutError) {
      console.error(checkoutError);
      setError(checkoutError.response?.data?.message
        || "No se pudo completar la compra. Revisa los datos, el stock y el descuento.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <CheckoutHeader />
      {loading ? (
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center font-bold text-slate-400"><FiPackage className="mr-3" /> Preparando checkout...</div>
      ) : (
        <main className="mx-auto grid min-h-[calc(100vh-80px)] max-w-[1500px] lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,0.75fr)]">
          <section className="px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
            <Link to="/shop/cart" className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-white"><FiArrowLeft /> Volver al carrito</Link>
            <div className="mt-7">
              <p className="text-xs font-black uppercase text-sky-300">Checkout protegido</p>
              <h1 className="mt-2 text-3xl font-black">Finaliza tu compra</h1>
            </div>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <CheckoutSection icon={FiUser} title="Contacto">
              <CheckoutInput label="Correo electronico" name="email" onChange={updateCustomer} type="email" value={customer.email} wide />
              <CheckField checked={marketingOptIn} label="Enviarme novedades y ofertas por correo electronico" onChange={setMarketingOptIn} />
            </CheckoutSection>

            <CheckoutSection icon={FiTruck} title="Entrega">
              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceButton active={fulfillmentMethod === "DELIVERY"} icon={FiTruck} label="Despacho" note="Recibe en tu domicilio" onClick={() => selectFulfillment("DELIVERY")} />
                <ChoiceButton active={fulfillmentMethod === "PICKUP"} icon={FiHome} label="Retiro" note="Sin costo en sucursal" onClick={() => selectFulfillment("PICKUP")} />
              </div>

              {fulfillmentMethod === "DELIVERY" ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {addresses.length > 0 && (
                    <CheckoutSelect label="Direccion guardada" onChange={selectSavedAddress} value={selectedAddressId} wide>
                      <option value="">Ingresar una direccion nueva</option>
                      {addresses.map((address) => <option key={address.id} value={address.id}>{address.label}: {address.street}, {address.commune}</option>)}
                    </CheckoutSelect>
                  )}
                  <CheckoutSelect label="Pais / Region" name="country" onChange={updateCustomer} value={customer.country} wide><option>Chile</option></CheckoutSelect>
                  <CheckoutInput label="Nombre" name="firstName" onChange={updateCustomer} value={customer.firstName} />
                  <CheckoutInput label="Apellidos" name="lastName" onChange={updateCustomer} value={customer.lastName} />
                  <CheckoutInput label="RUT" name="document" onChange={updateCustomer} placeholder="18.406.158-9" value={customer.document} wide />
                  <CheckoutInput label="Direccion" name="street" onChange={updateCustomer} placeholder="Calle y numero" value={customer.street} wide />
                  <CheckoutInput label="Casa, departamento, oficina (opcional)" name="addressLine2" onChange={updateCustomer} value={customer.addressLine2} wide />
                  <CheckoutInput label="Codigo postal (opcional)" name="postalCode" onChange={updateCustomer} value={customer.postalCode} />
                  <CheckoutInput label="Comuna" name="commune" onChange={updateCustomer} value={customer.commune} />
                  <CheckoutSelect label="Region" name="region" onChange={updateCustomer} value={customer.region} wide>{CHILEAN_REGIONS.map((region) => <option key={region}>{region}</option>)}</CheckoutSelect>
                  <CheckoutInput label="Telefono" name="phone" onChange={updateCustomer} placeholder="+56 9 1234 5678" type="tel" value={customer.phone} wide />
                  <CheckoutInput label="Instrucciones de entrega (opcional)" name="instructions" onChange={updateCustomer} placeholder="Torre, conserjeria, referencias..." value={customer.instructions} wide />
                  <CheckField checked={saveInformation} label="Guardar esta direccion para comprar mas rapido la proxima vez" onChange={setSaveInformation} />
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <CheckoutInput label="Nombre" name="firstName" onChange={updateCustomer} value={customer.firstName} />
                  <CheckoutInput label="Apellidos" name="lastName" onChange={updateCustomer} value={customer.lastName} />
                  <CheckoutInput label="RUT" name="document" onChange={updateCustomer} value={customer.document} />
                  <CheckoutInput label="Telefono" name="phone" onChange={updateCustomer} type="tel" value={customer.phone} />
                  <CheckoutSelect icon={FiMapPin} label="Sucursal de retiro" onChange={(event) => setPickupLocation(event.target.value)} value={pickupLocation} wide>{PICKUP_LOCATIONS.map((location) => <option key={location}>{location}</option>)}</CheckoutSelect>
                </div>
              )}
            </CheckoutSection>

            <CheckoutSection icon={FiPackage} title="Metodo de entrega">
              {fulfillmentMethod === "DELIVERY" ? (
                <div className="space-y-3">
                  <DeliveryOption
                    active={shippingMethod === "STANDARD"}
                    disabled={!standardShippingOption || shippingQuoteLoading}
                    label="Despacho estandar"
                    note={shippingOptionNote(standardShippingOption, "Completa region y comuna para cotizar")}
                    onClick={() => setShippingMethod("STANDARD")}
                    price={shippingOptionPrice(standardShippingOption, shippingQuoteLoading)}
                  />
                  <DeliveryOption
                    active={shippingMethod === "EXPRESS"}
                    disabled={!expressShippingOption?.available || shippingQuoteLoading}
                    label="Despacho express"
                    note={shippingOptionNote(expressShippingOption, "Completa region y comuna para cotizar")}
                    onClick={() => setShippingMethod("EXPRESS")}
                    price={shippingOptionPrice(expressShippingOption, shippingQuoteLoading)}
                  />
                  {shippingQuote && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-200">
                      <span><FiMapPin className="mr-2 inline" />{shippingQuote.zoneName}: {shippingQuote.commune}</span>
                      {Number(shippingQuote.remainingForFreeShipping || 0) > 0
                        ? <span>Faltan {formatCurrency(shippingQuote.remainingForFreeShipping)} para despacho estandar gratis</span>
                        : <span>Tu compra alcanza el beneficio de despacho gratis</span>}
                    </div>
                  )}
                  {shippingQuoteError && <p className="flex items-center gap-2 border border-red-400/30 bg-red-500/10 p-3 text-xs font-bold text-red-200"><FiInfo />{shippingQuoteError}</p>}
                </div>
              ) : (
                <DeliveryOption active label="Retiro en sucursal" note={pickupLocation} price="Gratis" />
              )}
            </CheckoutSection>

            <CheckoutSection icon={FiCreditCard} title="Pago" description="Los medios de pago se representan de forma segura y simulada.">
              <div className="space-y-3">
                <PaymentOption active={paymentMethod === "WEBPAY_SIMULATED"} badges={["VISA", "MC", "+3"]} label="Webpay simulado" note="Tarjeta, debito y cuotas" onClick={() => setPaymentMethod("WEBPAY_SIMULATED")} />
                <PaymentOption active={paymentMethod === "BANK_TRANSFER_SIMULATED"} badges={["Banco", "CLP"]} label="Transferencia simulada" note="Confirmacion inmediata para la demostracion" onClick={() => setPaymentMethod("BANK_TRANSFER_SIMULATED")} />
                {fulfillmentMethod === "PICKUP" && <PaymentOption active={paymentMethod === "PAY_ON_PICKUP"} badges={["Local"]} label="Pagar al retirar" note="El pago quedara pendiente" onClick={() => setPaymentMethod("PAY_ON_PICKUP")} />}
              </div>
              <div className="mt-4 flex gap-3 border border-sky-400/20 bg-sky-500/10 p-4 text-xs font-bold text-sky-100"><FiShield className="mt-0.5 shrink-0" /> No guardamos numeros de tarjeta, claves ni datos bancarios.</div>
            </CheckoutSection>

            <CheckoutSection icon={FiHome} title="Direccion de facturacion">
              <div className="space-y-3">
                <RadioRow active={billingSame} label="Usar la misma informacion de entrega" onClick={() => setBillingSame(true)} />
                <RadioRow active={!billingSame} label="Usar una direccion de facturacion distinta" onClick={() => setBillingSame(false)} />
              </div>
              {!billingSame && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <CheckoutSelect label="Pais / Region" name="country" onChange={updateBilling} value={billing.country} wide><option>Chile</option></CheckoutSelect>
                  <CheckoutInput label="Nombre" name="firstName" onChange={updateBilling} value={billing.firstName} />
                  <CheckoutInput label="Apellidos" name="lastName" onChange={updateBilling} value={billing.lastName} />
                  <CheckoutInput label="RUT" name="document" onChange={updateBilling} value={billing.document} wide />
                  <CheckoutInput label="Direccion" name="street" onChange={updateBilling} value={billing.street} wide />
                  <CheckoutInput label="Casa, departamento, oficina (opcional)" name="addressLine2" onChange={updateBilling} value={billing.addressLine2} wide />
                  <CheckoutInput label="Codigo postal (opcional)" name="postalCode" onChange={updateBilling} value={billing.postalCode} />
                  <CheckoutInput label="Comuna" name="commune" onChange={updateBilling} value={billing.commune} />
                  <CheckoutSelect label="Region" name="region" onChange={updateBilling} value={billing.region} wide>{CHILEAN_REGIONS.map((region) => <option key={region}>{region}</option>)}</CheckoutSelect>
                  <CheckoutInput label="Telefono" name="phone" onChange={updateBilling} type="tel" value={billing.phone} wide />
                </div>
              )}
            </CheckoutSection>

            <button type="button" disabled={submitting || cartProducts.length === 0} onClick={confirmOrder} className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-6 text-base font-black text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"><FiLock /> {submitting ? "Procesando pedido..." : `Pagar ahora ${formatCurrency(estimatedTotal)}`}</button>

            <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-xs font-bold text-slate-600">
              <span>Politica de reembolso</span><span>Envios</span><span>Privacidad</span><span>Terminos del servicio</span>
            </footer>
          </section>

          <OrderSummary
            cartProducts={cartProducts}
            discountAmount={discountAmount}
            discountChecking={discountChecking}
            discountCode={discountCode}
            discountError={discountError}
            discountPreview={discountPreview}
            fulfillmentMethod={fulfillmentMethod}
            onApplyDiscount={applyDiscount}
            onDiscountChange={(value) => {
              setDiscountCode(value.toUpperCase());
              setDiscountPreview(null);
              setDiscountError("");
            }}
            shippingAmount={shippingAmount}
            shippingLoading={shippingQuoteLoading}
            shippingMethod={shippingMethod}
            subtotal={subtotal}
            total={estimatedTotal}
          />
        </main>
      )}
    </div>
  );
}

function CheckoutHeader() {
  return (
    <header className="border-b border-white/10 bg-indigo-950">
      <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-8 lg:px-12">
        <Link to="/shop" className="flex items-center gap-3"><img src={logo} alt="SmartLogix" className="h-8 w-auto" /><span className="hidden border-l border-white/15 pl-3 text-xs font-black uppercase text-sky-300 sm:block">Checkout</span></Link>
        <div className="flex items-center gap-2 text-xs font-black text-emerald-300"><FiShield size={18} /> Pago protegido</div>
      </div>
    </header>
  );
}

function CheckoutSection({ children, description, icon: Icon, title }) {
  return (
    <section className="mt-9 border-t border-white/10 pt-8 first-of-type:mt-8">
      <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-300"><Icon /></span><div><h2 className="text-xl font-black">{title}</h2>{description && <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>}</div></div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function OrderSummary({ cartProducts, discountAmount, discountChecking, discountCode, discountError, discountPreview, fulfillmentMethod, onApplyDiscount, onDiscountChange, shippingAmount, shippingLoading, shippingMethod, subtotal, total }) {
  return (
    <aside className="border-l border-white/10 bg-slate-900 px-4 py-8 sm:px-8 lg:sticky lg:top-0 lg:min-h-[calc(100vh-80px)] lg:self-start lg:px-10 lg:py-10">
      <h2 className="text-xl font-black">Resumen del pedido</h2>
      <div className="mt-6 max-h-[360px] space-y-4 overflow-y-auto pr-1">
        {cartProducts.map((product) => <SummaryProduct key={product.sku} product={product} />)}
        {cartProducts.length === 0 && <p className="border border-dashed border-white/15 p-6 text-center text-sm font-bold text-slate-500">El carrito esta vacio.</p>}
      </div>
      <div className="mt-6 flex gap-2 border-y border-white/10 py-5">
        <label className="relative min-w-0 flex-1"><FiTag className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={discountCode} onChange={(event) => onDiscountChange(event.target.value)} placeholder="Codigo de descuento" className="field-control pl-10" /></label>
        <button type="button" disabled={!discountCode.trim() || discountChecking} onClick={onApplyDiscount} className="h-11 rounded-md border border-sky-400/30 px-4 text-xs font-black text-sky-200 hover:bg-sky-500/10 disabled:opacity-40">{discountChecking ? "Validando..." : "Aplicar"}</button>
      </div>
      {discountPreview && <p className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-300"><FiCheck /> Codigo {discountPreview.code} aplicado: {discountPreview.percentage}% de descuento.</p>}
      {discountError && <p className="mt-3 flex items-center gap-2 text-xs font-bold text-rose-300"><FiInfo /> {discountError}</p>}
      <div className="mt-6 space-y-3 text-sm font-bold">
        <SummaryLine label="Subtotal" value={formatCurrency(subtotal)} />
        <SummaryLine label={fulfillmentMethod === "PICKUP" ? "Retiro" : shippingMethod === "EXPRESS" ? "Envio express" : "Envio estandar"} value={shippingLoading ? "Calculando..." : shippingAmount ? formatCurrency(shippingAmount) : "Gratis"} />
        <SummaryLine label="Descuento" value={discountAmount > 0 ? `-${formatCurrency(discountAmount)}` : "-"} />
      </div>
      <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/10 pt-5"><div><p className="font-black">Total estimado</p><p className="mt-1 text-xs font-bold text-slate-500">CLP</p></div><p className="text-3xl font-black text-sky-200">{formatCurrency(total)}</p></div>
      <div className="mt-7 space-y-3 border-t border-white/10 pt-5 text-xs font-bold text-slate-500"><p className="flex items-center gap-2"><FiLock className="text-emerald-300" /> Sesion y compra protegidas</p><p className="flex items-center gap-2"><FiPackage className="text-amber-300" /> Precio y stock validados al confirmar</p></div>
    </aside>
  );
}

function SummaryProduct({ product }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0">{product.imageUrl ? <img src={product.imageUrl} alt={product.productName} className="h-16 w-16 rounded-md bg-white object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-md bg-slate-800"><FiPackage /></div>}<span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-600 px-1 text-[10px] font-black">{product.cartQuantity}</span></div>
      <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-black">{product.productName}</p><p className="mt-1 text-xs font-bold text-slate-500">{product.sku}</p></div>
      <p className="shrink-0 text-sm font-black text-slate-200">{formatCurrency(product.lineTotal)}</p>
    </div>
  );
}

function ChoiceButton({ active, icon: Icon, label, note, onClick }) {
  return <button type="button" onClick={onClick} className={`flex min-h-20 items-center gap-3 rounded-md border p-4 text-left ${active ? "border-sky-400 bg-sky-500/10" : "border-white/10 bg-slate-900 hover:border-white/25"}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${active ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-500"}`}><Icon /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs font-bold text-slate-500">{note}</span></span><RadioDot active={active} /></button>;
}

function DeliveryOption({ active, disabled, label, note, onClick, price }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`flex min-h-16 w-full items-center gap-3 rounded-md border px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${active ? "border-sky-400 bg-sky-500/10" : "border-white/10 bg-slate-900 hover:border-white/25"}`}><RadioDot active={active} /><span className="min-w-0 flex-1"><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs font-bold text-slate-500">{note}</span></span><strong className={price === "Gratis" ? "text-emerald-300" : "text-slate-200"}>{price}</strong></button>;
}

function PaymentOption({ active, badges, label, note, onClick }) {
  return <button type="button" onClick={onClick} className={`w-full overflow-hidden rounded-md border text-left ${active ? "border-sky-400 bg-sky-500/10" : "border-white/10 bg-slate-900 hover:border-white/25"}`}><span className="flex min-h-16 items-center gap-3 px-4 py-3"><RadioDot active={active} /><span className="min-w-0 flex-1"><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs font-bold text-slate-500">{note}</span></span><span className="flex shrink-0 gap-1">{badges.map((badge, index) => <span key={badge} className={`rounded px-1.5 py-1 text-[9px] font-black ${index % 2 === 0 ? "bg-sky-500 text-white" : "bg-amber-400 text-slate-950"}`}>{badge}</span>)}</span></span>{active && <span className="block border-t border-sky-400/20 bg-slate-950/40 px-11 py-3 text-xs font-bold text-slate-400">Se generara una referencia simulada y no se solicitaran credenciales bancarias.</span>}</button>;
}

function RadioRow({ active, label, onClick }) {
  return <button type="button" onClick={onClick} className={`flex h-14 w-full items-center gap-3 rounded-md border px-4 text-left text-sm font-bold ${active ? "border-sky-400 bg-sky-500/10" : "border-white/10 bg-slate-900"}`}><RadioDot active={active} />{label}</button>;
}

function RadioDot({ active }) {
  return <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? "border-sky-400" : "border-slate-600"}`}>{active && <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />}</span>;
}

function CheckoutInput({ label, name, onChange, placeholder, type = "text", value, wide }) {
  return <label className={`block ${wide ? "sm:col-span-2" : ""}`}><span className="mb-2 block text-xs font-black text-slate-400">{label}</span><input className="field-control" name={name} onChange={onChange} placeholder={placeholder} type={type} value={value} /></label>;
}

function CheckoutSelect({ children, icon: Icon, label, name, onChange, value, wide }) {
  return <label className={`block ${wide ? "sm:col-span-2" : ""}`}><span className="mb-2 block text-xs font-black text-slate-400">{label}</span><span className="relative block">{Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sky-300" />}<select className={`field-control ${Icon ? "pl-10" : ""}`} name={name} onChange={onChange} value={value}>{children}</select></span></label>;
}

function CheckField({ checked, label, onChange }) {
  return <label className="flex items-start gap-3 sm:col-span-2"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 accent-sky-500" /><span className="text-xs font-bold text-slate-400">{label}</span></label>;
}

function SummaryLine({ label, value }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{label}</span><span className="text-right text-slate-200">{value}</span></div>;
}

function ErrorMessage({ children }) {
  return <div className="mt-6 border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">{children}</div>;
}

export default CheckoutPage;
