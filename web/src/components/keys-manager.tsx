"use client";

import { Eye, EyeOff, Plus, Power, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { createKeyAction, deleteKeyAction, revealKeyAction, toggleKeyAction, type KeyResult } from "@/app/console/keys/actions";
import type { ApiToken } from "@/lib/newapi-types";
import { formatDate, formatDateTime, formatUsd, quotaToUsd } from "@/lib/format";
import { CopyButton } from "./copy-button";

const STATUS: Record<number, { label: string; cls: string }> = {
  1: { label: "Đang bật", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  2: { label: "Đã tắt", cls: "" },
  3: { label: "Hết hạn", cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  4: { label: "Hết hạn mức", cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
};

export function KeysManager({ tokens, modelIds }: { tokens: ApiToken[]; modelIds: string[] }) {
  const [creating, setCreating] = useState(tokens.length === 0);
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null);

  return (
    <>
      {!creating && (
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Tạo key
        </button>
      )}
      {creating && (
        <CreateForm
          modelIds={modelIds}
          onCancel={tokens.length > 0 ? () => setCreating(false) : undefined}
          onCreated={(k) => {
            setNewKey(k);
            setCreating(false);
          }}
        />
      )}
      {newKey && <NewKeyDialog apiKey={newKey.key} name={newKey.name} onClose={() => setNewKey(null)} />}

      <div className="card overflow-x-auto">
        <table className="table-x min-w-[860px]">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Key</th>
              <th>Trạng thái</th>
              <th className="text-right">Đã dùng</th>
              <th className="text-right">Hạn mức còn</th>
              <th>Hết hạn</th>
              <th>Dùng lần cuối</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tokens.map((t) => (
              <KeyRow key={t.id} token={t} />
            ))}
            {tokens.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-muted">
                  Bạn chưa có API key nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function KeyRow({ token: t }: { token: ApiToken }) {
  const [full, setFull] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const st = STATUS[t.status] || { label: `#${t.status}`, cls: "" };

  const act = (fn: () => Promise<KeyResult>, after?: (r: KeyResult) => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.error) setError(r.error);
      else after?.(r);
    });

  return (
    <tr className={pending ? "opacity-60" : ""}>
      <td>
        <div className="font-medium">{t.name || "—"}</div>
        {t.model_limits_enabled && t.model_limits && (
          <div className="mt-0.5 max-w-48 truncate text-xs text-muted" title={t.model_limits}>
            Mô hình: {t.model_limits.split(",").length}
          </div>
        )}
        {error && <div className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</div>}
      </td>
      <td>
        <div className="flex items-center gap-1 font-mono text-xs">
          <span className="max-w-56 truncate">{full || `sk-${t.key}`}</span>
          <button
            type="button"
            className="rounded-md p-1 text-muted hover:bg-bg-soft hover:text-fg"
            title={full ? "Ẩn" : "Hiện key"}
            onClick={() => (full ? setFull(null) : act(() => revealKeyAction(t.id), (r) => setFull(r.key || null)))}
          >
            {full ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
          {full && <CopyButton value={full} />}
        </div>
      </td>
      <td>
        <span className={`badge ${st.cls}`}>{st.label}</span>
      </td>
      <td className="text-right tabular-nums">{formatUsd(quotaToUsd(t.used_quota))}</td>
      <td className="text-right tabular-nums">{t.unlimited_quota ? <span className="text-muted">Không giới hạn</span> : formatUsd(quotaToUsd(t.remain_quota))}</td>
      <td className="text-muted">{t.expired_time === -1 ? "Không" : formatDate(t.expired_time)}</td>
      <td className="text-muted">{t.accessed_time && t.accessed_time !== t.created_time ? formatDateTime(t.accessed_time) : "Chưa dùng"}</td>
      <td>
        <div className="flex justify-end gap-1">
          {(t.status === 1 || t.status === 2) && (
            <button
              type="button"
              className="btn-ghost px-2 py-1 text-xs"
              disabled={pending}
              onClick={() => act(() => toggleKeyAction(t.id, t.status !== 1))}
              title={t.status === 1 ? "Tắt key" : "Bật key"}
            >
              <Power className="size-3.5" /> {t.status === 1 ? "Tắt" : "Bật"}
            </button>
          )}
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-xs hover:text-red-600"
            disabled={pending}
            onClick={() => {
              if (confirm(`Xóa key "${t.name}"? Ứng dụng đang dùng key này sẽ ngừng hoạt động.`)) act(() => deleteKeyAction(t.id));
            }}
            title="Xóa key"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function CreateForm({
  modelIds,
  onCancel,
  onCreated,
}: {
  modelIds: string[];
  onCancel?: () => void;
  onCreated: (k: { key: string; name: string }) => void;
}) {
  const [state, action, pending] = useActionState<KeyResult, FormData>(createKeyAction, {});
  const [picked, setPicked] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const shown = useMemo(() => modelIds.filter((m) => m.toLowerCase().includes(filter.toLowerCase())), [modelIds, filter]);

  useEffect(() => {
    if (state.ok && state.key) onCreated({ key: state.key, name: state.name || "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="card space-y-5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Tạo API key mới</h2>
        {onCancel && (
          <button type="button" className="btn-ghost px-2" onClick={onCancel} aria-label="Đóng">
            <X className="size-4" />
          </button>
        )}
      </div>
      {state.error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{state.error}</div>}
      {state.ok && !state.key && <div className="rounded-lg bg-bg-soft px-3 py-2 text-sm">Đã tạo key. Bấm biểu tượng con mắt trong bảng để xem key.</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="label" htmlFor="name">
            Tên key
          </label>
          <input id="name" name="name" className="input" placeholder="Ví dụ: Claude Code" maxLength={30} required />
        </div>
        <div>
          <label className="label" htmlFor="limit">
            Hạn mức chi tiêu (USD)
          </label>
          <input id="limit" name="limit" type="number" min="0.01" step="0.01" className="input" placeholder="Để trống = không giới hạn" />
        </div>
        <div>
          <label className="label" htmlFor="expiry">
            Hết hạn sau
          </label>
          <select id="expiry" name="expiry" className="input" defaultValue="never">
            <option value="never">Không hết hạn</option>
            <option value="7">7 ngày</option>
            <option value="30">30 ngày</option>
            <option value="90">90 ngày</option>
            <option value="365">1 năm</option>
          </select>
        </div>
      </div>

      <details className="rounded-lg border border-border">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
          Giới hạn mô hình và IP <span className="font-normal text-muted">(không bắt buộc)</span>
          {picked.length > 0 && <span className="ml-2 badge">{picked.length} mô hình</span>}
        </summary>
        <div className="grid gap-4 border-t border-border p-3 md:grid-cols-2">
          <div>
            <div className="label">Chỉ cho phép các mô hình</div>
            <input className="input mb-2" placeholder="Lọc mô hình…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {shown.map((m) => (
                <label key={m} className="flex items-center gap-2 font-mono text-xs">
                  <input
                    type="checkbox"
                    name="models"
                    value={m}
                    checked={picked.includes(m)}
                    onChange={(e) => setPicked(e.target.checked ? [...picked, m] : picked.filter((x) => x !== m))}
                    className="accent-[var(--accent)]"
                  />
                  {m}
                </label>
              ))}
              {shown.length === 0 && <div className="text-xs text-muted">Không có mô hình.</div>}
            </div>
            {/* Keep picked models that the filter currently hides. */}
            {picked
              .filter((m) => !shown.includes(m))
              .map((m) => (
                <input key={m} type="hidden" name="models" value={m} />
              ))}
            <p className="mt-1 text-xs text-muted">Không chọn = dùng được mọi mô hình.</p>
          </div>
          <div>
            <label className="label" htmlFor="ips">
              Chỉ cho phép IP
            </label>
            <textarea id="ips" name="ips" rows={6} className="input font-mono text-xs" placeholder={"203.0.113.10\n198.51.100.0/24"} />
            <p className="mt-1 text-xs text-muted">Mỗi dòng một IP hoặc dải CIDR. Để trống = mọi IP.</p>
          </div>
        </div>
      </details>

      <div className="flex gap-2">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang tạo…" : "Tạo key"}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Hủy
          </button>
        )}
      </div>
    </form>
  );
}

function NewKeyDialog({ apiKey, name, onClose }: { apiKey: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="card w-full max-w-lg p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">Đã tạo key &quot;{name}&quot;</h2>
        <p className="mt-1 text-sm text-muted">Sao chép và lưu key ở nơi an toàn. Không chia sẻ key cho người khác.</p>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-bg-soft p-3">
          <code className="flex-1 font-mono text-sm break-all">{apiKey}</code>
          <CopyButton value={apiKey} label="Sao chép" />
        </div>
        <div className="mt-6 flex justify-end">
          <button className="btn-primary" onClick={onClose}>
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
