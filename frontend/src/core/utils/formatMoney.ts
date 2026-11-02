/**
 * Formats a numeric value as a currency string (defaults to Guatemalan Quetzales 'GTQ').
 * @param amount - The numeric value to format
 * @param currency - ISO 4217 currency code (default: 'GTQ')
 * @param locale - BCP 47 locale string (default: 'es-GT')
 */
export const formatMoney = (
    amount: number,
    currency = 'GTQ',
    locale = 'es-GT',
): string => {
    if (currency === 'GTQ') {
        const formattedNumber = new Intl.NumberFormat('es-GT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
        return `Q ${formattedNumber}`;
    }

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

/**
 * Formats a numeric value as a compact currency string (e.g. Q 1.2K, Q 3.4M).
 */
export const formatMoneyCompact = (
    amount: number,
    currency = 'GTQ',
    locale = 'es-GT',
): string => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(amount);
};
