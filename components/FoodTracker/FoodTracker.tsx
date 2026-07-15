"use client";
import { useEffect, useState } from "react";
import MealTimeSelector from "../MealTimeSelector/MealTimeSelector";
import styles from "./FoodTracker.module.css";
import { useAuth } from "@/context/AuthContext";

interface Summary {
    consumedCalories: number;
    carbohydrates: number;
    protein: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    calorieTarget: number;
    remainingCalories: number;
}

export default function FoodTracker() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [showMealSelector, setShowMealSelector] = useState(false);
    const [summary, setSummary] = useState<Summary | {}>({});
    // const [foodLogs, setFoodLogs] = useState([]);

    const { userId } = useAuth();

    // useEffect(() => {
    //     if (!userId) return;

    //     const fetchFoodLogs = async () => {
    //         try {
    //             setIsLoading(true);
    //             const today = new Date().toISOString().split("T")[0];

    //             const res = await fetch(
    //                 `/api/food-tracker?userId=${userId}&from=${today}&to=${today}`
    //             );

    //             if (!res.ok) {
    //                 const errorData = await res.json();
    //                 throw new Error(errorData.error || "Something went wrong");
    //             }

    //             const data = await res.json();

    //             console.log("food logs ", data);

    //             const { foodLogs } = data;

    //             setFoodLogs(foodLogs);

    //         } catch (error) {
    //             setError(error.message || error || 'Something went wrong!')
    //         }
    //     }

    //     fetchFoodLogs();
    // }, [userId]);

    useEffect(() => {
        if (!userId) return;

        const fetchFoodLogs = async () => {
            try {
                setIsLoading(true);
                const today = new Date().toISOString().split("T")[0];

                const res = await fetch(
                    `/api/food-tracker/summary?userId=${userId}`
                );

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Something went wrong");
                }

                const data = await res.json();

                console.log("food logs ", data);

                const { summary } = data;

                setSummary(summary);

            } catch (error: any) {
                setError(error.message || error || 'Something went wrong!')
            }
        }

        fetchFoodLogs();
    }, [userId]);


    const openShowMealSelector = () => {
        setShowMealSelector(true);
    }

    const closeShowMealSelector = () => {
        setShowMealSelector(false);
    }

    const hasSummary = (s: Summary | {}): s is Summary => {
        return "calorieTarget" in s;
    }

    return (
        <div>
            {hasSummary(summary) ? <div className={styles.foodTrackerSec}>
                <div className={styles.header}>
                    <p>Today</p>
                    <button className={styles.openMealSelectorBtn} onClick={openShowMealSelector}>+</button>
                </div>
                <div className={styles.caloriesInfo}>
                    <div className={styles.calorieInfoItem}>
                        <p>Target</p>
                        <p>{summary.calorieTarget}</p>
                    </div>
                    <div className={styles.calorieInfoItem}>
                        <p>Consumed</p>
                        <p>{summary.consumedCalories}</p>
                    </div>
                    <div className={styles.calorieInfoItem}>
                        <p>Remaining</p>
                        <p>{summary.remainingCalories}</p>
                    </div>
                </div>
                <div className={styles.nutrition}>
                    <p className={styles.title}>Nutrition</p>
                    <div className={styles.nutritionInfo}>
                        <div className={styles.nutritionInfoItems}>
                            <p>{summary.protein}g</p>
                            <p>Protein</p>
                        </div>
                        <div className={styles.nutritionInfoItems}>
                            <p>{summary.carbohydrates}g</p>
                            <p>Carbs</p>
                        </div>
                        <div className={styles.nutritionInfoItems}>
                            <p>{summary.fat}g</p>
                            <p>Fat</p>
                        </div>
                        <div className={styles.nutritionInfoItems}>
                            <p>{summary.fiber}g</p>
                            <p>Fiber</p>
                        </div>
                        <div className={styles.nutritionInfoItems}>
                            <p>{summary.sugar}g</p>
                            <p>Sugar</p>
                        </div>
                        <div className={styles.nutritionInfoItems}>
                            <p>{summary.sodium}mg</p>
                            <p>Sodium</p>
                        </div>
                    </div>
                </div>
            </div>
            : <p>Please login to view food tracker</p>}

            {showMealSelector && <MealTimeSelector closeShowMealSelector={closeShowMealSelector} />}
        </div>
    )
}