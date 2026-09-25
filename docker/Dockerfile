# Agent development environment for the VS TaxNotary Tracker.
#
# Holds only the runtime and tools the agent needs (Node, npm, git, and a
# native-module build toolchain for better-sqlite3). The project code is
# never baked in — it's bind-mounted at runtime (see docker-compose.yml)
# so the agent always works against the real, current repo.
FROM node:22-bookworm-slim

# python3 + build-essential compile better-sqlite3's native binding on
# `npm install`. This is the one non-obvious dependency this stack has.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        python3 \
        make \
        g++ \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user. The agent only ever needs to read/write files under
# /workspace — dropping root limits the blast radius of a bad
# `npm install` postinstall script or any other compromised dependency.
# node:22-bookworm-slim already ships a "node" user at UID 1000, so we
# reuse that account instead of colliding on --uid 1000.
RUN usermod --login agent --home /home/agent --move-home node \
    && groupmod --new-name agent node
USER agent
WORKDIR /workspace

# Never bake secrets, tokens, or SSH keys into the image. This project
# has none today, but the habit matters: git identity and any future
# credentials are supplied at container-start time via env vars / a
# read-only mount, not baked into a layer.
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    CI=true

CMD ["bash"]
