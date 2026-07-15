import AddFood from "@/components/AddFood/AddFood";

export default async function AddFoodToTracker({ searchParams }) {
    const params = await searchParams;

    return (
        <AddFood mealTime={params["meal-time"]} />
    );
}

// import AddFood from "@/components/AddFood/AddFood";

// export default async function AddFoodToTrakcer() {
//     return (
//         <AddFood />
//     )
// }