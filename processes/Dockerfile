FROM rust:bullseye as builder

WORKDIR /usr/src/app

COPY . .

RUN rustup target add x86_64-unknown-linux-musl
RUN cargo build --release --target x86_64-unknown-linux-musl

FROM rust:bullseye

RUN mkdir -p /shared/bin/processes

COPY --from=builder /usr/src/app/target/x86_64-unknown-linux-musl/release/argparse /shared/bin/processes/argparse

RUN chmod +x /shared/bin/processes/argparse

ENTRYPOINT ["/shared/bin/processes/argparse"]