import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { META_CAPI_BASE } from "../lib/metaCapi";

type AuthConfig = {
  user: string;
  password: string;
};

type AttackRow = {
  domain_attacked: string;
  device_ip: string;
  country: string | null;
  state_region: string | null;
  diverted_count: number;
  total_attempts: number;
  last_attempt_at: string;
  last_reason_code: string | null;
};

type AllowedIpRow = {
  id: number;
  ip_address: string;
  label: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

const defaultAuthConfig: AuthConfig = {
  user: "admin01",
  password: "leo01",
};

const ATTACK_DOMAIN_FILTER_KEY = "attack_online_domain_filter";
const ALL_DOMAINS_FILTER = "__all__";

export const AttackOnlineView = () => {
  const PAGE_SIZE = 20;
  const reasonLegend = [
    {
      code: "FIRST_ATTEMPT",
      meaning:
        "Primer intento detectado para esa IP/dispositivo en los ultimos 7 dias.",
    },
    {
      code: "REPEAT_IP",
      meaning: "Ya existia un intento previo para la misma IP.",
    },
    {
      code: "REPEAT_IP_OR_DEVICE",
      meaning:
        "Se detecto repeticion por la misma IP o por el fingerprint del navegador/dispositivo.",
    },
    {
      code: "REPEAT_FALLBACK_REAL",
      meaning:
        "Era un intento repetido, pero no habia numero de desvio disponible y se uso el numero real.",
    },
    {
      code: "BLOCKED_ON_ENTRY",
      meaning:
        "El dispositivo llego bloqueado al ingresar a la vista final y se registro sin click.",
    },
  ];
  const [config, setConfig] = useState<AuthConfig>(defaultAuthConfig);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [rows, setRows] = useState<AttackRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [notice, setNotice] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDomainFilter, setActiveDomainFilter] =
    useState<string>(ALL_DOMAINS_FILTER);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "updated" | "no-changes"
  >("idle");
  const rowsFingerprintRef = useRef("");
  const [isAllowedIpsOpen, setIsAllowedIpsOpen] = useState(false);
  const [allowedIps, setAllowedIps] = useState<AllowedIpRow[]>([]);
  const [allowedIpsLoading, setAllowedIpsLoading] = useState(false);
  const [allowedIpsError, setAllowedIpsError] = useState("");
  const [allowedIpId, setAllowedIpId] = useState<number | null>(null);
  const [isAdminActionLoading, setIsAdminActionLoading] = useState(false);
  const [isResetBlockedModalOpen, setIsResetBlockedModalOpen] = useState(false);
  const [allowedIpForm, setAllowedIpForm] = useState({
    ipAddress: "",
    label: "",
    note: "",
  });

  const domainFilters = useMemo(() => {
    const set = new Set(
      rows
        .map((row) => row.domain_attacked)
        .filter((domain) => typeof domain === "string" && domain.trim()),
    );

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (activeDomainFilter === ALL_DOMAINS_FILTER) {
      return rows;
    }

    return rows.filter((row) => row.domain_attacked === activeDomainFilter);
  }, [activeDomainFilter, rows]);

  const filteredStats = useMemo(() => {
    const totalEvents = filteredRows.reduce(
      (acc, row) => acc + Number(row.total_attempts || 0),
      0,
    );
    const totalDiverted = filteredRows.reduce(
      (acc, row) => acc + Number(row.diverted_count || 0),
      0,
    );
    const uniqueIps = new Set(filteredRows.map((row) => row.device_ip)).size;

    return {
      total_events_week: totalEvents,
      total_diverted_week: totalDiverted,
      unique_ips_week: uniqueIps,
      grouped_rows_week: filteredRows.length,
    };
  }, [filteredRows]);

  const blockedRows = useMemo(
    () => filteredRows.filter((row) => Number(row.diverted_count || 0) > 0),
    [filteredRows],
  );

  const escapeCsv = useCallback((value: unknown) => {
    const str = String(value ?? "");
    if (str.includes('"') || str.includes(";") || /\r|\n/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }, []);

  useEffect(() => {
    // Cargar config de credenciales
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

        // Verificar si hay sesión guardada en localStorage
        const savedSession = localStorage.getItem("attack_online_session");
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
              setPollingEnabled(true);
            }
          } catch {
            // Si hay error al parsear, ignorar
          }
        }
      })
      .catch(() => {
        setConfig(defaultAuthConfig);
      });
  }, []);

  const fetchLogs = useCallback(
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
        const response = await fetch(`${META_CAPI_BASE}/attack-online/logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: authUser,
            password: authPassword,
            limit: 300,
          }),
        });

        const body = await response.json();
        if (!response.ok) {
          const message =
            body?.details || body?.error || "No se pudo cargar los logs.";

          setError(
            response.status === 404
              ? "El backend local no tiene la ruta /meta-capi/attack-online/logs activa."
              : message,
          );
          return false;
        }

        const incomingRows = Array.isArray(body?.rows) ? body.rows : [];
        const incomingFingerprint = JSON.stringify(incomingRows);

        if (incomingFingerprint !== rowsFingerprintRef.current) {
          rowsFingerprintRef.current = incomingFingerprint;
          setRows(incomingRows);
          setSyncStatus("updated");
        } else {
          setSyncStatus("no-changes");
        }

        setGeneratedAt(
          typeof body?.generated_at === "string" ? body.generated_at : "",
        );
        return true;
      } catch {
        setError("Error de red cargando logs de ataque.");
        return false;
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  const fetchAllowedIps = useCallback(async () => {
    setAllowedIpsLoading(true);
    setAllowedIpsError("");

    try {
      const params = new URLSearchParams({ user, password });
      const response = await fetch(
        `${META_CAPI_BASE}/allowed-ips?${params.toString()}`,
      );
      const body = await response.json();

      if (!response.ok) {
        setAllowedIpsError(
          body?.details ||
            body?.error ||
            "No se pudieron cargar las IPs permitidas.",
        );
        return false;
      }

      setAllowedIps(Array.isArray(body?.rows) ? body.rows : []);
      return true;
    } catch {
      setAllowedIpsError("Error de red cargando IPs permitidas.");
      return false;
    } finally {
      setAllowedIpsLoading(false);
    }
  }, [password, user]);

  const openAllowedIpsModal = useCallback(async () => {
    setIsAllowedIpsOpen(true);
    await fetchAllowedIps();
  }, [fetchAllowedIps]);

  const closeAllowedIpsModal = useCallback(() => {
    setIsAllowedIpsOpen(false);
    setAllowedIpsError("");
    setAllowedIpId(null);
    setAllowedIpForm({ ipAddress: "", label: "", note: "" });
  }, []);

  const submitAllowedIp = useCallback(async () => {
    setAllowedIpsLoading(true);
    setAllowedIpsError("");

    try {
      const payload = {
        user,
        password,
        ipAddress: allowedIpForm.ipAddress.trim(),
        label: allowedIpForm.label.trim(),
        note: allowedIpForm.note.trim(),
      };

      const response = await fetch(
        allowedIpId == null
          ? `${META_CAPI_BASE}/allowed-ips`
          : `${META_CAPI_BASE}/allowed-ips/${allowedIpId}`,
        {
          method: allowedIpId == null ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = await response.json();
      if (!response.ok) {
        setAllowedIpsError(
          body?.details || body?.error || "No se pudo guardar la IP permitida.",
        );
        return false;
      }

      setAllowedIpId(null);
      setAllowedIpForm({ ipAddress: "", label: "", note: "" });
      await fetchAllowedIps();
      return true;
    } catch {
      setAllowedIpsError("Error de red guardando IP permitida.");
      return false;
    } finally {
      setAllowedIpsLoading(false);
    }
  }, [allowedIpForm, allowedIpId, fetchAllowedIps, password, user]);

  const deleteAllowedIp = useCallback(
    async (id: number) => {
      const response = await fetch(`${META_CAPI_BASE}/allowed-ips/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password }),
      });

      const body = await response.json();
      if (!response.ok) {
        setAllowedIpsError(
          body?.details || body?.error || "No se pudo borrar la IP permitida.",
        );
        return false;
      }

      await fetchAllowedIps();
      return true;
    },
    [fetchAllowedIps, password, user],
  );

  const handleDownloadBlockedIps = useCallback(async () => {
    const rowsToExport = blockedRows;

    const headers = [
      "Dominio",
      "IP",
      "Pais",
      "Estado",
      "Intentos",
      "Desvios",
      "Ultimo motivo",
      "Ultimo intento",
    ];

    const csvLines = [
      headers.join(";"),
      ...rowsToExport.map((row) =>
        [
          row.domain_attacked,
          row.device_ip,
          row.country || "",
          row.state_region || "",
          row.total_attempts,
          row.diverted_count,
          row.last_reason_code || "",
          row.last_attempt_at
            ? new Date(row.last_attempt_at).toLocaleString()
            : "",
        ]
          .map((cell) => escapeCsv(cell))
          .join(";"),
      ),
    ];

    const csvContent = `\uFEFF${csvLines.join("\n")}`;
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.href = url;
    link.download = `ips-bloqueadas-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setNotice(
      "Archivo descargado. Puedes decidir si deseas vaciar las IPs restringidas.",
    );
    setIsResetBlockedModalOpen(true);
  }, [blockedRows, escapeCsv]);

  const confirmResetBlockedIps = useCallback(async () => {
    setError("");
    setNotice("");

    setIsAdminActionLoading(true);

    try {
      const resetEndpoints = [
        `${META_CAPI_BASE}/attack-online/reset-blocked`,
        `${META_CAPI_BASE}/attack-online/reset`,
      ];

      let resetBody: Record<string, unknown> | null = null;
      let resetWorked = false;

      for (const endpoint of resetEndpoints) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user,
            password,
            scope: "all",
          }),
        });

        const rawBody = await response.text();
        let parsedBody: Record<string, unknown> | null = null;
        if (rawBody) {
          try {
            parsedBody = JSON.parse(rawBody) as Record<string, unknown>;
          } catch {
            parsedBody = { details: rawBody };
          }
        }

        if (response.ok) {
          resetBody = parsedBody;
          resetWorked = true;
          break;
        }

        if (response.status === 404) {
          continue;
        }

        setError(
          (parsedBody as { details?: string; error?: string } | null)
            ?.details ||
            (parsedBody as { details?: string; error?: string } | null)
              ?.error ||
            `No se pudieron vaciar las IPs restringidas (HTTP ${response.status}).`,
        );
        return;
      }

      if (!resetWorked) {
        setError(
          "El backend en producción no tiene habilitado el endpoint de limpieza. Despliega la versión más reciente del servidor con /meta-capi/attack-online/reset-blocked.",
        );
        return;
      }

      const ok = await fetchLogs(user, password);
      if (!ok) {
        return;
      }

      setIsResetBlockedModalOpen(false);
      setNotice(
        `Registros reiniciados correctamente. Filas eliminadas: ${Number((resetBody as { deletedRows?: number } | null)?.deletedRows || 0)}.`,
      );
    } catch {
      setError("No se pudo completar la limpieza por un problema de red.");
    } finally {
      setIsAdminActionLoading(false);
    }
  }, [fetchLogs, password, user]);

  useEffect(() => {
    const savedFilter = localStorage.getItem(ATTACK_DOMAIN_FILTER_KEY);
    if (!savedFilter) {
      return;
    }

    setActiveDomainFilter(savedFilter);
  }, []);

  useEffect(() => {
    localStorage.setItem(ATTACK_DOMAIN_FILTER_KEY, activeDomainFilter);
  }, [activeDomainFilter]);

  useEffect(() => {
    if (activeDomainFilter === ALL_DOMAINS_FILTER) {
      return;
    }

    const exists = domainFilters.includes(activeDomainFilter);
    if (!exists) {
      setActiveDomainFilter(ALL_DOMAINS_FILTER);
    }
  }, [activeDomainFilter, domainFilters]);

  useEffect(() => {
    if (!isLoggedIn || !pollingEnabled) {
      return;
    }

    let timer: number | undefined;
    let cancelled = false;

    void (async () => {
      const ok = await fetchLogs(user, password);
      if (!ok || cancelled) {
        setPollingEnabled(false);
        return;
      }

      timer = window.setInterval(async () => {
        const pollOk = await fetchLogs(user, password, { silent: true });
        if (!pollOk) {
          setPollingEnabled(false);
          if (timer) {
            window.clearInterval(timer);
          }
        }
      }, 15000);
    })();

    return () => {
      cancelled = true;
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, [isLoggedIn, pollingEnabled, user, password, fetchLogs]);

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (user === config.user && password === config.password) {
        // Guardar sesión en localStorage
        localStorage.setItem(
          "attack_online_session",
          JSON.stringify({ user, password }),
        );
        setIsLoggedIn(true);
        setPollingEnabled(true);
        setError("");
        return;
      }

      setIsLoggedIn(false);
      setError("Credenciales incorrectas.");
    },
    [config, user, password],
  );

  const lastUpdate = useMemo(() => {
    if (!generatedAt) {
      return "-";
    }

    const dt = new Date(generatedAt);
    if (Number.isNaN(dt.getTime())) {
      return generatedAt;
    }

    return dt.toLocaleString();
  }, [generatedAt]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE)),
    [filteredRows.length],
  );

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredRows]);

  const attemptsShownInTable = useMemo(
    () =>
      filteredRows.reduce(
        (acc, row) => acc + Number(row.total_attempts || 0),
        0,
      ),
    [filteredRows],
  );

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("attack_online_session");
    setIsLoggedIn(false);
    setUser("");
    setPassword("");
    setRows([]);
    setGeneratedAt("");
    setError("");
    setNotice("");
    setPollingEnabled(true);
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center px-4">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 space-y-4"
        >
          <h1 className="text-2xl font-bold tracking-tight">Attack-online</h1>
          <p className="text-sm text-slate-300">
            Acceso restringido al panel de monitoreo de intentos repetidos.
          </p>

          <div>
            <label className="text-sm text-slate-200 block mb-1">Usuario</label>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="text-sm text-slate-200 block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
              autoComplete="off"
              required
            />
          </div>

          {error ? <p className="text-red-400 text-sm">{error}</p> : null}

          <button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-500 transition-colors rounded-md py-2 font-semibold"
          >
            Entrar al panel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold">
            Attack-online console
          </h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                const ok = await fetchLogs(user, password);
                if (ok) {
                  setPollingEnabled(true);
                }
              }}
              className="bg-cyan-600 hover:bg-cyan-500 transition-colors rounded-md px-4 py-2 text-sm font-semibold"
            >
              {isLoading
                ? "Actualizando..."
                : pollingEnabled
                  ? "Actualizar"
                  : "Reintentar"}
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.assign("/clients-data");
              }}
              className="bg-sky-600 hover:bg-sky-500 transition-colors rounded-md px-4 py-2 text-sm font-semibold"
            >
              Ver clientes
            </button>
            <button
              type="button"
              onClick={handleDownloadBlockedIps}
              disabled={isAdminActionLoading}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-60 transition-colors rounded-md px-4 py-2 text-sm font-semibold"
            >
              {isAdminActionLoading
                ? "Procesando..."
                : "Descargar bloqueadas (Excel)"}
            </button>
            <button
              type="button"
              onClick={openAllowedIpsModal}
              className="bg-emerald-600 hover:bg-emerald-500 transition-colors rounded-md px-4 py-2 text-sm font-semibold"
            >
              IPs permitidas
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-500 transition-colors rounded-md px-4 py-2 text-sm font-semibold"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <p className="text-xs uppercase text-slate-400">Eventos semana</p>
            <p className="text-2xl font-bold">
              {filteredStats.total_events_week ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Conteo bruto de intentos en 7 dias (tabla call_attempts).
            </p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <p className="text-xs uppercase text-slate-400">Desviadas semana</p>
            <p className="text-2xl font-bold">
              {filteredStats.total_diverted_week ?? 0}
            </p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <p className="text-xs uppercase text-slate-400">IPs unicas</p>
            <p className="text-2xl font-bold">
              {filteredStats.unique_ips_week ?? 0}
            </p>
          </div>
        </div>

        <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase text-slate-400 tracking-wide">
              Filtro por dominio
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveDomainFilter(ALL_DOMAINS_FILTER);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeDomainFilter === ALL_DOMAINS_FILTER
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-200"
              }`}
            >
              Todos ({rows.length})
            </button>
            {domainFilters.map((domain) => {
              const domainCount = rows.filter(
                (row) => row.domain_attacked === domain,
              ).length;

              return (
                <button
                  key={domain}
                  type="button"
                  onClick={() => {
                    setActiveDomainFilter(domain);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    activeDomainFilter === domain
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-700 hover:bg-slate-600 text-slate-200"
                  }`}
                >
                  {domain} ({domainCount})
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-slate-300">
          Agrupaciones dominio+IP (semana):{" "}
          {filteredStats.grouped_rows_week ?? filteredRows.length} | Intentos
          sumados en tabla: {attemptsShownInTable}
        </div>

        <div className="text-xs text-slate-300">
          IPs bloqueadas detectadas (desvio {">"} 0): {blockedRows.length}
        </div>

        <div className="text-xs text-slate-400">
          Ultima actualizacion: {lastUpdate}
        </div>

        <div className="text-xs text-slate-400">
          Estado de sincronizacion:{" "}
          {syncStatus === "updated"
            ? "datos actualizados"
            : syncStatus === "no-changes"
              ? "sin cambios"
              : "en espera"}
        </div>

        <div className="text-xs text-slate-400">
          Ubicacion aproximada por IP/GPS. Puede variar por enrute del operador
          o por VPN.
        </div>

        {notice ? <p className="text-emerald-400 text-sm">{notice}</p> : null}

        {error ? <p className="text-red-400 text-sm">{error}</p> : null}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-4 items-start">
          <div className="overflow-x-auto border border-slate-700 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="text-left p-3">Dominio</th>
                  <th className="text-left p-3">IP</th>
                  <th className="text-left p-3">Pais</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-left p-3">Intentos</th>
                  <th className="text-left p-3">Desvios</th>
                  <th className="text-left p-3">Ultimo motivo</th>
                  <th className="text-left p-3">Ultimo intento</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td className="p-4 text-slate-400" colSpan={8}>
                      Sin resultados por ahora.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => (
                    <tr
                      key={`${row.device_ip}-${row.domain_attacked}-${currentPage}-${idx}`}
                      className="border-t border-slate-800 hover:bg-slate-800/70"
                    >
                      <td className="p-3">{row.domain_attacked}</td>
                      <td className="p-3 font-mono">{row.device_ip}</td>
                      <td className="p-3">{row.country || "-"}</td>
                      <td className="p-3">{row.state_region || "-"}</td>
                      <td className="p-3">{row.total_attempts}</td>
                      <td className="p-3">{row.diverted_count}</td>
                      <td className="p-3">{row.last_reason_code || "-"}</td>
                      <td className="p-3">
                        {row.last_attempt_at
                          ? new Date(row.last_attempt_at).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <aside className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-sm text-slate-200">
            <h2 className="text-base font-semibold mb-3">Leyenda de motivo</h2>
            <div className="space-y-3">
              {reasonLegend.map((item) => (
                <div
                  key={item.code}
                  className="border-b border-slate-700 pb-2 last:border-b-0 last:pb-0"
                >
                  <p className="font-mono text-cyan-300 text-xs mb-1">
                    {item.code}
                  </p>
                  <p className="text-slate-300 leading-snug">{item.meaning}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 text-xs text-slate-400 leading-relaxed">
              <p className="font-semibold text-slate-300 mb-1">
                Sobre el fingerprint
              </p>
              <p>
                Es un identificador aproximado del navegador/dispositivo
                generado por la combinacion de rasgos visibles del cliente. No
                es el modelo exacto del telefono, pero ayuda a reconocer el
                mismo equipo aunque cambie la IP.
              </p>
            </div>
          </aside>
        </div>

        {filteredRows.length > PAGE_SIZE ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
            <p>
              Mostrando {(currentPage - 1) * PAGE_SIZE + 1} -{" "}
              {Math.min(currentPage * PAGE_SIZE, filteredRows.length)} de{" "}
              {filteredRows.length} filas
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span>
                Pagina {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}

        {isAllowedIpsOpen ? (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center px-4 py-6">
            <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-700">
                <div>
                  <h2 className="text-xl font-bold">IPs permitidas</h2>
                  <p className="text-xs text-slate-400">
                    Estas IPs nunca se bloquearán ni se registrarán como
                    atacantes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAllowedIpsModal}
                  className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sm"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-4 p-4">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-slate-100">
                    {allowedIpId == null ? "Agregar IP" : "Editar IP"}
                  </h3>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">
                      IP
                    </label>
                    <input
                      value={allowedIpForm.ipAddress}
                      onChange={(e) =>
                        setAllowedIpForm((prev) => ({
                          ...prev,
                          ipAddress: e.target.value,
                        }))
                      }
                      className="w-full rounded-md bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
                      placeholder="172.16.0.10"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">
                      Etiqueta
                    </label>
                    <input
                      value={allowedIpForm.label}
                      onChange={(e) =>
                        setAllowedIpForm((prev) => ({
                          ...prev,
                          label: e.target.value,
                        }))
                      }
                      className="w-full rounded-md bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
                      placeholder="Equipo de Anthony"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">
                      Nota
                    </label>
                    <textarea
                      value={allowedIpForm.note}
                      onChange={(e) =>
                        setAllowedIpForm((prev) => ({
                          ...prev,
                          note: e.target.value,
                        }))
                      }
                      className="w-full rounded-md bg-slate-900 border border-slate-600 px-3 py-2 text-sm min-h-24"
                      placeholder="Por ejemplo: oficina, VPN corporativa, etc."
                    />
                  </div>

                  {allowedIpsError ? (
                    <p className="text-red-400 text-sm">{allowedIpsError}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={submitAllowedIp}
                      disabled={allowedIpsLoading}
                      className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 transition-colors rounded-md px-4 py-2 text-sm font-semibold"
                    >
                      {allowedIpsLoading
                        ? "Guardando..."
                        : allowedIpId == null
                          ? "Guardar IP"
                          : "Actualizar IP"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAllowedIpId(null);
                        setAllowedIpForm({
                          ipAddress: "",
                          label: "",
                          note: "",
                        });
                      }}
                      className="bg-slate-700 hover:bg-slate-600 transition-colors rounded-md px-4 py-2 text-sm font-semibold"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-slate-100">Listado</h3>
                    <button
                      type="button"
                      onClick={fetchAllowedIps}
                      disabled={allowedIpsLoading}
                      className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-60"
                    >
                      Refrescar
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-700 rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-900 text-slate-300">
                        <tr>
                          <th className="text-left p-3">IP</th>
                          <th className="text-left p-3">Etiqueta</th>
                          <th className="text-left p-3">Nota</th>
                          <th className="text-left p-3">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allowedIpsLoading && allowedIps.length === 0 ? (
                          <tr>
                            <td className="p-4 text-slate-400" colSpan={4}>
                              Cargando...
                            </td>
                          </tr>
                        ) : allowedIps.length === 0 ? (
                          <tr>
                            <td className="p-4 text-slate-400" colSpan={4}>
                              No hay IPs permitidas registradas.
                            </td>
                          </tr>
                        ) : (
                          allowedIps.map((row) => (
                            <tr
                              key={row.id}
                              className="border-t border-slate-700"
                            >
                              <td className="p-3 font-mono">
                                {row.ip_address}
                              </td>
                              <td className="p-3">{row.label || "-"}</td>
                              <td className="p-3">{row.note || "-"}</td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAllowedIpId(row.id);
                                      setAllowedIpForm({
                                        ipAddress: row.ip_address,
                                        label: row.label || "",
                                        note: row.note || "",
                                      });
                                    }}
                                    className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-xs font-semibold"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const confirmed = window.confirm(
                                        `Borrar IP permitida ${row.ip_address}?`,
                                      );
                                      if (!confirmed) {
                                        return;
                                      }

                                      await deleteAllowedIp(row.id);
                                    }}
                                    className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-xs font-semibold"
                                  >
                                    Borrar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isResetBlockedModalOpen ? (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-100">
                Vaciar IPs restringidas
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Ya descargaste la data. ¿Deseas vaciar los registros de IPs
                restringidas para reiniciar desde cero?
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetBlockedModalOpen(false)}
                  disabled={isAdminActionLoading}
                  className="px-4 py-2 text-sm font-semibold rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmResetBlockedIps}
                  disabled={isAdminActionLoading}
                  className="px-4 py-2 text-sm font-semibold rounded-md bg-rose-600 hover:bg-rose-500 disabled:opacity-60"
                >
                  {isAdminActionLoading ? "Vaciando..." : "Sí, vaciar"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AttackOnlineView;
