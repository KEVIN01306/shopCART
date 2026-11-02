import 'dotenv/config';
import app from "./app.js";
import { deployStoredProcedures } from "./shared/db/deploy-sp.js";

const PORT = process.env.PORT || 3000;

const startserver = async () => {
    try {
        try {
            await deployStoredProcedures(false);
        } catch (dbInitError) {
            console.warn(
                "Advertencia al sincronizar Stored Procedures en el arranque:",
                dbInitError instanceof Error ? dbInitError.message : dbInitError
            );
        }

        app.listen(PORT, () => {
            console.log(`Server is running on port http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Error starting server:", error);
    }
};

startserver();
