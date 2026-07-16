"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Group {
  id: number;
  name: string;
  code: string;
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [memberNames, setMemberNames] = useState(["", ""]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.groups || []))
      .catch(() => {});
  }, []);

  const addMember = () => setMemberNames([...memberNames, ""]);
  const removeMember = (i: number) => {
    if (memberNames.length <= 2) return;
    setMemberNames(memberNames.filter((_, idx) => idx !== i));
  };

  const createGroup = async () => {
    if (!name.trim() || memberNames.filter((m) => m.trim()).length < 2) return;
    setLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          members: memberNames
            .filter((m) => m.trim())
            .map((m) => ({ name: m.trim() })),
        }),
      });
      const data = await res.json();
      if (data.group) {
        router.push(`/group/${data.group.id}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green" />
          <h1 className="font-mono text-sm font-bold tracking-widest uppercase">
            Ledger Watch
          </h1>
          <span className="pill pill-live">
            <span className="live-dot" />
            LIVE
          </span>
        </div>
        <span className="label-caps hidden sm:inline">
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl">
          {!showCreate ? (
            <div className="panel p-5 sm:p-8">
              <h2 className="label-caps mb-1">Operations Center</h2>
              <p className="font-mono text-2xl font-bold mb-6">
                Split the Bill, Track Every Debt
              </p>
              <p className="font-sans text-sm text-muted mb-8 leading-relaxed">
                Create a group, log shared expenses, and watch debts resolve in
                real time. Full ledger visibility — no hidden IOUs.
              </p>

              <button
                onClick={() => setShowCreate(true)}
                className="w-full bg-ink text-panel font-mono text-sm font-semibold tracking-wider uppercase py-3 px-6 rounded hover:opacity-90 transition-opacity mb-6"
              >
                + New Operations Group
              </button>

              {groups.length > 0 && (
                <div>
                  <h3 className="label-caps mb-3">Active Groups</h3>
                  <div className="space-y-2">
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => router.push(`/group/${g.id}`)}
                        className="w-full panel p-4 flex items-center justify-between hover:border-ink transition-colors text-left"
                      >
                        <div>
                          <div className="font-mono text-sm font-bold">
                            {g.name}
                          </div>
                          <div className="label-caps mt-1">
                            CODE: {g.code}
                          </div>
                        </div>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M6 4l4 4-4 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="panel p-5 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="label-caps">New Operations Group</h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="font-mono text-xs text-muted hover:text-ink"
                >
                  ✕ CANCEL
                </button>
              </div>

              <label className="label-caps block mb-2">Group Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Hackathon Crew"
                className="w-full panel border border-border px-3 py-2 font-mono text-sm mb-6 outline-none focus:border-ink"
              />

              <label className="label-caps block mb-2">
                Members ({memberNames.length})
              </label>
              <div className="space-y-2 mb-4">
                {memberNames.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={m}
                      onChange={(e) => {
                        const copy = [...memberNames];
                        copy[i] = e.target.value;
                        setMemberNames(copy);
                      }}
                      placeholder={`Member ${i + 1}`}
                      className="flex-1 panel border border-border px-3 py-2 font-mono text-sm outline-none focus:border-ink"
                    />
                    {memberNames.length > 2 && (
                      <button
                        onClick={() => removeMember(i)}
                        className="px-3 font-mono text-xs text-red hover:opacity-70"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addMember}
                className="font-mono text-xs text-blue hover:opacity-70 mb-6 block"
              >
                + ADD MEMBER
              </button>

              <button
                onClick={createGroup}
                disabled={loading}
                className="w-full bg-ink text-panel font-mono text-sm font-semibold tracking-wider uppercase py-3 px-6 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "CREATING..." : "CREATE & ENTER OPS CENTER"}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 sm:px-6 py-3 flex items-center justify-between">
        <span className="label-caps">
          Ledger Watch v1.0
        </span>
        <span className="label-caps hidden xs:inline">
          ALL SYSTEMS NOMINAL
        </span>
      </footer>
    </div>
  );
}
