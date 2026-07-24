import React, { useState, useEffect, useCallback, useRef } from "react";
import { Flame, Plus, Trash2, Check, X, Pencil } from "lucide-react";
import storage from "./storage.js";

const STORAGE_KEY = "streak-tasks-v1";

function pad(n) {
  return n.toString().padStart(2, "0");
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayStr() {
  return formatDate(new Date());
}

function getStreakInfo(completions) {
  const today = todayStr();
  const todayDone = !!completions[today];
  let streak = 0;
  const cursor = new Date();
  if (!todayDone) cursor.setDate(cursor.getDate() - 1);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const dstr = formatDate(cursor);
    if (completions[dstr]) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return { streak, todayDone };
}

function lastNDays(n) {
  const days = [];
  const cursor = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(cursor.getDate() - i);
    days.push(formatDate(d));
  }
  return days;
}

const gridPaper = {
  backgroundColor: "#0b1220",
  backgroundImage:
    "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
};

export default function StreakLedger() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskName, setNewTaskName] = useState("");
  const [savingError, setSavingError] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await storage.get(STORAGE_KEY);
        if (result && result.value) {
          setTasks(JSON.parse(result.value));
        }
      } catch (e) {
        // key not existing yet is normal on first run
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (nextTasks) => {
    setTasks(nextTasks);
    try {
      const res = await storage.set(STORAGE_KEY, JSON.stringify(nextTasks));
      if (!res) setSavingError(true);
      else setSavingError(false);
    } catch (e) {
      setSavingError(true);
    }
  }, []);

  const addTask = () => {
    const name = newTaskName.trim();
    if (!name) return;
    const next = [...tasks, { id: `${Date.now()}`, name, completions: {} }];
    persist(next);
    setNewTaskName("");
    inputRef.current?.focus();
  };

  const toggleDay = (id, dateStr) => {
    const next = tasks.map((task) => {
      if (task.id !== id) return task;
      const completions = { ...task.completions };
      if (completions[dateStr]) delete completions[dateStr];
      else completions[dateStr] = true;
      return { ...task, completions };
    });
    persist(next);
  };

  const toggleToday = (id) => toggleDay(id, todayStr());

  const deleteTask = (id) => {
    persist(tasks.filter((t) => t.id !== id));
  };

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditingName(task.name);
  };

  const saveEditing = () => {
    const name = editingName.trim();
    if (name) {
      persist(tasks.map((t) => (t.id === editingId ? { ...t, name } : t)));
    }
    setEditingId(null);
    setEditingName("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const setStreakDaysBack = (id, daysBack) => {
    const next = tasks.map((task) => {
      if (task.id !== id) return task;
      const completions = { ...task.completions };
      const cursor = new Date();
      for (let i = 0; i < daysBack; i += 1) {
        completions[formatDate(cursor)] = true;
        cursor.setDate(cursor.getDate() - 1);
      }
      return { ...task, completions };
    });
    persist(next);
  };

  if (loading) {
    return (
      <div style={gridPaper} className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500 font-mono text-sm tracking-widest">
          LOADING LEDGER…
        </p>
      </div>
    );
  }

  const days = lastNDays(14);

  return (
    <div style={gridPaper} className="min-h-screen pb-16">
      <div className="max-w-md mx-auto px-4 pt-8">
        <header className="mb-6 border-b border-slate-700 pb-4">
          <p className="text-slate-500 font-mono text-xs tracking-[0.3em] mb-1">
            DAILY LOG
          </p>
          <h1 className="text-slate-100 text-2xl font-bold tracking-tight">
            Streak Ledger
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </header>

        <div className="flex gap-2 mb-6">
          <input
            ref={inputRef}
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Add something to track…"
            className="flex-1 bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={addTask}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md px-3 flex items-center justify-center transition-colors"
            aria-label="Add task"
          >
            <Plus size={20} />
          </button>
        </div>

        {savingError && (
          <p className="text-rose-400 text-xs mb-4 font-mono">
            Couldn't save — check your browser storage settings and try again.
          </p>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-16 border border-dashed border-slate-700 rounded-lg">
            <p className="text-slate-500 text-sm">
              Nothing logged yet. Add the first thing you want to build a
              streak on.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {tasks.map((task) => {
            const { streak, todayDone } = getStreakInfo(task.completions);
            const atRisk = streak > 0 && !todayDone;
            const hasHistory = Object.keys(task.completions).length > 0;
            return (
              <div
                key={task.id}
                className="bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3"
              >
                {editingId === task.id ? (
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing();
                        if (e.key === "Escape") cancelEditing();
                      }}
                      className="flex-1 bg-slate-800 border border-amber-500 rounded-md px-2 py-1 text-slate-100 text-sm focus:outline-none"
                    />
                    <button onClick={saveEditing} className="text-amber-400 p-1" aria-label="Save name">
                      <Check size={16} />
                    </button>
                    <button onClick={cancelEditing} className="text-slate-500 p-1" aria-label="Cancel edit">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-100 font-medium text-sm truncate pr-2">
                      {task.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEditing(task)}
                        className="text-slate-600 hover:text-amber-400 p-1"
                        aria-label={`Edit ${task.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-slate-600 hover:text-rose-400 p-1"
                        aria-label={`Delete ${task.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1">
                    <Flame
                      size={18}
                      className={
                        streak > 0
                          ? atRisk
                            ? "text-amber-500/70"
                            : "text-amber-400"
                          : "text-slate-600"
                      }
                      fill={streak > 0 && !atRisk ? "currentColor" : "none"}
                    />
                    <span className="font-mono text-lg text-slate-100 tabular-nums">
                      {streak}
                    </span>
                  </div>
                  <span className="text-slate-500 text-xs">
                    {atRisk
                      ? "streak alive — not marked today yet"
                      : streak > 0
                      ? "marked today"
                      : "no streak yet"}
                  </span>
                </div>

                {!hasHistory && (
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <span className="text-slate-500">Already going? Days so far:</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      id={`backfill-${task.id}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const n = parseInt(e.currentTarget.value, 10);
                          if (!Number.isNaN(n) && n > 0) {
                            setStreakDaysBack(task.id, n);
                          }
                          e.currentTarget.value = "";
                        }
                      }}
                      className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      onClick={() => {
                        const el = document.getElementById(`backfill-${task.id}`);
                        const n = parseInt(el?.value, 10);
                        if (!Number.isNaN(n) && n > 0) {
                          setStreakDaysBack(task.id, n);
                        }
                        if (el) el.value = "";
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 rounded px-2 py-1 font-medium"
                    >
                      Set
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {days.map((d) => {
                      const done = !!task.completions[d];
                      const isToday = d === todayStr();
                      return (
                        <button
                          key={d}
                          title={`${d} — tap to toggle`}
                          onClick={() => toggleDay(task.id, d)}
                          className={
                            "w-3 h-4 rounded-sm border " +
                            (done
                              ? "bg-amber-400 border-amber-400"
                              : "bg-transparent border-slate-700") +
                            (isToday ? " ring-1 ring-slate-400" : "")
                          }
                        />
                      );
                    })}
                  </div>
                  <button
                    onClick={() => toggleToday(task.id)}
                    className={
                      "ml-3 shrink-0 rounded-md px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors " +
                      (todayDone
                        ? "bg-amber-500 text-slate-950"
                        : "bg-slate-800 text-slate-300 border border-slate-600 hover:border-amber-500")
                    }
                  >
                    {todayDone ? (
                      <>
                        <Check size={14} /> Done
                      </>
                    ) : (
                      "Mark today"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
              }
