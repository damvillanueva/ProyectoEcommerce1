import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PageContainer from "../layout/PageContainer";
import {loadDiscountsService, saveDiscount, editDiscount, removeDiscount,} from "../services/discountService";

const initialForm = {
  code: "",
  name: "",
  description: "",
  percentage: "",
  active: true,
  validFrom: "",
  validUntil: "",
  onlyNewUsers: true,
};

function DiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadDiscounts() {
    try {
      const data = await loadDiscountsService();
      setDiscounts(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los descuentos.");
    }
  }

  useEffect(() => {
    loadDiscounts();
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetForm() {
    setEditingId(null);
    setFormData(initialForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const percentage = Number(formData.percentage);

    if (!formData.code.trim()) {
      setError("Ingresa un código de descuento.");
      return;
    }

    if (!formData.name.trim()) {
      setError("Ingresa un nombre para el descuento.");
      return;
    }

    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      setError("El porcentaje debe estar entre 1 y 100.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        percentage,
        active: formData.active,
        validFrom: formData.validFrom || null,
        validUntil: formData.validUntil || null,
        onlyNewUsers: formData.onlyNewUsers,
      };

      if (editingId) {
        await editDiscount(editingId, payload);
      } else {
        await saveDiscount(payload);
      }

      await loadDiscounts();
      resetForm();
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar el descuento.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(discount) {
    setEditingId(discount.id);
    setFormData({
      code: discount.code || "",
      name: discount.name || "",
      description: discount.description || "",
      percentage: discount.percentage || "",
      active: Boolean(discount.active),
      validFrom: discount.validFrom || "",
      validUntil: discount.validUntil || "",
      onlyNewUsers: Boolean(discount.onlyNewUsers),
    });
  }

  async function handleDelete(discount) {
    if (!window.confirm(`¿Eliminar descuento ${discount.code}?`)) return;

    try {
      setSaving(true);
      setError("");
      await removeDiscount(discount.id);
      await loadDiscounts();

      if (editingId === discount.id) {
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo eliminar el descuento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <PageContainer>
        <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          <Navbar />

          <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8">
            <div className="flex justify-between items-start gap-6 mb-8">
              <div>
                <h1 className="text-4xl font-black">Gestión de descuentos</h1>
                <p className="text-slate-400 mt-2">
                  Administra códigos promocionales, vigencia y descuentos para nuevos usuarios.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-red-200 font-semibold">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl">
                <h2 className="text-2xl font-black mb-2">
                  {editingId ? "Editar descuento" : "Nuevo descuento"}
                </h2>

                <p className="text-slate-400 mb-6">
                  Define el código, porcentaje, vigencia y disponibilidad.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="Código: BIENVENIDA10"
                    className="w-full rounded-xl bg-slate-950/80 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-400"
                  />

                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Nombre del descuento"
                    className="w-full rounded-xl bg-slate-950/80 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-400"
                  />

                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Descripción"
                    rows="3"
                    className="w-full rounded-xl bg-slate-950/80 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-400"
                  />

                  <input
                    name="percentage"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.percentage}
                    onChange={handleChange}
                    placeholder="Porcentaje"
                    className="w-full rounded-xl bg-slate-950/80 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-400"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      name="validFrom"
                      type="date"
                      value={formData.validFrom}
                      onChange={handleChange}
                      className="w-full rounded-xl bg-slate-950/80 border border-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-400"
                    />

                    <input
                      name="validUntil"
                      type="date"
                      value={formData.validUntil}
                      onChange={handleChange}
                      className="w-full rounded-xl bg-slate-950/80 border border-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <label className="flex items-center gap-3 text-slate-200">
                    <input
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleChange}
                      className="w-5 h-5"
                    />
                    Descuento activo
                  </label>

                  <label className="flex items-center gap-3 text-slate-200">
                    <input
                      type="checkbox"
                      name="onlyNewUsers"
                      checked={formData.onlyNewUsers}
                      onChange={handleChange}
                      className="w-5 h-5"
                    />
                    Solo nuevos usuarios
                  </label>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-500 disabled:opacity-60 transition"
                    >
                      {saving
                        ? "Guardando..."
                        : editingId
                        ? "Actualizar"
                        : "Crear descuento"}
                    </button>

                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl bg-white/10 px-6 py-3 font-bold text-white hover:bg-white/20 transition"
                    >
                      Limpiar
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl">
                <h2 className="text-2xl font-black mb-6">
                  Descuentos registrados
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-left text-sm uppercase tracking-wide text-slate-400">
                        <th className="p-4 border-b border-white/10">Código</th>
                        <th className="p-4 border-b border-white/10">Nombre</th>
                        <th className="p-4 border-b border-white/10">%</th>
                        <th className="p-4 border-b border-white/10">Vigencia</th>
                        <th className="p-4 border-b border-white/10">Estado</th>
                        <th className="p-4 border-b border-white/10">Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {discounts.map((discount) => (
                        <tr key={discount.id} className="text-slate-200 hover:bg-white/5">
                          <td className="p-4 border-b border-white/10">
                            <strong className="text-white">{discount.code}</strong>
                            {discount.onlyNewUsers && (
                              <p className="text-xs text-slate-400">Nuevos usuarios</p>
                            )}
                          </td>

                          <td className="p-4 border-b border-white/10">
                            {discount.name}
                          </td>

                          <td className="p-4 border-b border-white/10">
                            <span className="rounded-full bg-indigo-500/20 px-3 py-1 font-bold text-indigo-200">
                              {discount.percentage}%
                            </span>
                          </td>

                          <td className="p-4 border-b border-white/10 text-slate-300">
                            {discount.validFrom || "Sin inicio"} → {discount.validUntil || "Sin término"}
                          </td>

                          <td className="p-4 border-b border-white/10">
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-bold ${
                                discount.active
                                  ? "bg-emerald-500/20 text-emerald-200"
                                  : "bg-red-500/20 text-red-200"
                              }`}
                            >
                              {discount.active ? "Activo" : "Inactivo"}
                            </span>
                          </td>

                          <td className="p-4 border-b border-white/10">
                            <button
                              onClick={() => handleEdit(discount)}
                              className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-white hover:bg-amber-400 mr-2"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => handleDelete(discount)}
                              className="rounded-xl bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-400"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {discounts.length === 0 && (
                    <p className="text-slate-400 mt-6">
                      No hay descuentos registrados.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </PageContainer>
    </div>
  );
}

export default DiscountsPage;