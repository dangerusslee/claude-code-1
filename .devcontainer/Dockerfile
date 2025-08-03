# Build arguments for tool versions
ARG NODE_VERSION=23
ARG PYTHON_VERSION=3.12
ARG AWS_CLI_VERSION=2.15.0
ARG CLAUDE_CODE_VERSION=latest

FROM node:${NODE_VERSION}

ARG TZ
ENV TZ="$TZ"

# Install basic development tools and system utilities
RUN apt update && apt install -y \
  less \
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

# Install AWS CLI v2 with session-manager-plugin and git-delta
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

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | sh && \
  mv /root/.deno /usr/local/deno && \
  ln -s /usr/local/deno/bin/deno /usr/local/bin/deno

# Set up non-root user
USER node

# Install global packages
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin:/usr/local/deno/bin:/home/node/.local/bin

# Set the default shell to zsh
ENV SHELL=/bin/zsh

# Install Oh My Zsh with agnoster theme and plugins
RUN RUNZSH=no sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" && \
  # Install zsh-autosuggestions plugin
  git clone --depth=1 https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions && \
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

# Install Claude Code CLI
RUN if [ "$CLAUDE_CODE_VERSION" = "latest" ]; then \
    npm install -g @anthropic-ai/claude-code; \
  else \
    npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}; \
  fi

# Switch to root for browser installation
USER root

# Install useful Python packages and web scraping dependencies
RUN pip install --break-system-packages \
  requests \
  beautifulsoup4 \
  selenium \
  undetected-chromedriver \
  webdriver-manager \
  markitdown

# Install browser and playwright
RUN npm install -g playwright && \
  npx playwright install --with-deps

# Install Chrome browser and Chromium with all dependencies
RUN apt-get update && \
  apt-get install -y \
    chromium \
    chromium-driver \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xdg-utils && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Install Google Chrome stable for amd64, or use Chromium for other architectures
RUN ARCH=$(dpkg --print-architecture) && \
  if [ "$ARCH" = "amd64" ]; then \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*; \
  fi

# Create writable directories for Chrome/Chromium and set permissions
RUN mkdir -p /tmp/chrome-user-data /tmp/chromedriver && \
  chmod 777 /tmp/chrome-user-data /tmp/chromedriver && \
  # Copy chromedriver to writable location for undetected-chromedriver patching
  if [ -f /usr/bin/chromedriver ]; then \
    cp /usr/bin/chromedriver /tmp/chromedriver/chromedriver && \
    chmod 755 /tmp/chromedriver/chromedriver; \
  fi

# Copy firewall script and set permissions
COPY .devcontainer/init-firewall.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/init-firewall.sh && \
  echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/node-firewall && \
  chmod 0440 /etc/sudoers.d/node-firewall

# Copy and install MCP servers globally
COPY mcp-servers /tmp/mcp-servers

# Install MCP servers globally with error handling
RUN set -e && \
  # Install Selenium MCP server globally (Node.js)
  if [ -d "/tmp/mcp-servers/selenium-mcp" ]; then \
    cd /tmp/mcp-servers/selenium-mcp && \
    npm install && \
    npm install -g . || echo "Warning: Selenium MCP installation failed"; \
  fi && \
  # Install Undetected Chrome MCP server globally (Python)
  if [ -d "/tmp/mcp-servers/undetected-chrome-mcp" ]; then \
    cd /tmp/mcp-servers/undetected-chrome-mcp && \
    cp -r . /usr/local/lib/undetected-chrome-mcp && \
    ln -sf /usr/local/lib/undetected-chrome-mcp/src/server.py /usr/local/bin/undetected-chrome-mcp && \
    chmod +x /usr/local/bin/undetected-chrome-mcp /usr/local/lib/undetected-chrome-mcp/src/server.py || echo "Warning: Undetected Chrome MCP installation failed"; \
  fi && \
  # Install AutoTrader MCP server globally (Node.js)
  if [ -d "/tmp/mcp-servers/autotrader-mcp-server" ]; then \
    cd /tmp/mcp-servers/autotrader-mcp-server && \
    npm install && \
    npm install -g . || echo "Warning: AutoTrader MCP installation failed"; \
  fi

# Clean up temporary files
RUN rm -rf /tmp/mcp-servers

# Switch back to node user
USER node