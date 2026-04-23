import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { META_CAPI_BASE } from "../lib/metaCapi";

type AuthConfig = {
  user: string;
  password: string;
};

type ClientLeadRow = {
  id: number;
  full_name: string;
  phone: string;
  zip_code: string;
  age_range: string | null;
  intro_answer: string | null;
  domain_attacked: string | null;
  device_ip: string | null;
  country: string | null;
  state_region: string | null;
  created_at: string;
  updated_at: string;
};

type ClientLeadForm = {
  fullName: string;
  phone: string;
  zipCode: string;
  ageRange: string;
  introAnswer: string;
};

const defaultAuthConfig: AuthConfig = {
  user: "admin01",
  password: "leo01",
};

const CLIENTS_SESSION_KEY = "attack_online_session";

export const DataClientsView = () => {
  const [config, setConfig] = useState<AuthConfig>(defaultAuthConfig);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ClientLeadRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ClientLeadForm>({
    fullName: "",
    phone: "",
    zipCode: "",
    ageRange: "",
    introAnswer: "",
  });
  const [rowActionError, setRowActionError] = useState("");
  const [rowActionLoadingId, setRowActionLoadingId] = useState<number | null>(
    null,
  );
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const rowsFingerprintRef = useRef("");

  const PAGE_SIZE = 20;

  const loadRows = useCallback(
    async (
      authUser: string,
      authPassword: string,
      options?: { silent?: boolean },
    ) => {
      const silent = options?.silent === true;
      if (!silent) {
        setIsLoading(true);
        setError("");
      }

      try {
        const params = new URLSearchParams({
          user: authUser,
          password: authPassword,
          limit: "300",
        });
        const response = await fetch(
          `${META_CAPI_BASE}/client-leads?${params.toString()}`,
        );
        const body = await response.json();

        if (!response.ok) {
          setError(
            body?.details ||
              body?.error ||
              "No se pudieron cargar los clientes.",
          );
          return false;
        }

        const incomingRows = Array.isArray(body?.rows) ? body.rows : [];
        const incomingFingerprint = JSON.stringify(incomingRows);

        if (incomingFingerprint !== rowsFingerprintRef.current) {
          rowsFingerprintRef.current = incomingFingerprint;
          setRows(incomingRows);
        }

        if (
          editingLeadId !== null &&
          !incomingRows.some((row: ClientLeadRow) => row.id === editingLeadId)
        ) {
          setEditingLeadId(null);
        }

        setGeneratedAt(new Date().toISOString());
        return true;
      } catch {
        setError("Error de red cargando clientes.");
        return false;
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [editingLeadId],
  );

  const startEditingLead = useCallback((row: ClientLeadRow) => {
    setEditingLeadId(row.id);
    setEditForm({
      fullName: row.full_name || "",
      phone: row.phone || "",
      zipCode: row.zip_code || "",
      ageRange: row.age_range || "",
      introAnswer: row.intro_answer || "",
    });
    setRowActionError("");
  }, []);

  const cancelEditingLead = useCallback(() => {
    setEditingLeadId(null);
    setEditForm({
      fullName: "",
      phone: "",
      zipCode: "",
      ageRange: "",
      introAnswer: "",
    });
    setRowActionError("");
  }, []);

  const updateEditField = useCallback(
    (field: keyof ClientLeadForm, value: string) => {
      setEditForm((prev) => ({
        ...prev,
        [field]: field === "phone" ? value.replace(/[^\d()\-\s+]/g, "") : value,
      }));
      setRowActionError("");
    },
    [],
  );

  const saveEditedLead = useCallback(async () => {
    if (editingLeadId === null) {
      return false;
    }

    const trimmedName = editForm.fullName.trim();
    const trimmedPhone = editForm.phone.replace(/\D/g, "");
    const trimmedZip = editForm.zipCode.replace(/\D/g, "");

    if (!trimmedName) {
      setRowActionError("Ingresa el nombre.");
      return false;
    }

    if (trimmedPhone.length !== 10) {
      setRowActionError("Ingresa un teléfono válido de 10 dígitos.");
      return false;
    }

    if (trimmedZip.length !== 5) {
      setRowActionError("Ingresa un código postal válido de 5 dígitos.");
      return false;
    }

    setIsSavingEdit(true);
    setRowActionError("");

    try {
      const params = new URLSearchParams({ user, password });
      const response = await fetch(
        `${META_CAPI_BASE}/client-leads/${editingLeadId}?${params.toString()}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: trimmedName,
            phone: trimmedPhone,
            zipCode: trimmedZip,
            ageRange: editForm.ageRange,
            introAnswer: editForm.introAnswer,
          }),
        },
      );

      const body = await response.json();
      if (!response.ok) {
        setRowActionError(
          body?.details || body?.error || "No se pudo actualizar el cliente.",
        );
        return false;
      }

      setEditingLeadId(null);
      setEditForm({
        fullName: "",
        phone: "",
        zipCode: "",
        ageRange: "",
        introAnswer: "",
      });
      await loadRows(user, password, { silent: true });
      return true;
    } catch {
      setRowActionError("Error de red actualizando el cliente.");
      return false;
    } finally {
      setIsSavingEdit(false);
    }
  }, [
    editForm.ageRange,
    editForm.fullName,
    editForm.introAnswer,
    editForm.phone,
    editForm.zipCode,
    editingLeadId,
    loadRows,
    password,
    user,
  ]);

  const deleteLead = useCallback(
    async (leadId: number) => {
      if (
        !window.confirm(
          "¿Eliminar este cliente? Esta acción no se puede deshacer.",
        )
      ) {
        return;
      }

      setRowActionLoadingId(leadId);
      setRowActionError("");

      try {
        const params = new URLSearchParams({ user, password });
        const response = await fetch(
          `${META_CAPI_BASE}/client-leads/${leadId}?${params.toString()}`,
          {
            method: "DELETE",
          },
        );

        const body = await response.json();
        if (!response.ok) {
          setRowActionError(
            body?.details || body?.error || "No se pudo eliminar el cliente.",
          );
          return;
        }

        if (editingLeadId === leadId) {
          cancelEditingLead();
        }

        setRows((prev) => prev.filter((row) => row.id !== leadId));
        rowsFingerprintRef.current = JSON.stringify(
          rows.filter((row) => row.id !== leadId),
        );
      } catch {
        setRowActionError("Error de red eliminando el cliente.");
      } finally {
        setRowActionLoadingId(null);
      }
    },
    [cancelEditingLead, editingLeadId, password, rows, user],
  );

  useEffect(() => {
    fetch("/attack-online-auth.json")
      .then((res) => (res.ok ? res.json() : defaultAuthConfig))
      .then((json) => {
        const nextConfig: AuthConfig = {
          user:
            typeof json?.user === "string" ? json.user : defaultAuthConfig.user,
          password:
            typeof json?.password === "string"
              ? json.password
              : defaultAuthConfig.password,
        };
        setConfig(nextConfig);

        const savedSession = localStorage.getItem(CLIENTS_SESSION_KEY);
        if (savedSession) {
          try {
            const session = JSON.parse(savedSession);
            if (
              typeof session?.user === "string" &&
              typeof session?.password === "string"
            ) {
              setUser(session.user);
              setPassword(session.password);
              setIsLoggedIn(true);
            }
          } catch {
            // Ignorar sesión corrupta.
          }
        }
      })
      .catch(() => {
        setConfig(defaultAuthConfig);
      });
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    void loadRows(user, password);
  }, [isLoggedIn, loadRows, password, user]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (user === config.user && password === config.password) {
        localStorage.setItem(
          CLIENTS_SESSION_KEY,
          JSON.stringify({ user, password }),
        );
        setIsLoggedIn(true);
        setError("");
        return;
      }

      setIsLoggedIn(false);
      setError("Credenciales incorrectas.");
    },
    [config.password, config.user, password, user],
  );

  const handleLogout = useCallback(() => {
    localStorage.removeItem(CLIENTS_SESSION_KEY);
    setIsLoggedIn(false);
    setUser("");
    setPassword("");
    setRows([]);
    setGeneratedAt("");
    setError("");
  }, []);

  const stats = useMemo(() => {
    const countries = new Set(rows.map((row) => row.country).filter(Boolean));
    const states = new Set(rows.map((row) => row.state_region).filter(Boolean));

    return {
      total: rows.length,
      countries: countries.size,
      states: states.size,
    };
  }, [rows]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(rows.length / PAGE_SIZE)),
    [rows.length],
  );

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [currentPage, rows]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const lastUpdate = useMemo(() => {
    if (!generatedAt) {
      return "-";
    }

    const dt = new Date(generatedAt);
    return Number.isNaN(dt.getTime()) ? generatedAt : dt.toLocaleString();
  }, [generatedAt]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Data-clients</h1>
            <p className="text-sm text-slate-400 mt-1">
              Panel de clientes que completaron el proceso correctamente.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-200">Usuario</label>
            <input
              value={user}
              onChange={(event) => setUser(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-200">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              autoComplete="off"
              required
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-md bg-sky-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-sky-500"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.assign("/attack-online");
              }}
              className="rounded-md bg-slate-800 px-4 py-2 font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            >
              Volver
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Data-clients</h1>
            <p className="text-sm text-slate-400">
              Leads guardados con país y estado geolocalizados.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void loadRows(user, password);
              }}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-sky-500"
            >
              {isLoading ? "Actualizando..." : "Actualizar"}
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.assign("/attack-online");
              }}
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold transition-colors hover:bg-slate-700"
            >
              Volver a Attack-online
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-rose-500"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Clientes
            </p>
            <p className="mt-1 text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Países
            </p>
            <p className="mt-1 text-2xl font-bold">{stats.countries}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Estados
            </p>
            <p className="mt-1 text-2xl font-bold">{stats.states}</p>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Última actualización: {lastUpdate}
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {rowActionError ? (
          <p className="text-sm text-amber-400">{rowActionError}</p>
        ) : null}

        {editingLeadId !== null ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">Editar cliente</h2>
                <p className="text-xs text-slate-400">
                  Ajusta los datos guardados desde el formulario principal.
                </p>
              </div>
              <button
                type="button"
                onClick={cancelEditingLead}
                className="rounded-md border border-slate-700 px-3 py-2 text-sm font-semibold transition-colors hover:bg-slate-800"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                  Nombre
                </label>
                <input
                  value={editForm.fullName}
                  onChange={(event) =>
                    updateEditField("fullName", event.target.value)
                  }
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                  Teléfono
                </label>
                <input
                  value={editForm.phone}
                  onChange={(event) =>
                    updateEditField("phone", event.target.value)
                  }
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                  ZIP
                </label>
                <input
                  value={editForm.zipCode}
                  onChange={(event) =>
                    updateEditField("zipCode", event.target.value)
                  }
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                  Rango de edad
                </label>
                <input
                  value={editForm.ageRange}
                  onChange={(event) =>
                    updateEditField("ageRange", event.target.value)
                  }
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                  Respuesta inicial
                </label>
                <input
                  value={editForm.introAnswer}
                  onChange={(event) =>
                    updateEditField("introAnswer", event.target.value)
                  }
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveEditedLead()}
                disabled={isSavingEdit}
                className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingEdit ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={cancelEditingLead}
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold transition-colors hover:bg-slate-700"
              >
                Descartar
              </button>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="p-3 text-left">Nombre</th>
                <th className="p-3 text-left">Teléfono</th>
                <th className="p-3 text-left">ZIP</th>
                <th className="p-3 text-left">Edad</th>
                <th className="p-3 text-left">País</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left">Dominio</th>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td className="p-4 text-slate-400" colSpan={9}>
                    Sin registros por ahora.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-900 hover:bg-slate-900/70"
                  >
                    <td className="p-3">{row.full_name}</td>
                    <td className="p-3 font-mono">{row.phone}</td>
                    <td className="p-3 font-mono">{row.zip_code}</td>
                    <td className="p-3">{row.age_range || "-"}</td>
                    <td className="p-3">{row.country || "-"}</td>
                    <td className="p-3">{row.state_region || "-"}</td>
                    <td className="p-3">{row.domain_attacked || "-"}</td>
                    <td className="p-3">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingLead(row)}
                          className="rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold transition-colors hover:bg-slate-800"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteLead(row.id)}
                          disabled={rowActionLoadingId === row.id}
                          className="rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {rowActionLoadingId === row.id
                            ? "Borrando..."
                            : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {rows.length > PAGE_SIZE ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
            <p>
              Mostrando {(currentPage - 1) * PAGE_SIZE + 1} -{" "}
              {Math.min(currentPage * PAGE_SIZE, rows.length)} de {rows.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded border border-slate-700 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span>
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="rounded border border-slate-700 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DataClientsView;
