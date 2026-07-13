import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PageContainer from "../layout/PageContainer";
import { loadUsersService, saveUser, editUser } from "../services/userService";

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    email: "",
    birthDate: "",
    password: "",
    role: "ROLE_USER",
    enabled: true,
  });

  async function loadUsers() {
    try {
      const data = await loadUsersService();
      setUsers(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los usuarios.");
    }
  }

  useEffect(() => {
    loadUsers();
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
    setFormData({
      username: "",
      displayName: "",
      email: "",
      birthDate: "",
      password: "",
      role: "ROLE_USER",
      enabled: true,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const userData = {
        username: formData.username,
        displayName: formData.displayName,
        email: formData.email,
        birthDate: formData.birthDate,
        password: formData.password,
        role: formData.role,
        enabled: formData.enabled,
      };

      if (editingId) {
        await editUser(editingId, userData);
      } else {
        await saveUser(userData);
      }

      await loadUsers();
      resetForm();
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar el usuario.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(user) {
    setEditingId(user.id);
    setFormData({
      username: user.username,
      displayName: user.displayName || user.username,
      email: user.email,
      birthDate: user.birthDate || "",
      password: "",
      role: user.role,
      enabled: user.enabled,
    });
  }

  async function handleToggleEnabled(user) {
    const nextEnabled = !user.enabled;

    const confirmMessage = nextEnabled
      ? `¿Activar usuario ${user.username}?`
      : `¿Suspender usuario ${user.username}?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setSaving(true);
      setError("");

      await editUser(user.id, {
        username: user.username,
        displayName: user.displayName || user.username,
        email: user.email,
        birthDate: user.birthDate || "",
        password: "",
        role: user.role,
        enabled: nextEnabled,
      });

      await loadUsers();
    } catch (err) {
      console.error(err);
      setError("No se pudo cambiar el estado del usuario.");
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
            <div className="mb-8">
              <h1 className="text-4xl font-black mb-2">Usuarios</h1>
              <p className="text-slate-300">
                Administración de accesos, roles y estado de cuentas.
              </p>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-500/50 rounded-2xl p-5 mb-6">
                <p className="text-red-200 font-semibold">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
              <div className="bg-slate-800/80 border border-white/10 rounded-3xl p-6">
                <h2 className="text-2xl font-black mb-2">
                  {editingId ? "Editar usuario" : "Crear usuario"}
                </h2>
                <p className="text-slate-400 mb-6">
                  Gestiona permisos y accesos de la plataforma.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <input name="displayName" value={formData.displayName} onChange={handleChange} placeholder="Nombre visible" className="w-full bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none" />

                  <input name="username" value={formData.username} onChange={handleChange} placeholder="Usuario" required className="w-full bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none" />

                  <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Correo" required className="w-full bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none" />

                  <input name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} className="w-full bg-slate-950/80 border border-white/10 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none" />

                  <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder={editingId ? "Nueva contraseña opcional" : "Contraseña"} required={!editingId} className="w-full bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none" />

                  <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-slate-950/80 border border-white/10 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none">
                    <option value="ROLE_USER">Usuario / Pedidos</option>
                    <option value="ROLE_WAREHOUSE_MANAGER">Bodeguero / Inventario y envíos</option>
                    <option value="ROLE_ADMIN">Administrador</option>
                  </select>

                  <label className="flex items-center gap-3 text-slate-200">
                    <input type="checkbox" name="enabled" checked={formData.enabled} onChange={handleChange} className="w-5 h-5" />
                    Usuario habilitado
                  </label>

                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-500 disabled:opacity-60">
                      {saving ? "Guardando..." : editingId ? "Actualizar usuario" : "Crear usuario"}
                    </button>

                    <button type="button" onClick={resetForm} className="rounded-xl bg-white/10 px-6 py-3 font-bold text-white hover:bg-white/20">
                      Limpiar
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-800/80 border border-white/10 rounded-3xl p-6">
                <h2 className="text-2xl font-black mb-6">Usuarios registrados</h2>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-300 uppercase text-sm">
                        <th className="p-4 text-left rounded-l-xl">Usuario</th>
                        <th className="p-4 text-left">Correo</th>
                        <th className="p-4 text-left">Rol</th>
                        <th className="p-4 text-left">Estado</th>
                        <th className="p-4 text-left rounded-r-xl">Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-white/10 hover:bg-white/5 transition">
                          <td className="p-4">
                            <strong>{user.displayName || user.username}</strong>
                            <p className="text-slate-400">@{user.username}</p>
                          </td>

                          <td className="p-4">{user.email}</td>

                          <td className="p-4">
                            <span className="rounded-full bg-blue-500/20 text-blue-300 px-3 py-1 font-bold">
                              {user.role}
                            </span>
                          </td>

                          <td className="p-4">
                            <span className={`rounded-full px-3 py-1 font-bold ${
                              user.enabled
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-red-500/20 text-red-300"
                            }`}>
                              {user.enabled ? "Activo" : "Suspendido"}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="flex gap-2">
                              <button onClick={() => handleEdit(user)} className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-white hover:bg-amber-400">
                                Editar permisos
                              </button>

                              <button onClick={() => handleToggleEnabled(user)} className={`rounded-xl px-4 py-2 font-bold text-white transition ${
                                user.enabled
                                  ? "bg-red-500 hover:bg-red-400"
                                  : "bg-emerald-500 hover:bg-emerald-400"
                              }`}>
                                {user.enabled ? "Suspender" : "Activar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {users.length === 0 && (
                    <p className="text-slate-400 mt-6">No hay usuarios registrados.</p>
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

export default UsersPage;