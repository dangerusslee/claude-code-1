# Build arguments for tool versions (following PR #3342 pattern)
ARG NODE_VERSION=23
ARG PYTHON_VERSION=3.12
ARG AWS_CLI_VERSION=2.15.0
ARG CLAUDE_CODE_VERSION=latest

FROM node:${NODE_VERSION}

ARG TZ
ENV TZ="$TZ"

# Install basic development tools and iptables/ipset
RUN apt update && apt install -y less \
  git \
  procps \
  sudo \
  fzf \
  zsh \
  man-db \
  unzip \
  gnupg2 \
  gh \
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  aggregate \
  jq \
  curl \
  wget \
  build-essential \
  ca-certificates \
  lsb-release \
  # Python dependencies
  python3=${PYTHON_VERSION}* \
  python3-pip \
  python3-venv \
  # Clean package manager cache
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Install Docker CE
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
  apt update && \
  apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin && \
  # Add node user to docker group
  usermod -aG docker node && \
  # Clean package manager cache
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Ensure default node user has access to /usr/local/share
RUN mkdir -p /usr/local/share/npm-global && \
  chown -R node:node /usr/local/share

ARG USERNAME=node

# Persist command history for both bash and zsh
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  && mkdir /commandhistory \
  && touch /commandhistory/.bash_history \
  && touch /commandhistory/.zsh_history \
  && chown -R $USERNAME /commandhistory

# Set `DEVCONTAINER` environment variable to help with orientation
ENV DEVCONTAINER=true

# Create workspace and config directories and set permissions
RUN mkdir -p /workspace /home/node/.claude && \
  chown -R node:node /workspace /home/node/.claude

WORKDIR /workspace

# Install AWS CLI v2 with session-manager-plugin
RUN ARCH=$(dpkg --print-architecture) && \
  # Install git-delta
  wget "https://github.com/dandavison/delta/releases/download/0.18.2/git-delta_0.18.2_${ARCH}.deb" && \
  dpkg -i "git-delta_0.18.2_${ARCH}.deb" && \
  rm "git-delta_0.18.2_${ARCH}.deb" && \
  # Install AWS CLI v2
  if [ "$ARCH" = "amd64" ]; then AWS_ARCH="x86_64"; else AWS_ARCH="aarch64"; fi && \
  curl "https://awscli.amazonaws.com/awscli-exe-linux-${AWS_ARCH}.zip" -o "awscliv2.zip" && \
  unzip awscliv2.zip && \
  ./aws/install && \
  rm -rf aws awscliv2.zip && \
  # Install session-manager-plugin
  if [ "$ARCH" = "amd64" ]; then \
    curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"; \
  else \
    curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_arm64/session-manager-plugin.deb" -o "session-manager-plugin.deb"; \
  fi && \
  dpkg -i session-manager-plugin.deb && \
  rm session-manager-plugin.deb

# Set up non-root user
USER node

# Install global packages
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin

# Set the default shell to zsh rather than sh
ENV SHELL=/bin/zsh

# Install Oh My Zsh with agnoster theme and specified plugins
RUN sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" && \
  # Install zsh-autosuggestions plugin
  git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions && \
  # Configure zsh with agnoster theme and plugins
  sed -i 's/ZSH_THEME="robbyrussell"/ZSH_THEME="agnoster"/' ~/.zshrc && \
  sed -i 's/plugins=(git)/plugins=(zsh-autosuggestions git aws docker nvm)/' ~/.zshrc && \
  # Add fzf key bindings and completion
  echo "source /usr/share/doc/fzf/examples/key-bindings.zsh" >> ~/.zshrc && \
  echo "source /usr/share/doc/fzf/examples/completion.zsh" >> ~/.zshrc && \
  # Persist command history
  echo "export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" >> ~/.zshrc && \
  # Set up zsh history for better experience
  echo "export HISTFILE=/commandhistory/.zsh_history" >> ~/.zshrc && \
  echo "export HISTSIZE=10000" >> ~/.zshrc && \
  echo "export SAVEHIST=10000" >> ~/.zshrc && \
  echo "setopt SHARE_HISTORY" >> ~/.zshrc && \
  echo "setopt HIST_VERIFY" >> ~/.zshrc && \
  # Fix locale for Unicode characters (agnoster theme compatibility)
  echo "export LC_ALL=C.UTF-8" >> ~/.zshrc && \
  echo "export LANG=C.UTF-8" >> ~/.zshrc

# Install Claude Code CLI using build argument for version flexibility
RUN if [ "$CLAUDE_CODE_VERSION" = "latest" ]; then \
    npm install -g @anthropic-ai/claude-code; \
  else \
    npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}; \
  fi

# Install Claude Flow globally first, then initialize
RUN npm install -g claude-flow@alpha

# Initialize Claude Flow with enhanced MCP setup (auto-configures permissions!)
RUN npx claude-flow@alpha init --force

# Copy firewall script
COPY init-firewall.sh /usr/local/bin/
USER root
RUN chmod +x /usr/local/bin/init-firewall.sh && \
  echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/node-firewall && \
  chmod 0440 /etc/sudoers.d/node-firewall
USER node
