'use client';
import { useEffect, useState } from 'react';
import styles from './AddFood.module.css';
import Link from "next/link"
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function AddFood({ mealTime }) {
    const { user } = useAuth();
    const [userId, setUserId] = useState();
    const [searchText, setSearchText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [matchedFoods, setMatchedFoods] = useState([]);

    const { showToast } = useToast();

    const handleSearch = (e) => {
        setSearchText(e.target.value);
    }

    const handleSearchSubmit = async (e) => {
        try {
            e.preventDefault();

            setIsLoading(true);
            setError("");

            console.log(searchText);

            const response = await fetch(`/api/nutrition/search-food?name=${searchText}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Something went wrong");
            }

            const data = await response.json();

            const { matchedFoods } = data;

            setMatchedFoods(matchedFoods);
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    const handleAddToTracker = async (foodItem) => {
        try {
            const res = await fetch('/api/food-tracker', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(foodItem)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Something went wrong");
            }

            const data = await res.json();

            const { success, message } = data;

            if (success) {
                showToast(message);
            }

        } catch (error) {
            console.error(error || error.message);
            showToast(error.message || "Something went wrong.", "error");
        }
    }

    useEffect(() => {
        setUserId(user?.userId);
    }, [user]);

    return (
        <div className={styles.addFoodSec}>
            <Link className={styles.mealType} href={'/nutrition'}>&#8592; Add to breakfast</Link>
            <div className={styles.searchResultBlock}>
                <div className={styles.searchBlock}>
                    <form onSubmit={(e) => handleSearchSubmit(e)}>
                        <input type='text' value={searchText} onChange={(e) => handleSearch(e)} placeholder='Type here to search' />
                        <button type='submit'>search</button>
                    </form>
                </div>
                <div className={styles.searchResult}>
                    {
                        matchedFoods.map(food => {
                            const { id, food: foodName, servingLabel, calories } = food;
                            const body = {
                                userId,
                                nutritionId: id,
                                quantity: 2,
                                mealTime
                            }
                            return (
                                <div className={styles.searchResultItem} key={id}>
                                    <div className={styles.foodItem}>
                                        <p className={styles.foodName}>{foodName}</p>
                                        <p>{servingLabel}</p>
                                    </div>
                                    <div className={styles.nutrition}>
                                        <button onClick={() => handleAddToTracker(body)}>Add</button>
                                        <p className={styles.calories}>{calories} kcal</p>
                                    </div>
                                </div>
                            )
                        })
                    }
                </div>
            </div>
        </div>
    )
}