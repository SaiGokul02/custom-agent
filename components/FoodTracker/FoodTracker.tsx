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
    const [isLoading, setIsLoading] = useState(true); // start true — expect a fetch on mount
    const [error, setError] = useState("");
    const [showMealSelector, setShowMealSelector] = useState(false);
    const [summary, setSummary] = useState<Summary | null>(null);

    const { userId, isLoading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading || !userId) return;

        const fetchFoodLogs = async () => {
            setIsLoading(true);
            setError("");

            try {
                const res = await fetch(`/api/food-tracker/summary`);

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Something went wrong");
                }

                const data = await res.json();
                setSummary(data.summary);
            } catch (err: any) {
                setError(err.message || "Something went wrong!");
            } finally {
                setIsLoading(false);
            }
        };

        fetchFoodLogs();
    }, [userId, authLoading]);

    const openShowMealSelector = () => setShowMealSelector(true);
    const closeShowMealSelector = () => setShowMealSelector(false);

    return (
        <div>
            {(authLoading || isLoading) && (
                <div className={styles.foodTrackerSec}>
                    <p>Loading your food tracker...</p>
                </div>
            )}

            {!authLoading && !isLoading && error && (
                <div className={styles.foodTrackerSec}>
                    <p>{error}</p>
                </div>
            )}

            {!authLoading && !isLoading && !error && summary && (
                <div className={styles.foodTrackerSec}>
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
            )}

            {showMealSelector && <MealTimeSelector closeShowMealSelector={closeShowMealSelector} />}
        </div>
    );
}