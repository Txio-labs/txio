pub fn generate_otp(len: usize) -> String {
    use rand::{distributions::Uniform, Rng};
    let mut rng = rand::thread_rng();
    let die = Uniform::from(0..10);

    (0..len)
        .map(|_| rng.sample(die).to_string())
        .collect()
}
