import BigNumber from 'bignumber.js';

export enum CurrencySymbols {
    USD = '$',
    EUR = '€',
}

export type Currency = keyof typeof CurrencySymbols;

/**
 * The locale to be used when localizing the price.
 */
let locale: string | string[] | undefined;

/**
 * Function to set the price locale to be used when localizing the price.
 * Note: when locale is not set the default host locale will be used instead.
 * @param priceLocale - a price locale argument.
 */
export function setPriceLocale(priceLocale: string | string[] | undefined) {
    locale = priceLocale;
}

/**
 * Function to present cents in {@link BigInt} representation as an amount `string`
 * for the specified currency.
 * @param cents - a given amount of cents to present.
 * @param currency - a currency the cents to be present for.
 * @param decimalsToDisplay - an amount of decimals in price string to display.
 */
function centsToAmountString(cents: bigint, currency: Currency, decimalsToDisplay: number): string {
    // Get a multiplier to be used when working with decimals.
    const decimalsMultiplier = 10 ** decimalsToDisplay;

    // Present the integer part of the cents amount as an absolute value
    const integerAsAbsolute = (cents < BigInt(0) ? -cents : cents) / BigInt(decimalsMultiplier);

    // Localize a string for the integer part of the amount

    // Format the integer part of the cents amount as a localized string
    // Note: Hermes JS doesn't format BigInt numbers with "Intl.NumberFormat",
    // consider using "toLocaleString" which has another implementation
    // with might call Intl.NumberFormat internally if API is supported
    // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString
    const absoluteIntegerPart = integerAsAbsolute.toLocaleString(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    // Find the decimals value of the cents amount
    const decimalsValue = (cents < BigInt(0) ? -cents : cents) % BigInt(decimalsMultiplier);

    // Localize a string for the decimals part of the amount

    // Get the decimals template string (e.g. "0,000000000"),
    // and then remove the leading zero (e.g. ",000000000" should remain)
    const decimalsTemplate = Number(0)
        .toLocaleString(locale, {
            minimumFractionDigits: decimalsToDisplay,
            maximumFractionDigits: decimalsToDisplay,
        })
        .slice(1);

    // Get the localized zero value
    const localizedZero = Number(0).toLocaleString(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    // Format the decimals part by replacing all the zeros with the decimals value
    // Note: it looks like decimals do not have separators in any locale (TODO: ensure it is so!)
    // and this allows us doing the following >>>
    let decimalsPart = '';
    if (decimalsTemplate.length > 0) {
        // Note: Hermes JS doesn't format BigInt numbers with "Intl.NumberFormat",
        // consider using "toLocaleString" which has another implementation
        // with might call Intl.NumberFormat internally if API is supported
        // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString
        const localizedDecimals = decimalsValue.toLocaleString(locale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
            useGrouping: false,
        });
        decimalsPart = decimalsTemplate.replace(
            new RegExp(`${localizedZero}+`),
            localizedZero.repeat(decimalsToDisplay - localizedDecimals.length) + localizedDecimals,
        );
    }

    // Join the both parts to get the localized absolute cents amount
    const absoluteAmount = `${absoluteIntegerPart}${decimalsPart}`;

    // Localize the amount with the currency using a template with a zero value
    const zeroTemplate = (cents < BigInt(0) ? Number(-0) : Number(0)).toLocaleString(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0, // need to add as per: https://stackoverflow.com/a/41045289
        maximumFractionDigits: 0,
    }); // e.g. `$0` or `-$0'
    const amount = zeroTemplate.replace(localizedZero, absoluteAmount);

    // Return the resulted localized amount string
    return amount;
}

/**
 * Function to present a price in {@link BigNumber} representation as a `string`
 * for the specified currency.
 * @param price - a given price to present.
 * @param currency - a currency the price to be present for.
 * @param decimalsToDisplay - an optional amount of decimals in price to display, "2" by default.
 */
export function priceToString(
    price: BigNumber,
    currency: Currency,
    decimalsToDisplay: number = 2,
): string {
    // Get a multiplier to be used when working with decimals.
    const decimalsMultiplier = 10 ** decimalsToDisplay;

    // Convert the price to cents by multiplying it to the amount of decimals in price to display
    // and by casting the result to the integer value and then converting it to the BigInt value.
    let cents = BigInt(
        price
            .times(new BigNumber(decimalsMultiplier))
            .integerValue() // TODO: think of a proper rounding when casting to integer value
            .toFixed(),
    );

    // If the price doesn't equal to zero, check if the amount of cents equals to zero,
    // i.e. it has some value but not a full cent.
    // If it has not a full cent, then think of the amount of cents as `1` in order to be able
    // localizing it properly and then inserting a `<` sign to it (i.e. `<$0.01`)
    // Also note that if the price has not a full cent, but at the same time is negative,
    // it should be displayed with the `<` sign without the `minus` as per the design.
    const hasNotAFullCent = !price.eq(new BigNumber(0)) && cents === BigInt(0);
    if (hasNotAFullCent) {
        cents = BigInt(1);
    }

    // Localize the amount of cents with the given currency
    let stringifiedPrice = centsToAmountString(cents, currency, decimalsToDisplay);

    // Insert `<` sign in case the price has not a full cent
    if (hasNotAFullCent) {
        stringifiedPrice = `<${stringifiedPrice}`;
    }

    // Replace the regular `-` with the `U+2212` symbol for better presentation
    stringifiedPrice = stringifiedPrice.replace('-', '−');

    // Return a stringified price
    return stringifiedPrice;
}

/**
 * Function to present a price change in {@link BigNumber} representation as a `string`
 * for the specified currency.
 * @param priceChange - a given price change to present.
 * @param currency - a currency the price to be present for.
 * @param decimalsToDisplay - an optional amount of decimals in price to display, "2" by default.
 */
export function priceChangeToString(
    priceChange: BigNumber,
    currency: Currency,
    decimalsToDisplay: number = 2,
): string {
    // Get the stringified price change
    let stringifiedPriceChange = priceToString(priceChange, currency, decimalsToDisplay);

    // Append the `plus` sign if the price change is positive and
    // the stringified price change does not have `<` sign added by `priceToChange` function
    // Note: there is no need to add the `minus` sign manually here,
    // since it's going to be already added by `priceToChange` function
    if (priceChange.comparedTo(new BigNumber(0)) > 0 && !stringifiedPriceChange.startsWith('<')) {
        stringifiedPriceChange = `+${stringifiedPriceChange}`;
    }

    // Return a stringified price change
    return stringifiedPriceChange;
}
