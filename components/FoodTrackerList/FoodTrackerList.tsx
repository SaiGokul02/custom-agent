"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import styles from "./FoodTrackerList.module.css";

type FoodLog = {
  food: string;
  servingLabel: string;
  baseQuantity: number;
  mealTime: "breakfast" | "morningSnack" | "lunch" | "eveningSnack" | "dinner" ;
  calories: number;
  carbohydrates: number;
  protein: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

const MEAL_ORDER: FoodLog["mealTime"][] = ["breakfast", "morningSnack", "lunch", "eveningSnack", "dinner"];

const MEAL_LABEL: Record<FoodLog["mealTime"], string> = {
  breakfast: "Breakfast",
  morningSnack: "Morning Snack",
  lunch: "Lunch",
  eveningSnack: "Evening Snack",
  dinner: "Dinner"
};

export default function FoodTrackerList() {
  const { userId } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);

  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();

    const fetchFoodLogs = async () => {
      try {
        setIsLoading(true);
        setError("");
        const res = await fetch(`/api/food-tracker`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Request failed with ${res.status}`);

        const data = await res.json();
        setFoodLogs(data.foodLogs ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Something went wrong while fetching your food log.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchFoodLogs();
    return () => controller.abort();
  }, [userId]);

  const grouped = useMemo(() => {
    const map = new Map<FoodLog["mealTime"], FoodLog[]>();
    for (const log of foodLogs) {
      const list = map.get(log.mealTime) ?? [];
      list.push(log);
      map.set(log.mealTime, list);
    }
    return map;
  }, [foodLogs]);

  if (isLoading) {
    return (
      <div className={styles.wrap}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeleton} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.wrap}>
        <div className={styles.error}>
          <p className={styles.errorTitle}>Couldn&apos;t load your log</p>
          <p className={styles.errorBody}>{error}</p>
        </div>
      </div>
    );
  }

  if (foodLogs.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.empty}>
          <ForkIcon className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Nothing logged yet today</p>
          <p className={styles.emptyBody}>Search for a food above to add your first entry.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {MEAL_ORDER.filter((meal) => grouped.has(meal)).map((meal) => {
        const logs = grouped.get(meal)!;

        return (
          <section key={meal} className={styles.mealSection}>
            <div className={styles.mealHeader}>
              <h3 className={styles.mealTitle}>{MEAL_LABEL[meal]}</h3>
            </div>

            <div className={styles.cardList}>
              {logs.map((log, idx) => (
                <FoodLogCard key={`${log.food}-${log.createdAt}-${idx}`} log={log} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FoodLogCard({ log }: { log: FoodLog }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardMain}>
        <div className={styles.cardTitleRow}>
          <p className={styles.cardTitle}>{log.food}</p>
          {log.quantity !== 1 && <span className={styles.qtyBadge}>×{log.quantity}</span>}
        </div>
        <p className={styles.cardServing}>{log.servingLabel}</p>

        <div className={styles.cardMacros}>
          <span className={styles.macroItem}>
            <BeefIcon /> {log.protein}g
          </span>
          <span className={styles.macroItem}>
            <WheatIcon /> {log.carbohydrates}g
          </span>
          <span className={styles.macroItem}>
            <DropletIcon /> {log.fat}g
          </span>
        </div>
      </div>

      <div className={styles.cardSide}>
        <div className={styles.cardCalories}>
          <FlameIcon />
          <span>{log.calories}</span>
        </div>

        <div className={styles.cardActions}>
          <button type="button" aria-label={`Edit ${log.food}`} className={styles.iconBtn}>
            <PencilIcon />
          </button>
          <button
            type="button"
            aria-label={`Delete ${log.food}`}
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- inline icons (no icon library) ---- */

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.5-2-1-3 1 0 3 2 3 6a8 8 0 1 1-16 0c0-4 3-6 4-8 1-1 2-2 4-2z" />
    </svg>
  );
}

function BeefIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="10" cy="10" r="7" />
      <path d="M15 15l6 6" />
    </svg>
  );
}

function WheatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20M8 6l4-2 4 2M8 10l4-2 4 2M8 14l4-2 4 2M9 20l3-2 3 2" />
    </svg>
  );
}

function DropletIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

function ForkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <path d="M7 2v8a2 2 0 0 0 4 0V2" />
      <path d="M9 10v12" />
      <path d="M17 2c-1.5 0-3 1.5-3 4v4a2 2 0 0 0 2 2h1v8" />
    </svg>
  );
}

// import { useAuth } from "@/context/AuthContext"
// import { useEffect, useState } from "react";

// export default async function FoodTrackerList() {
//     const { userId } = useAuth();

//     const [isLoading, setIsLoading] = useState(false);
//     const [error, setError] = useState("");
//     const [foodLogs, setFoodLogs] = useState([]);

//     useEffect(() => {
//         if (!userId) return;
//         const foodTrackerList = async () => {
//             try {
//                 setIsLoading(true);
//                 setError("");
//                 const res = await fetch(`/api/food-tracker?userId=${userId}`);

//                 const data = await res.json();

//                 const { foodLogs } = data;

//                 setFoodLogs(foodLogs);
//             } catch (error) {
//                 setError(error)
//             } finally {
//                 setIsLoading(false);
//             }
//         }

//         foodTrackerList();
//     }, [userId]);

//     if (isLoading) return <div>
//         <p>Loading....</p>
//     </div>

//     if (error) return <div>
//         <p>Something went wrong while fetching!</p>
//     </div>

//     return (
//         <div>
//             {foodLogs.map((item) => (
//                 <div>
//                     <p>{item}</p>
//                 </div>
//             ))}
//         </div>
//     )
// }