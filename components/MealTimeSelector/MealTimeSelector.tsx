import Link from "next/link";
import styles from "./MealTimeSelector.module.css";

export default function MealTimeSelector({closeShowMealSelector}) {
    return (
        <div className={styles.mealTimeSelectorSec}>
            <div className={styles.option}>
            <p>Add to which meal?</p>
            <div className={styles.mealTimes}>
                <Link href={`/nutrition/add-food?meal-time=${"breakfast"}`} className={styles.mealTime}>
                    Breakfast
                </Link>
                <Link href={`/nutrition/add-food?meal-time=${"morningSnack"}`} className={styles.mealTime}>
                    Morning snack
                </Link>
                <Link href={`/nutrition/add-food?meal-time=${"lunch"}`} className={styles.mealTime}>
                    Lunch
                </Link>
                <Link href={`/nutrition/add-food?meal-time=${"eveningSnack"}`} className={styles.mealTime}>
                    Evening snack
                </Link>
                <Link href={`/nutrition/add-food?meal-time=${"dinner"}`} className={styles.mealTime}>
                    Dinner
                </Link>
                <div className={styles.mealTime} onClick={closeShowMealSelector}>
                    Cancel
                </div>
            </div>
            </div>
        </div>
    )
}