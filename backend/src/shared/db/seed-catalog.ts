import 'dotenv/config';
import crypto from 'node:crypto';
import { getPool, closePool, sql } from '@infrastructure/config/mssql.config.js';

interface SeedCategoryRow {
    id: string;
    name: string;
    product_count?: number;
}

interface SeedVariantDefinition {
    sku: string;
    attributes: Record<string, string>;
    price: number;
    stockPhysical: number;
}

interface SeedProductDefinition {
    categoryName: string;
    name: string;
    description: string;
    mainImageUrl: string;
    variants: SeedVariantDefinition[];
}

const INITIAL_CATEGORIES: Array<{ name: string; description: string }> = [
    {
        name: 'Computers & Laptop',
        description: 'Workstations, laptops profesionales y equipos All-in-One de alto rendimiento',
    },
    {
        name: 'Smartphones & Tablets',
        description: 'Teléfonos inteligentes 5G, tablets Pro y dispositivos móviles de última generación',
    },
    {
        name: 'Smartwatches',
        description: 'Relojes inteligentes con GPS, monitoreo biométrico y resistencia deportiva',
    },
    {
        name: 'Audio & Headphones',
        description: 'Audífonos inalámbricos Hi-Fi con cancelación activa de ruido y equipos de estudio',
    },
    {
        name: 'Gaming Gadgets',
        description: 'Consolas de nueva generación, controles hápticos y accesorios competitivos',
    },
    {
        name: 'Mouse & Keyboard',
        description: 'Teclados mecánicos inalámbricos y ratones ergonómicos de precisión óptica',
    },
];

const INITIAL_PRODUCTS: SeedProductDefinition[] = [
    {
        categoryName: 'Smartphones & Tablets',
        name: 'Samsung Galaxy S22 Ultra 8K Camera & Video, Brightest Display Screen, S Pen Pro',
        description: [
            '8K SUPER STEADY VIDEO: Shoot videos that rival how epic your life is with stunning 8K recording.',
            'NIGHTOGRAPHY + PORTRAIT MODE: Capture crystal-clear night photos and studio-grade portraits.',
            '108MP PHOTO RESOLUTION + BRIGHT DISPLAY: Dynamic AMOLED 2X with Vision Booster at 1750 nits.',
            'ADAPTIVE COLOR CONTRAST: Automatic outdoor contrast optimization and 120Hz refresh rate.',
            'BUILT-IN S PEN PRO: Integrated low-latency stylus for precision notes, sketches and remote control.',
        ].join('\n'),
        mainImageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=900&q=80',
        variants: [
            {
                sku: 'SGS22U-PK-512',
                attributes: { Color: 'Pink Gold', Style: 'S22 Ultra', Size: '512GB' },
                price: 2899.00,
                stockPhysical: 14,
            },
            {
                sku: 'SGS22U-BK-256',
                attributes: { Color: 'Phantom Black', Style: 'S22 Ultra', Size: '256GB' },
                price: 2650.00,
                stockPhysical: 20,
            },
            {
                sku: 'SGS22-WH-128',
                attributes: { Color: 'Phantom White', Style: 'S22', Size: '128GB' },
                price: 2299.00,
                stockPhysical: 18,
            },
            {
                sku: 'SGS22U-GR-1TB',
                attributes: { Color: 'Burgundy Green', Style: 'S22 Ultra', Size: '1TB' },
                price: 3199.00,
                stockPhysical: 8,
            },
        ],
    },
    {
        categoryName: 'Computers & Laptop',
        name: 'Dell Optiplex 9020 Small Form Business Desktop',
        description: [
            'INTEL QUAD-CORE PROCESSOR: Engineered for enterprise multitasking and continuous office workloads.',
            'COMPACT SMALL FORM CHASSIS: Fits seamlessly on executive desks with tool-less serviceability.',
            'DUAL DISPLAYPORT CONNECTIVITY: Native multi-monitor support for financial and operations teams.',
            'HIGH-SPEED NVME STORAGE: Instant boot times and encrypted business data protection.',
        ].join('\n'),
        mainImageUrl: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=900&q=80',
        variants: [
            {
                sku: 'DELL-9020-16-512',
                attributes: { Color: 'Matte Black', Style: 'Core i7 SFF', Size: '512GB' },
                price: 1790.00,
                stockPhysical: 15,
            },
            {
                sku: 'DELL-9020-32-1TB',
                attributes: { Color: 'Matte Black', Style: 'Core i7 Pro', Size: '1TB' },
                price: 2150.00,
                stockPhysical: 9,
            },
        ],
    },
    {
        categoryName: 'Computers & Laptop',
        name: 'HP 24 All-in-One PC, Intel Core i3-1115G4, 8GB RAM',
        description: [
            'THREE-SIDED MICRO-EDGE DISPLAY: 23.8-inch Full HD IPS anti-glare panel with vibrant sRGB coverage.',
            'POP-UP PRIVACY CAMERA: Integrated HD webcam and dual array microphones that tuck away safely.',
            'INTEL CORE 11TH GEN: Smooth productivity, video conferencing and cloud workspace responsiveness.',
            'ALL-IN-ONE MINIMALISM: Includes wireless keyboard and optical mouse in matching snow white.',
        ].join('\n'),
        mainImageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80',
        variants: [
            {
                sku: 'HP24-AIO-WH-256',
                attributes: { Color: 'Snow White', Style: 'Core i3 FHD', Size: '256GB' },
                price: 1850.00,
                stockPhysical: 12,
            },
            {
                sku: 'HP24-AIO-SL-512',
                attributes: { Color: 'Natural Silver', Style: 'Core i5 FHD', Size: '512GB' },
                price: 2290.00,
                stockPhysical: 10,
            },
        ],
    },
    {
        categoryName: 'Computers & Laptop',
        name: 'Gateway 23.8" All-in-one Desktop, Fully Adjustable Stand',
        description: [
            'ERGONOMIC ARTICULATING STAND: Tilt, swivel and height adjustment for studio comfort.',
            'FULL HD BORDERLESS SCREEN: Crisp 1920x1080 resolution with wide 178-degree viewing angles.',
            'TUNED BY THX AUDIO: Rich stereo speakers engineered for media creation and streaming.',
            'COMPLETE CONNECTIVITY: USB-C 3.2, HDMI-out, Gigabit Ethernet and dual-band Wi-Fi 6.',
        ].join('\n'),
        mainImageUrl: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=900&q=80',
        variants: [
            {
                sku: 'GTW-24-SL-256',
                attributes: { Color: 'Metallic Silver', Style: 'Standard Stand', Size: '256GB' },
                price: 1920.00,
                stockPhysical: 11,
            },
            {
                sku: 'GTW-24-BK-512',
                attributes: { Color: 'Graphite Black', Style: 'Pro Stand', Size: '512GB' },
                price: 2180.00,
                stockPhysical: 7,
            },
        ],
    },
    {
        categoryName: 'Smartwatches',
        name: 'Apple Watch Series 9 GPS 45mm Aluminum Case with Sport Band',
        description: [
            'S9 SIP DUAL-CORE PROCESSOR: Magical double-tap gesture and on-device Siri health queries.',
            '2000-NIT ALWAYS-ON RETINA DISPLAY: Twice as bright in direct sunlight and dims to 1 nit indoors.',
            'ADVANCED HEALTH SENSORS: Blood oxygen, ECG, temperature sensing and sleep stage tracking.',
            'CARBON NEUTRAL DESIGN: Swimproof 50m water resistance and crack-resistant front crystal.',
        ].join('\n'),
        mainImageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80',
        variants: [
            {
                sku: 'AWS9-MID-45',
                attributes: { Color: 'Midnight', Style: 'GPS', Size: '45mm' },
                price: 1450.00,
                stockPhysical: 22,
            },
            {
                sku: 'AWS9-STL-41',
                attributes: { Color: 'Starlight', Style: 'GPS', Size: '41mm' },
                price: 1320.00,
                stockPhysical: 16,
            },
            {
                sku: 'AWS9-PNK-45-CEL',
                attributes: { Color: 'Pink Gold', Style: 'GPS + Cellular', Size: '45mm' },
                price: 1690.00,
                stockPhysical: 9,
            },
        ],
    },
    {
        categoryName: 'Audio & Headphones',
        name: 'Bang & Olufsen Beoplay H95 Adaptive ANC Wireless Headphones',
        description: [
            'CUSTOM TITANIUM DRIVERS: 40mm neodymium drivers tuned by Bang & Olufsen acoustic engineers.',
            'ADAPTIVE ACTIVE NOISE CANCELLATION: Precision aluminum dial on earcup for seamless ANC control.',
            '38 HOURS BATTERY LIFE: Extended wireless listening with aptX Adaptive and Bluetooth 5.1.',
            'CRAFTED LAMBSKIN & MEMORY FOAM: Foldable luxury travel design with hard aluminum carrying case.',
        ].join('\n'),
        mainImageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
        variants: [
            {
                sku: 'BO-H95-GOLD',
                attributes: { Color: 'Gold Tone', Style: 'H95 Master', Size: 'One Size' },
                price: 2450.00,
                stockPhysical: 10,
            },
            {
                sku: 'BO-H95-BLACK',
                attributes: { Color: 'Anthracite Black', Style: 'H95 Studio', Size: 'One Size' },
                price: 2390.00,
                stockPhysical: 14,
            },
        ],
    },
    {
        categoryName: 'Computers & Laptop',
        name: 'MacBook Pro 16" M3 Max Liquid Retina XDR Workstation',
        description: [
            'APPLE M3 MAX CHIP: 16-core CPU and 40-core GPU with hardware-accelerated ray tracing.',
            'LIQUID RETINA XDR DISPLAY: Extreme Dynamic Range with 1000 nits sustained brightness and ProMotion.',
            '22-HOUR BATTERY LIFE: Unmatched unplugged performance for 3D rendering, AI and code compilation.',
            'STUDIO CONNECTIVITY: Three Thunderbolt 4 ports, HDMI 2.1, SDXC card slot and MagSafe 3.',
        ].join('\n'),
        mainImageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80',
        variants: [
            {
                sku: 'MBP16-M3M-SB-1TB',
                attributes: { Color: 'Space Black', Style: 'M3 Max 36GB', Size: '1TB' },
                price: 4890.00,
                stockPhysical: 6,
            },
            {
                sku: 'MBP16-M3P-SL-512',
                attributes: { Color: 'Silver', Style: 'M3 Pro 18GB', Size: '512GB' },
                price: 3950.00,
                stockPhysical: 11,
            },
        ],
    },
    {
        categoryName: 'Gaming Gadgets',
        name: 'Sony PlayStation 5 Pro DualSense Wireless Console Bundle',
        description: [
            '4K 120HZ RAY TRACING: Custom RDNA architecture delivering ultra-sharp 4K gaming at up to 120 fps.',
            'ULTRA-HIGH SPEED 2TB SSD: Near-instant loading and seamless world streaming.',
            'HAPTIC FEEDBACK & ADAPTIVE TRIGGERS: DualSense controller lets you feel every action and tension.',
            'TEMPEST 3D AUDIOTECH: Immersive spatial soundscapes across headphones and TV speakers.',
        ].join('\n'),
        mainImageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80',
        variants: [
            {
                sku: 'PS5-PRO-2TB-WH',
                attributes: { Color: 'Glacier White', Style: 'PS5 Pro Digital', Size: '2TB' },
                price: 2750.00,
                stockPhysical: 13,
            },
            {
                sku: 'PS5-PRO-2TB-BK',
                attributes: { Color: 'Midnight Black', Style: 'PS5 Pro Disc Bundle', Size: '2TB' },
                price: 2990.00,
                stockPhysical: 8,
            },
        ],
    },
    {
        categoryName: 'Mouse & Keyboard',
        name: 'Keychron Q1 Pro Wireless Custom Mechanical Keyboard QMK/VIA',
        description: [
            'CNC MACHINED ALUMINUM BODY: 6063 aircraft-grade anodized aluminum frame with double-gasket mount.',
            'QMK & VIA PROGRAMMABLE: Remap any key, create macros and customize RGB lighting in real time.',
            'HOT-SWAPPABLE PCB: Supports 3-pin and 5-pin mechanical switches without soldering.',
            'DUAL WIRELESS & TYPE-C: Connect up to 3 devices via Bluetooth 5.1 or 1000Hz wired USB-C.',
        ].join('\n'),
        mainImageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80',
        variants: [
            {
                sku: 'KEY-Q1P-CB-RED',
                attributes: { Color: 'Carbon Black', Style: 'Linear Red Switch', Size: '75% Layout' },
                price: 890.00,
                stockPhysical: 19,
            },
            {
                sku: 'KEY-Q1P-WH-BRN',
                attributes: { Color: 'Shell White', Style: 'Tactile Brown Switch', Size: '75% Layout' },
                price: 920.00,
                stockPhysical: 15,
            },
        ],
    },
];

async function seedCatalog(): Promise<void> {
    const pool = await getPool();
    try {
        console.log('Verificando catálogo inicial mediante SP_Categorias_Listar...');

        const existingCategoriesResult = await pool
            .request()
            .input('p_only_active', sql.Bit, 0)
            .execute<SeedCategoryRow>('SP_Categorias_Listar');

        const existingCategories = existingCategoriesResult.recordset ?? [];
        const totalExistingProducts = existingCategories.reduce(
            (acc, cat) => acc + Number(cat.product_count ?? 0),
            0
        );

        if (existingCategories.length > 0 && totalExistingProducts > 0) {
            console.log(
                `El catálogo ya cuenta con ${existingCategories.length} categorías y ${totalExistingProducts} productos activos. Se omite inserción duplicada.`
            );
            return;
        }

        const categoryMap = new Map<string, string>();
        for (const cat of existingCategories) {
            categoryMap.set(cat.name.toLowerCase(), cat.id);
        }

        for (const categoryDef of INITIAL_CATEGORIES) {
            const existingId = categoryMap.get(categoryDef.name.toLowerCase());
            if (existingId) continue;

            const newCategoryId = crypto.randomUUID();
            const createdCat = await pool
                .request()
                .input('p_id', sql.VarChar(36), newCategoryId)
                .input('p_name', sql.VarChar(100), categoryDef.name)
                .input('p_description', sql.VarChar(255), categoryDef.description)
                .execute<SeedCategoryRow>('SP_Categorias_Crear');

            const row = createdCat.recordset?.[0];
            categoryMap.set(categoryDef.name.toLowerCase(), row?.id ?? newCategoryId);
            console.log(`Categoría creada: ${categoryDef.name}`);
        }

        let createdProductsCount = 0;
        let createdVariantsCount = 0;

        for (const productDef of INITIAL_PRODUCTS) {
            const categoryId = categoryMap.get(productDef.categoryName.toLowerCase());
            if (!categoryId) continue;

            const productId = crypto.randomUUID();
            await pool
                .request()
                .input('p_id', sql.VarChar(36), productId)
                .input('p_category_id', sql.VarChar(36), categoryId)
                .input('p_name', sql.VarChar(200), productDef.name)
                .input('p_description', sql.NVarChar(sql.MAX), productDef.description)
                .input('p_main_image_url', sql.VarChar(500), productDef.mainImageUrl)
                .input('p_user_id', sql.VarChar(36), null)
                .execute('SP_Productos_CrearProducto');

            createdProductsCount += 1;

            for (const variantDef of productDef.variants) {
                const variantId = crypto.randomUUID();
                await pool
                    .request()
                    .input('p_id', sql.VarChar(36), variantId)
                    .input('p_product_id', sql.VarChar(36), productId)
                    .input('p_sku', sql.VarChar(60), variantDef.sku)
                    .input(
                        'p_attributes',
                        sql.NVarChar(sql.MAX),
                        JSON.stringify(variantDef.attributes)
                    )
                    .input('p_price', sql.Decimal(12, 2), variantDef.price)
                    .input('p_stock_physical', sql.Int, variantDef.stockPhysical)
                    .input('p_user_id', sql.VarChar(36), null)
                    .execute('SP_Productos_CrearVariante');

                createdVariantsCount += 1;
            }
        }

        console.log(
            `Catálogo inicial sembrado exitosamente: ${createdProductsCount} productos y ${createdVariantsCount} variantes con Kardex inicial.`
        );
    } finally {
        await closePool();
    }
}

seedCatalog().catch((error: unknown) => {
    console.error('Error al ejecutar el seed de catálogo:', error);
    process.exitCode = 1;
});
