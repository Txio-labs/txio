pub fn generate_otp(len: usize) -> String {
    (0..len)
        .map(|_| rand::random_range(0..10).to_string())
        .collect()
}
