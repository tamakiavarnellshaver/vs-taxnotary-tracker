# VS TaxNotary Tracker — agent development container
#
# Extended from the course's module_1 Dockerfile (LaunchCodeAgenticEngineer).
# This project is a pure Node.js app (Express API + Vite/React client, SQLite
# via better-sqlite3), so the extension below drops the course's Python
# AI/ML stack (requirements.txt — streamlit, pandas, fastapi, etc.) and the
# ngrok tunnel tool, since neither is needed here and ngrok in particular
# would punch an outbound hole through the network boundary this container
# is meant to enforce. In their place: a current Node.js (22.x, matching the
# project's tooling) and the C/C++ build toolchain better-sqlite3 needs to
# compile its native binding on `npm install`.
#
# The base image stays python:3.12-slim to keep this in the same lineage as
# the course container (and Claude Code / OpenCode install identically
# either way); Python itself is otherwise unused by this project.
FROM python:3.12-slim

WORKDIR /workspace

# Base OS tools (from the course Dockerfile) + build-essential, which the
# course image didn't include but this project needs to compile
# better-sqlite3's native module.
RUN apt-get update && apt-get install -y \
    curl \
    git \
    bash \
    ca-certificates \
    nano \
    procps \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22.x via NodeSource, matching this project's engine expectations
# (better-sqlite3 v11 + Vite 8 want a current Node). Debian bookworm's own
# apt package (nodejs 18.x) is older than what this project's tooling wants.
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# No requirements.txt install here — this project has no Python
# dependencies, so the course's AI/ML Python stack is intentionally skipped.

# Install Claude Code — the coding agent this container is built to run.
RUN npm install -g @anthropic-ai/claude-code

# OpenCode and ngrok from the course image are intentionally omitted:
# OpenCode is an alternate agent this project isn't using, and ngrok exists
# specifically to tunnel outside network traffic in — the opposite of what
# this container's network boundary is for.

# Claude Code configuration: default settings + status line
RUN mkdir -p /root/.claude
COPY settings.json /root/.claude/settings.json
COPY statusline.sh /root/.claude/statusline.sh
RUN chmod +x /root/.claude/statusline.sh

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Shell quality-of-life improvements
RUN echo 'export PS1="taxnotary-agent:\\w# "' >> /root/.bashrc && \
    echo 'alias ll="ls -alF"' >> /root/.bashrc && \
    echo 'alias la="ls -A"' >> /root/.bashrc && \
    echo 'alias l="ls -CF"' >> /root/.bashrc

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["/bin/bash"]
