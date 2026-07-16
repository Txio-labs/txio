//! Exact integer-based formatting for blockchain base-unit amounts.
//!
//! Replaces lossy `as f64` / `parse::<f64>()` conversions when turning wei,
//! lamports, MIST, octas, etc. into human-readable decimals.

/// Format `value` base units as a decimal string with exactly `decimals`
/// fractional digits, trimming trailing zeros.
///
/// Uses only integer division/modulo, so it is exact for the full `u128` range.
/// It is exercised directly by unit tests and is the primary helper required by
/// issue #24; call sites that need a fixed display width use `format_units_fixed`.
#[allow(dead_code)]
pub fn format_units(value: u128, decimals: u32) -> String {
    if decimals == 0 {
        return value.to_string();
    }

    let divisor = 10u128.pow(decimals);
    let whole = value / divisor;
    let frac = value % divisor;

    if frac == 0 {
        return whole.to_string();
    }

    let frac_str = format!("{:0width$}", frac, width = decimals as usize);
    let frac_trimmed = frac_str.trim_end_matches('0');

    format!("{}.{}", whole, frac_trimmed)
}

/// Format `value` base units as a fixed-precision decimal string rounded to
/// `places` fractional digits.
///
/// This preserves the fixed-width style used by several CLI call sites
/// (e.g. "{:.4} ETH") while still avoiding any `f64` conversion.
pub fn format_units_fixed(value: u128, decimals: u32, places: u32) -> String {
    if places == 0 {
        return (value / 10u128.pow(decimals)).to_string();
    }

    if decimals == 0 {
        return format!("{}.{}", value, "0".repeat(places as usize));
    }

    let places = places.min(decimals);
    let divisor = 10u128.pow(decimals);
    let whole = value / divisor;
    let frac = value % divisor;

    let scale = 10u128.pow(decimals - places);
    // Round to nearest, ties rounded up (same as default f64 -> decimal formatting).
    let rounded = (frac + scale / 2) / scale;
    let carry = rounded / 10u128.pow(places);
    let rounded_frac = rounded % 10u128.pow(places);

    let frac_str = format!("{:0width$}", rounded_frac, width = places as usize);
    format!("{}.{}", whole + carry, frac_str)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_units_zero() {
        assert_eq!(format_units(0, 18), "0");
        assert_eq!(format_units(0, 9), "0");
        assert_eq!(format_units(0, 4), "0");
    }

    #[test]
    fn format_units_small_values() {
        assert_eq!(format_units(1, 4), "0.0001");
        assert_eq!(format_units(123, 4), "0.0123");
        assert_eq!(format_units(10_000, 4), "1");
        assert_eq!(format_units(12_340, 4), "1.234");
    }

    #[test]
    fn format_units_exact_boundaries() {
        // 10^decimals exactly.
        assert_eq!(format_units(1_000_000_000_000_000_000u128, 18), "1");
        assert_eq!(format_units(1_000_000_000u128, 9), "1");
        // 10^decimals - 1 (all fractional nines after trimming).
        assert_eq!(
            format_units(999_999_999_999_999_999u128, 18),
            "0.999999999999999999"
        );
        assert_eq!(format_units(999_999_999u128, 9), "0.999999999");
        // 10^decimals + 1.
        assert_eq!(
            format_units(1_000_000_000_000_000_001u128, 18),
            "1.000000000000000001"
        );
        assert_eq!(format_units(1_000_000_001u128, 9), "1.000000001");
    }

    #[test]
    fn format_units_above_f64_exact_range() {
        // 2^53 + 1 wei would be rounded by f64.
        let v = (1u128 << 53) + 1;
        assert_eq!(format_units(v, 18), "0.009007199254740993");

        // A large ETH balance where f64 loses integer precision.
        let v = 12_345_678_901_234_567_890_123_456u128;
        assert_eq!(format_units(v, 18), "12345678.901234567890123456");

        // Maximum reasonable u128 value.
        assert_eq!(
            format_units(u128::MAX, 18),
            "340282366920938463463.374607431768211455"
        );
    }

    #[test]
    fn format_units_fixed_preserves_precision() {
        // ETH-style: 18 decimals, displayed to 4 places.
        assert_eq!(
            format_units_fixed(1_000_000_000_000_000_000u128, 18, 4),
            "1.0000"
        );
        assert_eq!(
            format_units_fixed(1_234_500_000_000_000_000u128, 18, 4),
            "1.2345"
        );
        assert_eq!(
            format_units_fixed(1_234_560_000_000_000_000u128, 18, 4),
            "1.2346"
        );

        // SOL-style: 9 decimals, displayed to 4 places.
        assert_eq!(format_units_fixed(1_000_000_000u128, 9, 4), "1.0000");
        assert_eq!(format_units_fixed(1_234_500_000u128, 9, 4), "1.2345");

        // Sui MIST gas: 9 decimals displayed to 9 places.
        assert_eq!(format_units_fixed(1_000_000_000u128, 9, 9), "1.000000000");
        assert_eq!(format_units_fixed(1u128, 9, 9), "0.000000001");

        // Aptos octas: 8 decimals, displayed to 4 places.
        assert_eq!(format_units_fixed(100_000_000u128, 8, 4), "1.0000");
        assert_eq!(format_units_fixed(123_450_000u128, 8, 4), "1.2345");
    }

    #[test]
    fn format_units_fixed_carry_at_boundary() {
        // 0.99995 rounded to 4 places should carry to 1.0000.
        let v = 999_950_000_000_000_000u128;
        assert_eq!(format_units_fixed(v, 18, 4), "1.0000");
    }
}
